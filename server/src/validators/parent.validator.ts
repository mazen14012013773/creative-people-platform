import { z } from 'zod';
import { adminPaginationSchema } from './common.validator';
import { sanitizePlainText } from '../utils/sanitize';

export const adminParentVerificationsQuerySchema = adminPaginationSchema;

export const parentLinkRequestSchema = z.object({ childEmail: z.string().trim().email().max(255) });
export const parentLinkResponseSchema = z.object({ linkId: z.string().uuid(), status: z.enum(['APPROVED', 'REJECTED']) });
export const legacyChatAccessApprovalSchema = z.object({ linkId: z.string().uuid() });
export const parentChildParamsSchema = z.object({ childId: z.string().uuid() });
export const parentChildDisplaySchema = z.object({
  displayName: z.string().trim().max(80).transform((value) => value ? sanitizePlainText(value) : null).optional(),
});
export const parentChildMessagesParamsSchema = z.object({ childId: z.string().uuid(), peerId: z.string().uuid() });
export const parentChildAttachmentParamsSchema = z.object({ childId: z.string().uuid(), messageId: z.string().uuid() });
export const parentVerificationStartSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) });
export const parentVerificationTokenSchema = z.object({ token: z.string().trim().regex(/^[a-f0-9-]{60,80}$/i, 'رابط التحقق غير صالح') });
export const parentVerificationApprovalSchema = parentVerificationTokenSchema.extend({
  mathAnswer: z.coerce.number({ error: 'أدخل إجابة المسألة الحسابية' }).int('الإجابة يجب أن تكون رقمًا صحيحًا').min(0).max(1000),
});
export const parentVerificationReviewSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().max(300).optional().transform((value) => value ? sanitizePlainText(value) : undefined),
});
export type ParentLinkRequestInput = z.infer<typeof parentLinkRequestSchema>;
export type AdminParentVerificationsQueryInput = z.infer<typeof adminParentVerificationsQuerySchema>;
