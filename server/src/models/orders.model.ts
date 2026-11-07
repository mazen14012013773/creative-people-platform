import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { getClient, query } from '../config/db';
import { AppError } from '../utils/app-error';
import { emitRealtimeEvent } from '../services/realtime.service';
import { isValidDeliveryLink } from '../utils/delivery-link';
import { ORDER_DELIVERY_EXTENSIONS, ORDER_DELIVERY_EXTENSIONS_LABEL } from '../config/upload-rules';
import { matchesFileSignature } from '../utils/file-signature';
import { uploadPrivateFile, downloadPrivateFile, deleteCloudFile } from '../services/storage.service';
import { scanText } from '../utils/moderation';

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'REVISION_REQUESTED' | 'AWAITING_REVIEW' | 'COMPLETED' | 'CANCELLED';
export const REVISION_LIMIT = 3;
interface OrderRow {
  id:string; service_id:string; service_title:string; buyer_id:string; freelancer_id:string; price_amount:number|string;
  status:OrderStatus; delivery_version:number|string; revision_notes:string|null; revisions_used:number|string;
  created_at:string; updated_at:string; due_at:string; buyer_name:string; freelancer_name:string;
}
export interface OrderFileInput { file: Express.Multer.File; }
export interface OrderMessage { id:string; orderId:string; senderId:string; senderName:string; content:string; createdAt:string; }
const mapOrder = (r:OrderRow) => { const used=Number(r.revisions_used??0); return {
  id:r.id,serviceId:r.service_id,serviceTitle:r.service_title,buyerId:r.buyer_id,buyerName:r.buyer_name,
  freelancerId:r.freelancer_id,freelancerName:r.freelancer_name,status:r.status,priceAmount:Number(r.price_amount??0),
  deliveryVersion:Number(r.delivery_version),revisionNotes:r.revision_notes,revisionsUsed:used,revisionLimit:REVISION_LIMIT,
  revisionsRemaining:Math.max(0,REVISION_LIMIT-used),createdAt:r.created_at,updatedAt:r.updated_at,dueAt:r.due_at,
};};
const orderSelect=`SELECT o.*,b.name AS buyer_name,f.name AS freelancer_name,
 (SELECT COUNT(*) FROM order_events e WHERE e.order_id=o.id AND e.event_type='REVISION_REQUESTED') AS revisions_used
 FROM orders o JOIN users b ON b.id=o.buyer_id JOIN users f ON f.id=o.freelancer_id`;
