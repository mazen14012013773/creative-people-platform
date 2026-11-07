import { z } from 'zod';

export const accountReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reasonCategory: z.enum(['FRAUD', 'INAPPROPRIATE', 'IMPERSONATION', 'NONCOMPLIANCE', 'OTHER']),
  description: z.string().trim().min(10).max(4000),
});

export const accountReportActionSchema = z.object({
  action: z.enum(['TEMP_BLOCK', 'PERMANENT_BLOCK', 'WARNING', 'DISMISS']),
  notes: z
    .string({ error: 'ملاحظات القرار مطلوبة للتوثيق' })
    .trim()
    .min(5, 'سبب القرار يجب أن يكون 5 أحرف على الأقل')
    .max(2000, 'سبب القرار طويل جداً'),
});

export const accountReportQuerySchema = z.object({
  status: z.enum(['PENDING', 'RESOLVED', 'DISMISSED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
