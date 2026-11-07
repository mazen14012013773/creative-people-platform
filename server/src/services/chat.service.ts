import { findServiceById } from '../models/services.model';
import { findAttachmentForParticipant, insertMessage, listConversations, listMessages } from '../models/chat.model';
import { findUserById } from '../models/user.model';
import { createUserNotification } from '../models/notification.model';
import { emitRealtimeEvent } from './realtime.service';
import { deleteChatAttachment, resolveChatAttachmentPath, saveChatAttachment } from './upload.service';
import type { Express } from 'express';
import { existsSync } from 'node:fs';
import type { ChatConversation, ChatMessage } from '../types/chat';
import { AppError } from '../utils/app-error';
import { scanText } from '../utils/moderation';
import type { SendMessageInput } from '../validators/chat.validator';

const getChatParticipant = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user || !user.is_active || !['Buyer', 'Freelancer'].includes(user.role)) {
    throw new AppError('المستخدم غير متاح للمحادثة', 404);
  }
  return user;
};

export const getConversations = (userId: string): Promise<ChatConversation[]> => listConversations(userId);

export const getConversationMessages = async (
  userId: string,
  peerId: string,
  serviceId?: string,
): Promise<ChatMessage[]> => {
  if (peerId === userId) throw new AppError('لا يمكن بدء محادثة مع حسابك', 400);
  const peer = await getChatParticipant(peerId);
  const service = serviceId ? await findServiceById(serviceId) : null;
  if (serviceId && (!service || ![userId, peerId].includes(service.freelancerId))) {
    throw new AppError('الخدمة غير متاحة لهذه المحادثة', 404);
  }
  if (peer.role === 'Admin') throw new AppError('المستخدم غير متاح للمحادثة', 404);
  return listMessages(userId, peerId, serviceId ?? null);
};

export const sendChatMessage = async (
  senderId: string,
  input: SendMessageInput,
  file?: Express.Multer.File,
): Promise<ChatMessage> => {
  if (!input.content.trim() && !file) throw new AppError('اكتب رسالة أو أرفق ملفًا أولًا.', 400);
  if (input.receiverId === senderId) throw new AppError('لا يمكن إرسال رسالة إلى حسابك', 400);

  const [sender, receiver] = await Promise.all([
    getChatParticipant(senderId),
    getChatParticipant(input.receiverId),
  ]);

  if (sender.role === receiver.role) {
    throw new AppError('يمكن بدء المحادثة بين صاحب الخدمة والعميل فقط', 403);
  }

  const serviceId = input.serviceId ?? null;
  if (serviceId) {
    const service = await findServiceById(serviceId);
    if (
      !service || service.status !== 'active' ||
      ![senderId, input.receiverId].includes(service.freelancerId)
    ) {
      throw new AppError('الخدمة غير متاحة لهذه المحادثة', 404);
    }
  }

  if (scanText(input.content).length > 0) {
    throw new AppError('لحمايتك، لا ترسل أرقام هاتف أو بريد أو روابط تواصل خارج المنصة', 400);
  }

  const attachment = file ? await saveChatAttachment(senderId, file) : undefined;
  let message: ChatMessage;
  try {
    message = await insertMessage({ senderId, receiverId: input.receiverId, serviceId,
      content: input.content.trim() || 'تم إرسال ملف مرفق', attachment });
  } catch (error) {
    if (attachment) await deleteChatAttachment(attachment.storageKey);
    throw error;
  }
  await createUserNotification(input.receiverId, 'NEW_MESSAGE', `رسالة جديدة من ${sender.name}`,
    input.content.slice(0, 180) || (attachment ? `أرفق ملفًا: ${attachment.name}` : 'أرسل رسالة جديدة'),
    `/chat?userId=${encodeURIComponent(senderId)}${serviceId ? `&serviceId=${encodeURIComponent(serviceId)}` : ''}`);
  emitRealtimeEvent(input.receiverId, 'message');
  emitRealtimeEvent(senderId, 'message');
  return message;
};

export const getChatAttachment = async (messageId: string, userId: string) => {
  const attachment = await findAttachmentForParticipant(messageId, userId);
  if (!attachment) throw new AppError('الملف غير موجود أو ليس لديك صلاحية لعرضه.', 404);
  const filePath = resolveChatAttachmentPath(attachment.attachment_storage_key);
  if (!existsSync(filePath)) throw new AppError('الملف لم يعد متاحًا.', 404);
  return { filePath, name: attachment.attachment_name, mimeType: attachment.attachment_mime };
};
