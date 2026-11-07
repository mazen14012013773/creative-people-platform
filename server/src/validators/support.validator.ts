import { z } from 'zod';
import { adminPaginationSchema, optionalStringQuerySchema } from './common.validator';
import { sanitizePlainText } from '../utils/sanitize';

export const supportTicketParamsSchema = z.object({ id: z.string().uuid() });
export const adminSupportTicketsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  status: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['OPEN', 'CLOSED']).optional(),
  ),
});
export const supportMessageParamsSchema = z.object({ id: z.string().uuid(), messageId: z.string().uuid() });
export const supportTicketCreateSchema = z.object({
  subject: z.string().trim().min(3).max(120).transform(sanitizePlainText),
  message: z.string().trim().max(4000).transform(sanitizePlainText).optional().default(''),
});
export const supportMessageSchema = z.object({
  message: z.string().trim().max(4000).transform(sanitizePlainText).optional().default(''),
});
export const supportTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
  reason: z
    .string({ error: 'سبب تغيير حالة التذكرة مطلوب للتوثيق' })
    .trim()
    .min(5, 'سبب الإجراء يجب أن يكون 5 أحرف على الأقل')
    .max(300, 'سبب الإجراء طويل جداً')
    .transform(sanitizePlainText),
});

export type AdminSupportTicketsQueryInput = z.infer<typeof adminSupportTicketsQuerySchema>;
