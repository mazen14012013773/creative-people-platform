import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

const notificationReason = z
  .string({ error: 'سبب الإجراء مطلوب للتوثيق' })
  .trim()
  .min(5, 'سبب الإجراء يجب أن يكون 5 أحرف على الأقل')
  .max(300, 'سبب الإجراء طويل جداً')
  .transform(sanitizePlainText);

export const createNotificationSchema = z.object({
  title: z.string().trim().transform(sanitizePlainText).pipe(z.string().min(3).max(120)),
  message: z.string().trim().transform(sanitizePlainText).pipe(z.string().min(3).max(1000)),
  reason: notificationReason,
});

export const updateNotificationSchema = z.object({
  isActive: z.boolean(),
  reason: notificationReason,
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
