import { randomUUID } from 'node:crypto';
import { query } from '../config/db';

export type SupportSender = 'USER' | 'ADMIN';
export interface SupportAttachment { storageKey: string; name: string; mimeType: string; size: number; type: 'IMAGE' | 'VIDEO' | 'FILE'; }
export const insertSupportTicket = async (userId: string, subject: string): Promise<string> => {
  const id = randomUUID();
  await query('INSERT INTO support_tickets(id,user_id,subject) VALUES($1,$2,$3) RETURNING id', [id,userId,subject]);
  return id;
};
export const insertSupportMessage = async (ticketId:string,senderId:string,senderType:SupportSender,message:string,attachment?:SupportAttachment) => {
  const id=randomUUID();
  await query(`INSERT INTO support_messages(id,ticket_id,sender_type,sender_id,message,attachment_url,attachment_type,attachment_name,attachment_mime,attachment_size)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[id,ticketId,senderType,senderId,message,attachment?.storageKey??null,attachment?.type??null,attachment?.name??null,attachment?.mimeType??null,attachment?.size??null]);
  await query('UPDATE support_tickets SET updated_at=CURRENT_TIMESTAMP WHERE id=$1',[ticketId]);
  return id;
};
export const findSupportTicket = async (ticketId:string) => (await query(`SELECT t.id,t.user_id AS "userId",t.guest_email AS "guestEmail",t.subject,t.status,t.created_at AS "createdAt",t.updated_at AS "updatedAt",u.name AS "userName",u.email AS "userEmail" FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id WHERE t.id=$1`,[ticketId])).rows[0] as {id:string;userId:string|null;guestEmail:string|null;subject:string;status:'OPEN'|'CLOSED';createdAt:string;updatedAt:string;userName:string|null;userEmail:string|null}|undefined;
export const listSupportTicketsForUser = async (userId:string) => (await query(`SELECT t.id,t.subject,t.status,t.created_at AS "createdAt",t.updated_at AS "updatedAt",(SELECT message FROM support_messages m WHERE m.ticket_id=t.id ORDER BY m.created_at DESC LIMIT 1) AS "lastMessage",(SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) AS "messageCount" FROM support_tickets t WHERE t.user_id=$1 ORDER BY t.updated_at DESC`,[userId])).rows;
export const listAllSupportTickets = async (input:{page:number;limit:number;q?:string;status?:'OPEN'|'CLOSED'}) => {
  const conditions:string[]=[];const values:(string|number)[]=[];
  if(input.status){values.push(input.status);conditions.push(`t.status=$${values.length}`);}
  if(input.q){const escaped=input.q.replace(/[!%_]/g,'!$&');for(let i=0;i<4;i++)values.push(`%${escaped}%`);const n=values.length;conditions.push(`(t.subject ILIKE $${n-3} ESCAPE '!' OR t.guest_email ILIKE $${n-2} ESCAPE '!' OR u.name ILIKE $${n-1} ESCAPE '!' OR u.email ILIKE $${n} ESCAPE '!')`);}
  const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
  const count=(await query(`SELECT COUNT(*) AS total FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id ${where}`,values)).rows[0];
  const params=[...values,input.limit,(input.page-1)*input.limit];const lim=params.length-1,off=params.length;
  const items=await query(`SELECT t.id,t.subject,t.status,t.created_at AS "createdAt",t.updated_at AS "updatedAt",t.user_id AS "userId",COALESCE(u.name,t.guest_email) AS "userName",COALESCE(u.email,t.guest_email) AS "userEmail",u.role AS "userRole",(SELECT message FROM support_messages m WHERE m.ticket_id=t.id ORDER BY m.created_at DESC LIMIT 1) AS "lastMessage",(SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) AS "messageCount",(SELECT sender_type FROM support_messages m WHERE m.ticket_id=t.id ORDER BY m.created_at DESC LIMIT 1) AS "lastSenderType" FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id ${where} ORDER BY CASE t.status WHEN 'OPEN' THEN 0 ELSE 1 END,t.updated_at DESC LIMIT $${lim} OFFSET $${off}`,params);
  return {items:items.rows,total:Number(count?.total??0)};
};
export const listSupportMessages = async (ticketId:string) => (await query(`SELECT m.id,m.ticket_id AS "ticketId",m.sender_type AS "senderType",m.sender_id AS "senderId",COALESCE(u.name,'مستخدم') AS "senderName",u.avatar_url AS "senderAvatar",m.message,m.attachment_url AS "attachmentUrl",m.attachment_type AS "attachmentType",m.attachment_name AS "attachmentName",m.attachment_mime AS "attachmentMime",m.attachment_size AS "attachmentSize",m.created_at AS "createdAt" FROM support_messages m LEFT JOIN users u ON u.id=m.sender_id WHERE m.ticket_id=$1 ORDER BY m.created_at ASC`,[ticketId])).rows;
export const findSupportAttachment = async (ticketId:string,messageId:string) => (await query(`SELECT m.attachment_url AS "storageKey",m.attachment_name AS name,m.attachment_mime AS "mimeType",t.user_id AS "userId" FROM support_messages m JOIN support_tickets t ON t.id=m.ticket_id WHERE m.ticket_id=$1 AND m.id=$2 AND m.attachment_url IS NOT NULL`,[ticketId,messageId])).rows[0] as {storageKey:string;name:string;mimeType:string;userId:string|null}|undefined;
export const setSupportTicketStatus = async (ticketId:string,status:'OPEN'|'CLOSED'):Promise<boolean> => (await query('UPDATE support_tickets SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id',[status,ticketId])).rowCount!>0;
