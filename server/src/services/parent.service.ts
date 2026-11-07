import { createHash, randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { query } from '../config/db';
import { env } from '../config/env';
import { privateParentVerificationDir } from '../config/paths';
import { createUserNotification } from '../models/notification.model';
import { approveParentVerificationByToken, createParentLink, createParentVerification, findChildByEmail, findParentById, findParentVerificationByToken, findParentVerificationPhoto, getChildLinkRequests, listLinkedChildren, listParentVerifications, markAccountVerificationPending, respondToParentLink, reviewParentVerification, type ParentLinkRow, linkedParentsForChild, parentHasChatConsent, recordParentAccess, getChildParentAccessLog, getChildConversations, getChildConversationMessages, findLinkedChildMessageAttachment, approveLinkedParentChatAccess, updateLinkedChildDisplay } from '../models/parent.model';
import { findUserById } from '../models/user.model';
import { recordAdminAudit } from '../models/admin.model';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import { matchesFileSignatureFromPath } from '../utils/file-signature';
import { emitRealtimeEvent } from './realtime.service';
import { isEmailDeliveryConfigured, sendParentVerificationDecisionEmail, sendParentVerificationEmail } from './email.service';
import { resolveChatAttachmentPath } from './upload.service';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`;
};

export const requestParentLink = async (parentId: string, emailInput: string) => {
  const parent = await findParentById(parentId);
  if (!parent) throw new AppError('حساب ولي الأمر غير متاح', 403);
  const child = await findChildByEmail(emailInput.trim().toLowerCase());
  if (!child) throw new AppError('لم نعثر على حساب مستقل بهذا البريد الإلكتروني', 404);
  if ((await query("SELECT 1 FROM parent_child_links WHERE parent_id = $1 AND child_id = $2 AND status = 'APPROVED'", [parentId, child.id])).rowCount) {
    throw new AppError('هذا الحساب مرتبط بك بالفعل', 409);
  }
  if ((await query("SELECT 1 FROM parent_child_links WHERE parent_id = $1 AND child_id = $2 AND status = 'PENDING'", [parentId, child.id])).rowCount) {
    throw new AppError('لديك طلب ربط معلّق لهذا الحساب', 409);
  }
  const id = await createParentLink(parentId, child.id);
  await createUserNotification(child.id, 'PARENT_LINK_REQUEST', `طلب ربط من ولي الأمر`, `يرغب ولي أمرك ${parent.name} في ربط الحساب لمتابعة إنجازاتك.`, '/dashboard?parentRequests=1');
  emitRealtimeEvent(child.id, 'data');
  return { id, childName: child.name };
};

export const pendingLinkRequests = (childId: string) => getChildLinkRequests(childId);

export const respondToLinkRequest = async (childId: string, linkId: string, status: 'APPROVED' | 'REJECTED') => {
  const link = await respondToParentLink(linkId, childId, status);
  if (!link) throw new AppError('طلب الربط غير موجود أو تمت معالجته', 404);
  const child = await findUserById(childId);
  await createUserNotification(link.parent_id, 'ACCOUNT_STATUS', status === 'APPROVED' ? 'تمت الموافقة على طلب الربط' : 'تم رفض طلب الربط', status === 'APPROVED' ? `وافق ${child?.name ?? 'المستقل'} على ربط الحساب.` : 'تم رفض طلب ربط الحساب.', '/buyer');
  emitRealtimeEvent(link.parent_id, 'data');
  emitRealtimeEvent(childId, 'data');
  return { status };
};

export const linkedChildren = async (parentId: string) => {
  if (!await findParentById(parentId)) throw new AppError('حساب ولي الأمر غير متاح', 403);
  return await listLinkedChildren(parentId);
};

export const updateParentChildDisplay = async (parentId: string, childId: string, displayName: string | null | undefined, file?: Express.Multer.File) => {
  let avatarDataUrl: string | undefined;
  if (file) {
    if (file.size > 1024 * 1024) throw new AppError('يجب ألا يتجاوز حجم الصورة 1 ميجابايت', 413);
    if (!matchesFileSignatureFromPath(file.path, file.mimetype)) throw new AppError('ملف الصورة غير صالح. استخدم JPG أو PNG أو WebP أو GIF.', 400);
    const bytes = await readFile(file.path);
    avatarDataUrl = `data:${file.mimetype};base64,${bytes.toString('base64')}`;
  }

  const updated = await updateLinkedChildDisplay(parentId, childId, displayName, avatarDataUrl);
  if (!updated) throw new AppError('الحساب غير مرتبط بك أو لا توجد تغييرات لحفظها', 404);
  emitRealtimeEvent(parentId, 'data');
  return { success: true };
};

export const childParentChatSettings = async (childId: string) => (await linkedParentsForChild(childId)).map((parent) => ({ ...parent, chatAccessEnabled: Boolean(parent.chatAccessEnabled) }));

export const approveLegacyParentChatAccess = async (childId: string, linkId: string) => {
  const parentId = await approveLinkedParentChatAccess(childId, linkId);
  if (!parentId) throw new AppError('This relationship already has access or is no longer active', 409);
  await createUserNotification(parentId, 'ACCOUNT_STATUS', 'تم تحديث صلاحيات متابعة الحساب', 'وافق صاحب الحساب على إتاحة محادثاته للقراءة ضمن ربط ولي الأمر.', '/parent');
  emitRealtimeEvent(parentId, 'data');
  emitRealtimeEvent(childId, 'data');
  return { enabled: true };
};

export const childParentAccessHistory = (childId: string) => getChildParentAccessLog(childId);

export const parentChildConversations = async (parentId: string, childId: string) => {
  if (!await findParentById(parentId) || !await parentHasChatConsent(parentId, childId)) throw new AppError('Chat access requires the child\'s separate consent', 403);
  await recordParentAccess(parentId, childId, 'VIEW_CONVERSATIONS');
  emitRealtimeEvent(childId, 'data');
  return getChildConversations(childId);
};

export const parentChildMessages = async (parentId: string, childId: string, peerId: string, serviceId: string | null) => {
  if (!await findParentById(parentId) || !await parentHasChatConsent(parentId, childId)) throw new AppError('Chat access requires the child\'s separate consent', 403);
  if (peerId === childId) throw new AppError('Invalid conversation participant', 400);
  await recordParentAccess(parentId, childId, 'VIEW_MESSAGES', peerId);
  emitRealtimeEvent(childId, 'data');
  return getChildConversationMessages(childId, peerId, serviceId);
};

export const parentChildMessageAttachment = async (parentId: string, childId: string, messageId: string) => {
  if (!await findParentById(parentId) || !await parentHasChatConsent(parentId, childId)) throw new AppError('Chat access requires an approved parent link', 403);
  const attachment = await findLinkedChildMessageAttachment(messageId, childId);
  if (!attachment) throw new AppError('Attachment was not found for this linked account', 404);
  await recordParentAccess(parentId, childId, 'VIEW_MESSAGES', attachment.senderId === childId ? attachment.receiverId : attachment.senderId);
  const filePath = resolveChatAttachmentPath(attachment.storageKey);
  if (!existsSync(filePath)) throw new AppError('Attachment is no longer available', 404);
  return { filePath, name: attachment.name, mimeType: attachment.mimeType };
};

export const startParentVerification = async (childId: string, emailInput: string) => {
  const child = await findUserById(childId);
  if (!child || child.role !== 'Freelancer' || !child.is_active) throw new AppError('الحساب غير مؤهل لبدء التحقق', 403);
  if (child.account_status === 'PENDING_ADMIN_REVIEW') throw new AppError('تم إرسال التوثيق بالفعل. انتظر مراجعة الإدارة قبل إرسال طلب جديد.', 409);
  const parentEmail = emailInput.trim().toLowerCase();
  if (parentEmail === child.email.trim().toLowerCase()) throw new AppError('لا يمكنك استخدام بريد حسابك نفسه. أدخل بريد ولي أمرك.', 422);
  if (!isEmailDeliveryConfigured()) throw new AppError('خدمة إرسال البريد غير مهيأة حاليًا. تواصل مع إدارة المنصة لإكمال التوثيق.', 503);

  const token = randomUUID() + randomUUID().replaceAll('-', '');
  const verificationLink = new URL('/verify-parent', env.FRONTEND_URL);
  verificationLink.searchParams.set('token', token);
  const sent = await sendParentVerificationEmail(parentEmail, child.name, verificationLink.toString());
  if (!sent) throw new AppError('تعذر إرسال رابط التوثيق إلى بريد ولي الأمر. تحقق من البريد وحاول مرة أخرى.', 502);

  const tokenHash = hashToken(token);
  await createParentVerification(childId, parentEmail, tokenHash, randomInt(3, 13), randomInt(3, 13));
  await markAccountVerificationPending(childId, parentEmail, tokenHash);
  emitRealtimeEvent(childId, 'data');
  return { sent: true as const, message: 'تم إرسال رابط التوثيق بنجاح إلى بريد ولي أمرك، يرجى إبلاغه بالتحقق من صندوق الوارد (Inbox)' };
};

const findActiveVerification = async (token: string) => {
  const row = await findParentVerificationByToken(hashToken(token));
  if (!row || row.status !== 'PENDING_PARENT_APPROVAL') throw new AppError('رابط التحقق غير صالح أو تم استخدامه مسبقًا', 404);
  if (Date.now() - Date.parse(row.created_at) > VERIFICATION_TTL_MS) throw new AppError('انتهت صلاحية رابط التحقق، اطلب رابطًا جديدًا', 410);
  return row;
};

export const getPublicParentVerification = async (token: string) => {
  const row = await findActiveVerification(token);
  return {
    childName: row.child_name ?? '',
    childEmail: row.child_email ?? '',
    parentEmailMasked: maskEmail(row.parent_email ?? row.parent_phone),
    expiresAt: new Date(Date.parse(row.created_at) + VERIFICATION_TTL_MS).toISOString(),
    challenge: { a: row.challenge_a, b: row.challenge_b },
  };
};

const PARENT_PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const saveParentPhoto = async (file?: Express.Multer.File): Promise<string> => {
  if (!file) throw new AppError('التقط صورة شخصية واضحة لولي الأمر لإكمال التوثيق', 422);
  const extension = PARENT_PHOTO_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError('ارفع صورة JPG أو PNG أو WebP بحجم لا يتجاوز 3 ميجابايت', 400);
  if (!matchesFileSignatureFromPath(file.path, file.mimetype)) throw new AppError('محتوى الصورة لا يطابق نوع الملف', 400);
  await mkdir(privateParentVerificationDir, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await copyFile(file.path, path.join(privateParentVerificationDir, fileName));
  return fileName;
};

export const approveParentVerification = async (token: string, mathAnswer: number, file?: Express.Multer.File) => {
  const row = await findActiveVerification(token);
  if (row.challenge_a * row.challenge_b !== mathAnswer) throw new AppError('إجابة المسألة الحسابية غير صحيحة', 422);
  const photoName = await saveParentPhoto(file);
  const result = await approveParentVerificationByToken(row.id, row.child_id, photoName);
  if (!result.rowCount) throw new AppError('تمت الموافقة على هذا الرابط مسبقًا', 409);
  const admins = await query("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1");
  for (const admin of admins.rows as Array<{id:string}>) await createUserNotification(admin.id, 'NEW_REPORT', 'طلب توثيق ولي أمر جديد', `وافق ولي أمر ${row.child_name ?? 'أحد المبدعين'} على توثيق الحساب، بانتظار مراجعة الإدارة.`, '/admin?tab=parent-verifications');
  emitRealtimeEvent(row.child_id, 'data');
  return { status: 'PENDING_ADMIN_REVIEW' as const };
};

export const adminParentVerificationQueue = async (input: { page: number; limit: number }) => {
  const result = await listParentVerifications(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const adminParentVerificationPhoto = async (id: string) => {
  const row = await findParentVerificationPhoto(id);
  if (!row?.photoPath) throw new AppError('لا توجد صورة مرفقة بهذا الطلب', 404);
  const filePath = path.join(privateParentVerificationDir, path.basename(row.photoPath));
  if (!existsSync(filePath)) throw new AppError('الصورة لم تعد متاحة', 404);
  const extension = path.extname(filePath).slice(1).toLowerCase();
  const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  return { filePath, mimeType };
};

export const reviewParentVerificationRequest = async (
  id: string,
  adminId: string,
  approve: boolean,
  reason: string,
) => {
  const reviewed = await reviewParentVerification(id, adminId, approve);
  if (!reviewed) throw new AppError('طلب المراجعة غير موجود أو تمت معالجته', 404);
  recordAdminAudit(adminId, approve ? 'parent_verification_approve' : 'parent_verification_reject',
    'parent_verification', id, reason, { childId: reviewed.child_id });
  const child = await findUserById(reviewed.child_id);
  const decision = approve
    ? 'تمت الموافقة على توثيق حساب طفلك وتفعيله'
    : 'لم يُعتمد توثيق الحساب. يمكن للطالب إعادة المحاولة ببيانات وبريد ولي أمر صحيحين من بوابة التوثيق.';
  await createUserNotification(reviewed.child_id, 'ACCOUNT_STATUS', approve ? 'تم تفعيل الحساب' : 'تعذر توثيق الحساب', decision, '/');
  const sent = await sendParentVerificationDecisionEmail(reviewed.parent_email, child?.name ?? 'حساب طفلك', approve);
  emitRealtimeEvent(reviewed.child_id, 'data');
  return { sent, parentEmail: reviewed.parent_email };
};
