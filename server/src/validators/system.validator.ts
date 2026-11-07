import { isIP } from 'node:net';
import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';
import {
  adminPaginationSchema,
  flexibleDateTimeSchema,
  optionalStringQuerySchema,
} from './common.validator';

const optionalCleanText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).transform(sanitizePlainText).optional(),
  );

export const systemSettingsSchema = z
  .object({
    maintenanceEnabled: z.boolean().optional(),
    maintenanceMessage: optionalCleanText(300),
    maintenanceReturnsAt: flexibleDateTimeSchema,
    registrationOpen: z.boolean().optional(),
    blockedTerms: z
      .array(z.string().trim().min(2, 'المصطلح قصير جداً').max(40, 'المصطلح طويل جداً'))
      .max(50, 'عدد المصطلحات كبير جداً')
      .optional(),
    reason: z
      .string({ error: 'سبب تعديل الإعدادات مطلوب للتوثيق' })
      .trim()
      .min(5, 'سبب الإجراء يجب أن يكون 5 أحرف على الأقل')
      .max(300, 'سبب الإجراء طويل جداً')
      .transform(sanitizePlainText),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'reason'), {
    message: 'لا توجد إعدادات للتحديث',
  });

const auditReason = z
  .string({ error: 'سبب الإجراء مطلوب للتوثيق' })
  .trim()
  .min(5, 'سبب الإجراء يجب أن يكون 5 أحرف على الأقل')
  .max(300, 'سبب الإجراء طويل جداً')
  .transform(sanitizePlainText);

export const sessionRevokeParamsSchema = z.object({
  id: z.coerce.number().int().positive('معرف الجلسة غير صالح'),
});

export const sessionRevokeSchema = z.object({ reason: auditReason });

export const userSessionsRevokeSchema = z.object({ reason: auditReason });

export const restoreBackupSchema = z.object({ reason: auditReason });

export const ipBlocksQuerySchema = adminPaginationSchema;


export const resetDataSchema = z.object({
  confirmCode: z.literal('RESET_ALL_DATA', { error: 'رمز التأكيد غير صحيح' }),
  reason: auditReason,
});

export const sessionsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(80),
  includeRevoked: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  ),
});

const ipShape = z
  .string({ error: 'عنوان IP مطلوب' })
  .trim()
  .min(3, 'عنوان IP غير صالح')
  .max(45, 'عنوان IP غير صالح')
  .refine((value) => isIP(value) !== 0, 'صيغة عنوان IP غير صحيحة');

export const createIpBlockSchema = z.object({
  ip: ipShape,
  reason: z
    .string({ error: 'سبب الحظر مطلوب' })
    .trim()
    .min(3, 'سبب الحظر قصير جداً')
    .max(200, 'سبب الحظر طويل جداً')
    .transform(sanitizePlainText),
  hours: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().min(1).max(8760).nullable(),
  ),
});

export const ipBlockParamsSchema = z.object({
  ip: ipShape,
});

export const moderationQuerySchema = adminPaginationSchema.extend({
  status: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['Pending', 'Resolved', 'Dismissed']).optional(),
  ),
  severity: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['low', 'medium', 'high']).optional(),
  ),
});

export const moderationActionSchema = z.object({
  action: z.enum(['Resolve', 'Dismiss', 'Reopen'], { error: 'الإجراء غير صالح' }),
  reason: auditReason,
});

export const moderationCleanupSchema = z.object({ reason: auditReason });

export const moderationRescanSchema = z.object({ reason: auditReason });

export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;
export type SessionsQueryInput = z.infer<typeof sessionsQuerySchema>;
export type SessionRevokeParamsInput = z.infer<typeof sessionRevokeParamsSchema>;
export type SessionRevokeInput = z.infer<typeof sessionRevokeSchema>;
export type UserSessionsRevokeInput = z.infer<typeof userSessionsRevokeSchema>;
export type IpBlocksQueryInput = z.infer<typeof ipBlocksQuerySchema>;
export type CreateIpBlockInput = z.infer<typeof createIpBlockSchema>;
export type ModerationQueryInput = z.infer<typeof moderationQuerySchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type ModerationCleanupInput = z.infer<typeof moderationCleanupSchema>;
export type ModerationRescanInput = z.infer<typeof moderationRescanSchema>;
export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;
export type ResetDataInput = z.infer<typeof resetDataSchema>;