const findOrderRow=async(id:string, client?:any):Promise<OrderRow|undefined>=>{
 const result=client?await client.query(`${orderSelect} WHERE o.id=$1`,[id]):await query(`${orderSelect} WHERE o.id=$1`,[id]);
 return result.rows[0] as OrderRow|undefined;
};
const event=async(orderId:string,actorId:string,type:string,details?:string,client?:any)=>{
 const sql='INSERT INTO order_events(id,order_id,actor_id,event_type,details) VALUES($1,$2,$3,$4,$5) RETURNING id';
 if(client) await client.query(sql,[randomUUID(),orderId,actorId,type,details??null]); else await query(sql,[randomUUID(),orderId,actorId,type,details??null]);
};
const insertNotification=async(client:any,userId:string,type:string,title:string,message:string,link:string)=>{
 await client.query('INSERT INTO user_notifications(id,user_id,type,title,message,link) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[randomUUID(),userId,type,title,message,link]);
};
const notify=async(userId:string,type:string,title:string,message:string,link:string)=>{
 await query('INSERT INTO user_notifications(id,user_id,type,title,message,link) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[randomUUID(),userId,type,title,message,link]);
};
const mimeExtensions:Record<string,string>={...ORDER_DELIVERY_EXTENSIONS,'text/uri-list':'url'};
const cleanOriginalName=(name:string,ext:string)=>path.win32.basename(name).replace(/[\/\\]/g,'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,180)||`delivery.${ext}`;
const cleanRelativePath=(name:string,ext:string)=>{const parts=name.replace(/\\/g,'/').split('/').filter(x=>x&&x!=='.'&&x!=='..').map(x=>x.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,120));if(!parts.length)return`delivery.${ext}`;parts[parts.length-1]=cleanOriginalName(parts[parts.length-1],ext);return parts.join('/').slice(0,500);};

export const createOrder=async(buyerId:string,serviceId:string,idempotencyKey:string)=>{
 const c=await getClient(); let result:{order:ReturnType<typeof mapOrder>;replayed:boolean};
 try { await c.query('BEGIN');
  const replay=(await c.query('SELECT order_id FROM order_idempotency_keys WHERE user_id=$1 AND idempotency_key=$2 FOR UPDATE',[buyerId,idempotencyKey])).rows[0] as {order_id:string}|undefined;
  if(replay){const prior=await findOrderRow(replay.order_id,c);if(prior){result={order:mapOrder(prior),replayed:true};await c.query('COMMIT');return result;}}
  const service=(await c.query(`SELECT s.id,s.freelancer_id,s.title,s.price FROM services s JOIN users u ON u.id=s.freelancer_id
   WHERE s.id=$1 AND s.status='active' AND u.is_active=1 AND u.account_status='ACTIVE' FOR UPDATE OF s`,[serviceId])).rows[0] as {id:string;freelancer_id:string;title:string;price:number}|undefined;
  if(!service)throw new AppError('الخدمة غير متاحة للطلب.',404); if(service.freelancer_id===buyerId)throw new AppError('لا يمكنك طلب خدمتك بنفسك.',422);
  const orderId=randomUUID();
  await c.query(`INSERT INTO orders(id,service_id,buyer_id,freelancer_id,price_amount,status,service_title) VALUES($1,$2,$3,$4,$5,'PENDING',$6) RETURNING id`,[orderId,service.id,buyerId,service.freelancer_id,Number(service.price??0),service.title]);
  await c.query('INSERT INTO order_idempotency_keys(user_id,idempotency_key,order_id) VALUES($1,$2,$3) RETURNING order_id',[buyerId,idempotencyKey,orderId]);
  await event(orderId,buyerId,'ORDER_CREATED',undefined,c);
  const buyer=(await c.query('SELECT name FROM users WHERE id=$1',[buyerId])).rows[0] as {name:string};
  await insertNotification(c,service.freelancer_id,'NEW_ORDER','وصلك طلب خدمة جديد',`طلب ${buyer.name} خدمة «${service.title}». افتح مساحة الطلب لمتابعة التفاصيل.`,`/orders/${orderId}`);
  const row=await findOrderRow(orderId,c); if(!row)throw new Error('Created order could not be loaded');
  result={order:mapOrder(row),replayed:false}; await c.query('COMMIT');
 } catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();}
 if(!result.replayed){emitRealtimeEvent(result.order.freelancerId,'notification');emitRealtimeEvent(result.order.freelancerId,'order',{orderId:result.order.id});} return result;
};

export const startOrder=async(orderId:string,freelancerId:string)=>{
 const c=await getClient();let row:OrderRow;
 try{await c.query('BEGIN');const order=await findOrderRow(orderId,c);if(!order)throw new AppError('Order not found.',404);
  if(order.freelancer_id!==freelancerId)throw new AppError('Only the assigned freelancer may start this order.',403);
  if(order.status!=='PENDING')throw new AppError('لا يمكن بدء العمل في حالة الطلب الحالية.',409);
  const changed=await c.query(`UPDATE orders SET status='IN_PROGRESS',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND freelancer_id=$2 AND status='PENDING' RETURNING id`,[orderId,freelancerId]);
  if(!changed.rowCount)throw new AppError('تغيرت حالة الطلب قبل بدء العمل.',409);
  await event(orderId,freelancerId,'ORDER_STARTED',undefined,c);await insertNotification(c,order.buyer_id,'ORDER_UPDATE','بدأ تنفيذ طلبك',`بدأ ${order.freelancer_name} العمل على طلب «${order.service_title}». يمكنك متابعة الحالة من مساحة الطلب.`,`/orders/${orderId}`);
  row=(await findOrderRow(orderId,c))!;await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 const result=mapOrder(row!);emitRealtimeEvent(row!.buyer_id,'notification');emitRealtimeEvent(row!.buyer_id,'order',{orderId});emitRealtimeEvent(row!.freelancer_id,'order',{orderId});return result;
};
export const listOrders=async(userId:string)=>{const {rows}=await query(`${orderSelect} WHERE o.buyer_id=$1 OR o.freelancer_id=$2 ORDER BY o.created_at DESC`,[userId,userId]);return(rows as OrderRow[]).map(mapOrder);};
export const getOrder=async(orderId:string,userId:string)=>{
 const row=await findOrderRow(orderId);if(!row)throw new AppError('الطلب غير موجود.',404);if(row.buyer_id!==userId&&row.freelancer_id!==userId)throw new AppError('لا تملك صلاحية الوصول لهذا الطلب.',403);
 const [deliveryResult,reviewResult]=await Promise.all([
  query(`SELECT id,file_path AS "storagePath",original_filename AS "originalFilename",mime_type AS "mimeType",file_size AS "fileSize",relative_path AS "relativePath",sha256,version_number AS "versionNumber",freelancer_notes AS "freelancerNotes",created_at AS "createdAt" FROM order_deliveries WHERE order_id=$1 ORDER BY version_number,created_at`,[orderId]),
  query(`SELECT id,client_name AS "clientName",rating,comment,created_at AS "createdAt",freelancer_reply AS "freelancerReply",replied_at AS "repliedAt" FROM reviews WHERE order_id=$1 LIMIT 1`,[orderId]),
 ]);
 const deliveries=[];for(const d of deliveryResult.rows as Array<Record<string,any>>){const {storagePath,...item}=d;if(!item.sha256){const bytes=await downloadPrivateFile(storagePath);item.sha256=createHash('sha256').update(bytes).digest('hex');await query('UPDATE order_deliveries SET sha256=$1 WHERE id=$2 AND sha256=$3',[item.sha256,item.id,'']);}deliveries.push(item);}
 return{...mapOrder(row),deliveries,review:reviewResult.rows[0]??null};
};
export const listOrderMessages=async(orderId:string,userId:string):Promise<OrderMessage[]>=>{const o=await findOrderRow(orderId);if(!o)throw new AppError('Order not found.',404);if(o.buyer_id!==userId&&o.freelancer_id!==userId)throw new AppError('Order chat access denied.',403);const {rows}=await query(`SELECT m.id,m.order_id AS "orderId",m.sender_id AS "senderId",u.name AS "senderName",m.content,m.created_at AS "createdAt" FROM order_messages m JOIN users u ON u.id=m.sender_id WHERE m.order_id=$1 ORDER BY m.created_at,m.id`,[orderId]);return rows as OrderMessage[];};
export const createOrderMessage=async(orderId:string,userId:string,content:string):Promise<OrderMessage>=>{
 const c=await getClient();let message:OrderMessage;
 try{await c.query('BEGIN');const o=await findOrderRow(orderId,c);if(!o)throw new AppError('Order not found.',404);if(o.buyer_id!==userId&&o.freelancer_id!==userId)throw new AppError('Order chat access denied.',403);if(['COMPLETED','CANCELLED'].includes(o.status))throw new AppError('Order chat is read-only.',409);if(scanText(content).length)throw new AppError('لحمايتك، لا ترسل بيانات تواصل خارج المنصة داخل محادثة الطلب.',422);
  const id=randomUUID();await c.query('INSERT INTO order_messages(id,order_id,sender_id,content) VALUES($1,$2,$3,$4) RETURNING id',[id,orderId,userId,content]);message=(await c.query(`SELECT m.id,m.order_id AS "orderId",m.sender_id AS "senderId",u.name AS "senderName",m.content,m.created_at AS "createdAt" FROM order_messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1`,[id])).rows[0] as OrderMessage;await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 const o=await findOrderRow(orderId);if(o){emitRealtimeEvent(o.buyer_id,'order',{orderId});emitRealtimeEvent(o.freelancer_id,'order',{orderId});}return message!;
};

export const deliverOrder=async(orderId:string,freelancerId:string,files:Express.Multer.File[],notes:string|undefined,externalLink?:string)=>{
 let link:string|undefined;
 if(externalLink){try{const u=new URL(externalLink);if(!isValidDeliveryLink(u.toString()))throw Error();link=u.toString();}catch{throw new AppError('Delivery link must be a valid HTTP or HTTPS URL.',400);}}
 if(!files.length&&!link)throw new AppError('Attach at least one file or provide a delivery link.',400);
 if(files.length&&link)throw new AppError('Choose file delivery or link delivery for each version.',400);
 for(const f of files){if(!mimeExtensions[f.mimetype])throw new AppError(`File type ${f.mimetype} is not allowed.`,400);if(!f.buffer?.length||!matchesFileSignature(f.buffer,f.mimetype))throw new AppError('Uploaded file contents do not match the declared type.',400);}
 const uploaded:string[]=[];const c=await getClient();let result:any;let owner:OrderRow|undefined;
 try{await c.query('BEGIN');owner=await findOrderRow(orderId,c);if(!owner)throw new AppError('Order not found.',404);if(owner.freelancer_id!==freelancerId)throw new AppError('Only the assigned freelancer may deliver.',403);
  const reserved=await c.query(`UPDATE orders SET delivery_version=delivery_version+1 WHERE id=$1 AND freelancer_id=$2 AND status IN('IN_PROGRESS','REVISION_REQUESTED') RETURNING delivery_version`,[orderId,freelancerId]);if(!reserved.rowCount)throw new AppError('Order cannot be delivered in its current state.',409);
  const version=Number(reserved.rows[0].delivery_version),batchId=randomUUID();
  const addDelivery=async(key:string,original:string,mime:string,size:number,relative:string,sha:string)=>{await c.query(`INSERT INTO order_deliveries(id,order_id,batch_id,file_path,original_filename,mime_type,file_size,relative_path,sha256,version_number,freelancer_notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,[randomUUID(),orderId,batchId,key,original,mime,size,relative,sha,version,notes??null]);};
  for(const f of files){const ext=mimeExtensions[f.mimetype],name=`${randomUUID()}.${ext}`,key=`orders/${orderId}/v${version}/${name}`;await uploadPrivateFile(key,f.buffer,f.mimetype);uploaded.push(key);await addDelivery(key,cleanOriginalName(f.originalname,ext),f.mimetype,f.size,cleanRelativePath(f.originalname,ext),createHash('sha256').update(f.buffer).digest('hex'));}
  if(link){const bytes=Buffer.from(link,'utf8'),name=`${randomUUID()}.url`,key=`orders/${orderId}/v${version}/${name}`;await uploadPrivateFile(key,bytes,'text/uri-list');uploaded.push(key);await addDelivery(key,'delivery.url','text/uri-list',bytes.length,'delivery.url',createHash('sha256').update(bytes).digest('hex'));}
  const changed=await c.query(`UPDATE orders SET status='DELIVERED',revision_notes=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND freelancer_id=$2 AND status IN('IN_PROGRESS','REVISION_REQUESTED') RETURNING id`,[orderId,freelancerId]);if(!changed.rowCount)throw new AppError('Order state changed; refresh and retry.',409);
  await event(orderId,freelancerId,'ORDER_DELIVERED',`version=${version};items=${files.length+(link?1:0)}`,c);await insertNotification(c,owner.buyer_id,'ORDER_UPDATE','?? ????? ????',`???? ${owner.freelancer_name} ????? ???????.`,`/orders/${orderId}`);
  const onTime=(await c.query("SELECT NULLIF(due_at,'')::timestamptz>=CURRENT_TIMESTAMP AS on_time FROM orders WHERE id=$1 AND NULLIF(due_at,'') IS NOT NULL",[orderId])).rows[0]?.on_time;const badge=`/freelancers/${freelancerId}?badge=fast-delivery`;
  if(onTime){const exists=(await c.query("SELECT 1 FROM user_notifications WHERE user_id=$1 AND type='BADGE_EARNED' AND link=$2 LIMIT 1",[freelancerId,badge])).rowCount;if(!exists)await insertNotification(c,freelancerId,'BADGE_EARNED','???? ????? ????','???? ????? ??? ????? ???????.',badge);}
  result={order:mapOrder((await findOrderRow(orderId,c))!),version,fileCount:files.length};await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');await Promise.all(uploaded.map((key)=>deleteCloudFile(key).catch(()=>undefined)));throw e;}finally{c.release();}
 emitRealtimeEvent(freelancerId,'notification');emitRealtimeEvent(owner!.buyer_id,'notification');emitRealtimeEvent(owner!.buyer_id,'order',{orderId});emitRealtimeEvent(freelancerId,'order',{orderId});return result;
};
export const requestRevision=async(orderId:string,buyerId:string,notes:string)=>mutateOrder(orderId,async(c,o)=>{
 if(o.buyer_id!==buyerId)throw new AppError('Only the assigned buyer may request a revision.',403);if(Number(o.revisions_used)>=REVISION_LIMIT)throw new AppError(`استهلكت الحد الأقصى لدورات التعديل (${REVISION_LIMIT}).`,409);
 const r=await c.query(`UPDATE orders SET status='REVISION_REQUESTED',revision_notes=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND buyer_id=$3 AND status='DELIVERED' RETURNING id`,[notes,orderId,buyerId]);if(!r.rowCount)throw new AppError('لا يمكن طلب تعديل في حالة الطلب الحالية.',409);
 await event(orderId,buyerId,'REVISION_REQUESTED',notes,c);await insertNotification(c,o.freelancer_id,'ORDER_UPDATE','طلب العميل تعديلاً',`طلب ${o.buyer_name} تعديلاً على التسليم. راجع الملاحظات داخل مساحة الطلب.`,`/orders/${orderId}`);
},['notification','order']);
export const acceptDelivery=async(orderId:string,buyerId:string)=>mutateOrder(orderId,async(c,o)=>{
 if(o.buyer_id!==buyerId)throw new AppError('Only the assigned buyer may accept delivery.',403);if(o.status!=='DELIVERED')throw new AppError('لا يمكن قبول التسليم في حالة الطلب الحالية.',409);
 const r=await c.query(`UPDATE orders SET status='AWAITING_REVIEW',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND buyer_id=$2 AND status='DELIVERED' RETURNING id`,[orderId,buyerId]);if(!r.rowCount)throw new AppError('تغيرت حالة الطلب قبل قبوله.',409);await event(orderId,buyerId,'DELIVERY_ACCEPTED',undefined,c);await insertNotification(c,o.freelancer_id,'ORDER_UPDATE','قبل العميل التسليم',`قبل ${o.buyer_name} تسليم الطلب. أكمل التقييم عند ظهوره في مساحة العمل.`,`/orders/${orderId}`);
},['notification','order']);
const mutateOrder=async(orderId:string,work:(c:any,o:OrderRow)=>Promise<void>,events:Array<'notification'|'order'>=['order'])=>{
 const c=await getClient();let o:OrderRow;let result:any;try{await c.query('BEGIN');o=(await findOrderRow(orderId,c))!;if(!o)throw new AppError('Order not found.',404);await work(c,o);result=mapOrder((await findOrderRow(orderId,c))!);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 const latest=(await findOrderRow(orderId))!;if(events.includes('notification')){emitRealtimeEvent(latest.buyer_id,'notification');emitRealtimeEvent(latest.freelancer_id,'notification');}emitRealtimeEvent(latest.buyer_id,'order',{orderId});emitRealtimeEvent(latest.freelancer_id,'order',{orderId});return result;
};
export const reviewOrder=async(orderId:string,buyerId:string,rating:number,comment:string|undefined,expectedFreelancerId?:string)=>{
 const c=await getClient();let result:any;let o:OrderRow;try{await c.query('BEGIN');o=(await findOrderRow(orderId,c))!;if(!o)throw new AppError('Order not found.',404);if(o.buyer_id!==buyerId)throw new AppError('Only the assigned buyer may review.',403);if(expectedFreelancerId&&o.freelancer_id!==expectedFreelancerId)throw new AppError('هذا الطلب لا يخص المستقل المحدد.',400);if(o.status!=='AWAITING_REVIEW')throw new AppError('التقييم متاح بعد قبول التسليم فقط.',409);
  const buyer=(await c.query('SELECT name FROM users WHERE id=$1',[buyerId])).rows[0] as {name:string};const reviewId=randomUUID();await c.query(`INSERT INTO reviews(id,order_id,freelancer_id,buyer_id,client_name,rating,comment) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[reviewId,orderId,o.freelancer_id,buyerId,buyer.name,rating,comment??null]);
  await insertNotification(c,o.freelancer_id,'NEW_REVIEW','وصلك تقييم جديد',`قيّمك ${buyer.name} على خدمة «${o.service_title}» بـ ${rating}/5 نجوم.`,`/orders/${orderId}`);
  const changed=await c.query(`UPDATE orders SET status='COMPLETED',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND buyer_id=$2 AND status='AWAITING_REVIEW' RETURNING id`,[orderId,buyerId]);if(!changed.rowCount)throw new AppError('تم تقييم الطلب مسبقاً.',409);await event(orderId,buyerId,'ORDER_REVIEWED',`rating=${rating}`,c);
  await awardOrderPoints(c,o.freelancer_id,50,`إكمال طلب بنجاح (${orderId})`,`order:${orderId}:complete`);if(rating===5)await awardOrderPoints(c,o.freelancer_id,20,`تقييم 5 نجوم (${orderId})`,`order:${orderId}:five-star`);
  const last=(await c.query(`SELECT COUNT(*) AS total,COUNT(*) FILTER(WHERE rating=5) AS five_stars FROM (SELECT rating FROM reviews WHERE freelancer_id=$1 ORDER BY created_at DESC LIMIT 5) q`,[o.freelancer_id])).rows[0];const badge=`/freelancers/${o.freelancer_id}?badge=seller`;const has=(await c.query("SELECT 1 FROM user_notifications WHERE user_id=$1 AND type='BADGE_EARNED' AND link=$2 LIMIT 1",[o.freelancer_id,badge])).rowCount;
  if(Number(last.total)===5&&Number(last.five_stars)===5&&!has)await insertNotification(c,o.freelancer_id,'BADGE_EARNED','شارة بائع متميز 🏅','حصلت على خمسة تقييمات متتالية بخمس نجوم، وأصبحت شارة بائع متميز ظاهرة على بروفايلك.',badge);
  await insertNotification(c,o.freelancer_id,'REWARD_EARNED','مكافأة إكمال طلب',`🎉 تهانينا! أكملت الطلب بنجاح وحصلت على ${rating===5?'+70 نقطة (+20 للتقييم الممتاز)':' +50 نقطة'}!`,`/orders/${orderId}`);
  const review=(await c.query(`SELECT id,client_name AS "clientName",rating,comment,created_at AS "createdAt",freelancer_reply AS "freelancerReply",replied_at AS "repliedAt" FROM reviews WHERE id=$1`,[reviewId])).rows[0];result={...mapOrder((await findOrderRow(orderId,c))!),review};await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 for(const ev of ['notification','data','profile','order'] as const)emitRealtimeEvent(o!.freelancer_id,ev,{orderId});emitRealtimeEvent(buyerId,'order',{orderId});return result;
};
const awardOrderPoints=async(c:any,userId:string,amount:number,reason:string,key:string)=>{
 const added=await c.query(`INSERT INTO points_history(id,user_id,amount,reason,source_key) SELECT $1,id,$2,$3,$4 FROM users WHERE id=$5 AND role='Freelancer' ON CONFLICT(source_key) DO NOTHING RETURNING id`,[randomUUID(),amount,reason,key,userId]);if(!added.rowCount)return;
 const r=await c.query(`UPDATE users SET points_balance=points_balance+$1 WHERE id=$2 AND role='Freelancer' RETURNING points_balance`,[amount,userId]);const balance=Number(r.rows[0]?.points_balance??0);if(balance>500)await c.query(`UPDATE users SET is_featured=1,featured_until=CASE WHEN featured_until IS NULL OR featured_until='' THEN (CURRENT_TIMESTAMP+INTERVAL '7 days')::text ELSE featured_until END WHERE id=$1 AND role='Freelancer'`,[userId]);
};
export const replyToOrderReview=async(orderId:string,freelancerId:string,reply:string)=>{
 const c=await getClient();let review:any;let buyerId:string;try{await c.query('BEGIN');const o=await findOrderRow(orderId,c);if(!o)throw new AppError('Order not found.',404);if(o.freelancer_id!==freelancerId)throw new AppError('Only the assigned freelancer may reply.',403);if(o.status!=='COMPLETED')throw new AppError('Replies are available after completion.',409);
  const existing=(await c.query('SELECT id,freelancer_reply FROM reviews WHERE order_id=$1 FOR UPDATE',[orderId])).rows[0] as {id:string;freelancer_reply:string|null}|undefined;if(!existing)throw new AppError('The completed order has no review.',404);if(existing.freelancer_reply)throw new AppError('A reply has already been posted.',409);
  const updated=await c.query('UPDATE reviews SET freelancer_reply=$1,replied_at=CURRENT_TIMESTAMP WHERE id=$2 AND freelancer_reply IS NULL RETURNING id',[reply,existing.id]);if(!updated.rowCount)throw new AppError('The review was already answered.',409);buyerId=o.buyer_id;await insertNotification(c,buyerId,'NEW_REVIEW','رد المستقل على تقييمك',`${o.freelancer_name} رد على تقييمك في الطلب.`,`/orders/${orderId}`);review=(await c.query(`SELECT id,client_name AS "clientName",rating,comment,created_at AS "createdAt",freelancer_reply AS "freelancerReply",replied_at AS "repliedAt" FROM reviews WHERE id=$1`,[existing.id])).rows[0];await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}emitRealtimeEvent(buyerId!,'notification');return review;
};
export const cancelOrder=async(orderId:string,actorId:string)=>mutateOrder(orderId,async(c,o)=>{
 if(o.buyer_id!==actorId&&o.freelancer_id!==actorId)throw new AppError('Order cancellation access denied.',403);if(o.buyer_id===actorId&&o.status!=='PENDING')throw new AppError('Buyer cannot cancel after work starts.',403);if(o.freelancer_id===actorId&&!['PENDING','IN_PROGRESS'].includes(o.status))throw new AppError('Freelancer cannot cancel after delivery.',403);if(!['PENDING','IN_PROGRESS'].includes(o.status))throw new AppError('Order cannot be cancelled in its current state.',409);
 const r=await c.query(`UPDATE orders SET status='CANCELLED',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status IN('PENDING','IN_PROGRESS') RETURNING id`,[orderId]);if(!r.rowCount)throw new AppError('تغيرت حالة الطلب قبل إلغائه.',409);await event(orderId,actorId,'ORDER_CANCELLED',undefined,c);const recipient=o.buyer_id===actorId?o.freelancer_id:o.buyer_id;await insertNotification(c,recipient,'ORDER_UPDATE','تم إلغاء الطلب',`تم إلغاء الطلب «${o.service_title}».`,`/orders/${orderId}`);
},['notification','order']);

const deliveryAccess=async(orderId:string,deliveryId:string,userId:string,mode:'download'|'preview')=>{
 const o=await findOrderRow(orderId);if(!o)throw new AppError('Order not found.',404);if(o.buyer_id!==userId&&o.freelancer_id!==userId)throw new AppError('Order access denied.',403);
 if(mode==='download'&&o.status!=='COMPLETED')throw new AppError('Download is available after order completion only.',403);if(mode==='preview'&&o.buyer_id===userId&&!['DELIVERED','REVISION_REQUESTED','AWAITING_REVIEW','COMPLETED'].includes(o.status))throw new AppError('Preview is available after delivery.',403);
 const {rows}=await query('SELECT file_path,original_filename,mime_type,sha256 FROM order_deliveries WHERE id=$1 AND order_id=$2',[deliveryId,orderId]);const d=rows[0] as {file_path:string;original_filename:string;mime_type:string;sha256:string}|undefined;if(!d)throw new AppError('Delivery file not found.',404);
 if(mode==='preview'){const types=new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/uri-list','text/html','application/json','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/wav','audio/ogg']);if(!types.has(d.mime_type))throw new AppError('This file type does not support safe inline preview.',415);}
 const buffer=await downloadPrivateFile(d.file_path);return{buffer,name:d.original_filename,mimeType:d.mime_type,sha256:d.sha256||createHash('sha256').update(buffer).digest('hex')};
};export const getDeliveryForDownload=(orderId:string,deliveryId:string,userId:string)=>deliveryAccess(orderId,deliveryId,userId,'download');
export const getDeliveryForPreview=(orderId:string,deliveryId:string,userId:string)=>deliveryAccess(orderId,deliveryId,userId,'preview');
export const getOrderArchiveFiles=async(orderId:string,userId:string)=>{
 const o=await findOrderRow(orderId);if(!o)throw new AppError('Order not found.',404);if(o.buyer_id!==userId&&o.freelancer_id!==userId)throw new AppError('Vault access denied.',403);if(o.status!=='COMPLETED')throw new AppError('Bulk download is available after completion only.',403);
 const {rows}=await query(`SELECT file_path,original_filename,version_number,relative_path FROM order_deliveries WHERE order_id=$1 AND mime_type<>'text/uri-list' ORDER BY version_number,created_at`,[orderId]);const files=[];
 for(const r of rows as Array<{file_path:string;original_filename:string;version_number:number;relative_path:string}>){const parts=(r.relative_path||r.original_filename).replace(/\\/g,'/').split('/').filter(x=>x&&x!=='.'&&x!=='..').map(x=>x.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,180));files.push({buffer:await downloadPrivateFile(r.file_path),archivePath:path.posix.join(`v${r.version_number}`,parts.join('/')||'delivery-file')});}
 if(!files.length)throw new AppError('No delivery files are available for this order.',404);return files;
};
