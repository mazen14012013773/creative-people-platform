import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

export const chatPeerParamsSchema = z.object({
  peerId: z.string().uuid('معرف المستخدم غير صالح'),
});

export const chatMessagesQuerySchema = z.object({
  serviceId: z.string().uuid('معرف الخدمة غير صالح').optional(),
});

export const sendMessageSchema = z.object({
  receiverId: z.string().uuid('معرف المستلم غير صالح'),
  serviceId: z.string().uuid('معرف الخدمة غير صالح').nullable().optional(),
  content: z.string().trim().max(2000).optional().default('')
    .transform(sanitizePlainText)
    .pipe(z.string().trim().max(2000)),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
