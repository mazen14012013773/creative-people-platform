import type { Express } from 'express';
import { existsSync } from 'node:fs';
import { query } from '../config/db';
import { findUserById } from '../models/user.model';
import { findSupportAttachment, findSupportTicket, insertSupportMessage, insertSupportTicket, listAllSupportTickets, listSupportMessages, listSupportTicketsForUser, setSupportTicketStatus, type SupportAttachment, type SupportSender } from '../models/support.model';
import { recordAdminAudit } from '../models/admin.model';
import { emitRealtimeEvent } from './realtime.service';
import { createUserNotification } from '../models/notification.model';
import { deleteChatAttachment, getPrivateFileUrl, saveChatAttachment } from './upload.service';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import { sanitizePlainText } from '../utils/sanitize';

const notifySupportUpdates = async (userId: string) => {
  emitRealtimeEvent(userId, 'support');
  const admins = await query("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1");
  (admins.rows as Array<{id:string}>).forEach((admin) => emitRealtimeEvent(admin.id, 'support'));
};

const notifySupportMessage = async (ticket: NonNullable<Awaited<ReturnType<typeof findSupportTicket>>>, sender: { id: string; name: string; type: SupportSender }, message: string, attachment?: SupportAttachment) => {
  const preview = message.trim().slice(0, 140) || (attachment ? `أرفق ملفاً: ${attachment.name}` : 'أرسل رسالة جديدة');
  if (sender.type === 'ADMIN' && ticket.userId) {
    await createUserNotification(ticket.userId, 'NEW_MESSAGE', `رد جديد من الدعم الفني: ${ticket.subject}`, preview, `/?supportTicket=${encodeURIComponent(ticket.id)}`);
    return;
  }
  const admins = await query("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1");
  for (const admin of admins.rows as Array<{id:string}>) await createUserNotification(admin.id, 'NEW_MESSAGE', `طلب دعم جديد: ${ticket.subject}`, `رسالة من ${sender.name}: ${preview}`, `/admin?tab=support&ticketId=${encodeURIComponent(ticket.id)}`);
};

const getSender = async (userId: string): Promise<{ id: string; name: string; type: SupportSender }> => {
  const user = await findUserById(userId);
  if (!user || !user.is_active) throw new AppError('الحساب غير متاح للدعم الفني.', 403);
  return { id: user.id, name: user.name, type: user.role === 'Admin' ? 'ADMIN' : 'USER' };
};

const storeAttachment = async (userId: string, file?: Express.Multer.File): Promise<SupportAttachment | undefined> => {
  if (!file) return undefined;
  const saved = await saveChatAttachment(userId, file);
  return {
    ...saved,
    type: file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype.startsWith('video/') ? 'VIDEO' : 'FILE',
  };
};

export const getMySupportTickets = (userId: string) => listSupportTicketsForUser(userId);

export const getAdminSupportTickets = async (input: { page: number; limit: number; q?: string; status?: 'OPEN' | 'CLOSED' }) => {
  const result = await listAllSupportTickets(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const createSupportTicket = async (userId: string, subjectInput: string, messageInput: string, file?: Express.Multer.File) => {
  const sender = await getSender(userId);
  if (sender.type !== 'USER') throw new AppError('حساب الإدارة يرد من لوحة الدعم الفني.', 403);
  const subject = sanitizePlainText(subjectInput).slice(0, 120);
  const message = sanitizePlainText(messageInput).slice(0, 4000);
  if (subject.length < 3 || (!message && !file)) throw new AppError('أدخل عنواناً ورسالة أو أرفق ملفاً لبدء المحادثة.', 400);
  const attachment = await storeAttachment(userId, file);
  const ticketId = await insertSupportTicket(userId, subject);
  try {
    await insertSupportMessage(ticketId, sender.id, sender.type, message, attachment);
  } catch (error) {
    if (attachment) await deleteChatAttachment(attachment.storageKey);
    throw error;
  }
  const ticket = await findSupportTicket(ticketId);
  if (ticket) await notifySupportMessage(ticket, sender, message, attachment);
  await notifySupportUpdates(userId);
  return ticket;
};

export const getSupportTicketMessages = async (requesterId: string, ticketId: string) => {
  const sender = await getSender(requesterId);
  const ticket = await findSupportTicket(ticketId);
  if (!ticket || (sender.type !== 'ADMIN' && ticket.userId !== requesterId)) throw new AppError('محادثة الدعم غير موجودة أو لا تملك صلاحية عرضها.', 404);
  return { ticket, messages: await listSupportMessages(ticketId) };
};

export const sendSupportMessage = async (requesterId: string, ticketId: string, messageInput: string, file?: Express.Multer.File) => {
  const sender = await getSender(requesterId);
  const ticket = await findSupportTicket(ticketId);
  if (!ticket || (sender.type !== 'ADMIN' && ticket.userId !== requesterId)) throw new AppError('محادثة الدعم غير موجودة أو لا تملك صلاحية الرد.', 404);
  if (ticket.status === 'CLOSED') throw new AppError('هذه المحادثة مغلقة. افتح محادثة دعم جديدة إذا احتجت المساعدة.', 409);
  const message = sanitizePlainText(messageInput).slice(0, 4000);
  if (!message && !file) throw new AppError('اكتب رسالة أو أرفق ملفاً قبل الإرسال.', 400);
  const attachment = await storeAttachment(requesterId, file);
  try {
    await insertSupportMessage(ticketId, sender.id, sender.type, message, attachment);
  } catch (error) {
    if (attachment) await deleteChatAttachment(attachment.storageKey);
    throw error;
  }
  await notifySupportMessage(ticket, sender, message, attachment);
  await notifySupportUpdates(ticket.userId ?? requesterId);
  return (await listSupportMessages(ticketId)).at(-1);
};

export const updateSupportTicketStatus = async (
  adminId: string,
  ticketId: string,
  status: 'OPEN' | 'CLOSED',
  reason: string,
) => {
  const ticket = await findSupportTicket(ticketId);
  if (!ticket) throw new AppError('محادثة الدعم غير موجودة.', 404);
  await setSupportTicketStatus(ticketId, status);
  recordAdminAudit(adminId, status === 'CLOSED' ? 'support_ticket_close' : 'support_ticket_open',
    'support_ticket', ticketId, reason, { previousStatus: ticket.status, nextStatus: status });
  await notifySupportUpdates(ticket.userId ?? '');
  return findSupportTicket(ticketId);
};

export const getSupportMessageAttachment = async (requesterId: string, ticketId: string, messageId: string) => {
  const sender = await getSender(requesterId);
  const attachment = await findSupportAttachment(ticketId, messageId);
  if (!attachment || (sender.type !== 'ADMIN' && attachment.userId !== requesterId)) throw new AppError('الملف غير موجود أو لا تملك صلاحية عرضه.', 404);
  const url = await getPrivateFileUrl(attachment.storageKey);
  return { ...attachment, url };
};
