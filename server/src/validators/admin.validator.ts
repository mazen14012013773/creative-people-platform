import { z } from 'zod';
import {
  adminPaginationSchema,
  emptyStringToUndefined,
  flexibleDateTimeSchema,
  optionalStringQuerySchema,
} from './common.validator';
import { booleanQuerySchema, updateProfileShape } from './freelancer.validator';

export const adminUsersQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  role: z.preprocess(
    emptyStringToUndefined,
    z.enum(['Freelancer', 'Buyer', 'Parent', 'Admin']).optional(),
  ),
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['active', 'inactive']).optional(),
  ),
  featured: booleanQuerySchema,
  verified: booleanQuerySchema,
});

export const adminImpersonateSchema = z.object({
  reason: z.string().trim().min(10).max(300),
});

export const adminReportsQuerySchema = adminPaginationSchema.extend({
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['PENDING', 'RESOLVED', 'DISMISSED']).optional(),
  ),
});

export const adminReviewsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
});

export const adminConversationsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
});

export const adminOrdersQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['PENDING', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'AWAITING_REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  ),
});

export const forceOrderActionSchema = z.object({
  action: z.enum(['CANCEL', 'CLOSE'], { error: 'إجراء الطلب مطلوب' }),
  reason: z
    .string({ error: 'سبب التحكيم مطلوب' })
    .trim()
    .min(10, 'سبب التحكيم يجب أن يكون 10 أحرف على الأقل')
    .max(500, 'سبب التحكيم طويل جداً'),
  grantCompletionPoints: z.boolean().optional().default(false),
});


export const adminConversationMessagesParamsSchema = z.object({
  participantAId: z.string().uuid(),
  participantBId: z.string().uuid(),
}).refine((params) => params.participantAId !== params.participantBId, {
  message: 'Conversation participants must be different',
});

export const adminConversationMessagesQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  reason: z.string().trim().min(5).max(300),
});

export const adminAuditQuerySchema = adminPaginationSchema.extend({
  adminId: z.preprocess(emptyStringToUndefined, z.string().uuid().optional()),
  entityId: optionalStringQuerySchema(80),
  action: optionalStringQuerySchema(80),
  from: flexibleDateTimeSchema.optional(),
  to: flexibleDateTimeSchema.optional(),
});

const auditReason = z
  .string({ error: 'سبب الإجراء مطلوب للتوثيق' })
  .trim()
  .min(5, 'سبب الإجراء يجب أن يكون 5 أحرف على الأقل')
  .max(300, 'سبب الإجراء طويل جداً');

const booleanFlagQuerySchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
);

/* ------------------- God-mode inspection (chat / orders) ------------------- */

export const adminInspectionConversationsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  kind: z.preprocess(emptyStringToUndefined, z.enum(['direct', 'order']).optional()),
  userId: z.preprocess(emptyStringToUndefined, z.string().uuid().optional()),
  from: flexibleDateTimeSchema.optional(),
  to: flexibleDateTimeSchema.optional(),
});

export const adminInspectionConversationParamsSchema = z.object({
  id: z.string().trim().min(8).max(512),
});

export const adminInspectionConversationQuerySchema = z.object({
  reason: auditReason,
});

export const adminChatAttachmentParamsSchema = z.object({
  messageId: z.string().uuid(),
});

export const adminChatAttachmentQuerySchema = z.object({
  reason: auditReason,
  download: booleanFlagQuerySchema,
});

export const adminVaultFilesQuerySchema = z.object({
  reason: auditReason.optional(),
});

export const adminVaultFileParamsSchema = z.object({
  id: z.string().uuid(),
  deliveryId: z.string().uuid(),
});

export const adminVaultFileQuerySchema = z.object({
  reason: auditReason,
  download: booleanFlagQuerySchema,
});

export const adminOrderTranscriptQuerySchema = z.object({
  reason: auditReason,
});

export const adminUserDossierParamsSchema = z.object({
  id: z.string().uuid(),
});

/* ----------------------- Content & services control ----------------------- */

export const adminContentServicesQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  status: z.preprocess(emptyStringToUndefined, z.enum(['active', 'inactive']).optional()),
});

export const adminContentServiceUpdateSchema = z
  .object({
    title: z.string().trim().min(3, 'عنوان الخدمة قصير جداً').max(120).optional(),
    description: z.string().trim().min(10, 'وصف الخدمة قصير جداً').max(5000).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    price: z.number({ error: 'السعر يجب أن يكون رقماً' }).min(0).max(1_000_000).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    isFeatured: z.boolean().optional(),
    featuredUntil: flexibleDateTimeSchema.optional(),
    reason: auditReason,
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'reason'), {
    message: 'لا توجد بيانات للتحديث',
  });

export const adminContentPortfolioQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
});

export const adminContentPortfolioUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    imageUrl: z.union([z.string().trim().max(500), z.null()]).optional(),
    projectUrl: z.union([z.string().trim().url('رابط المشروع غير صالح').max(500), z.null()]).optional(),
    reason: auditReason,
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'reason'), {
    message: 'لا توجد بيانات للتحديث',
  });

export const adminContentPostsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  status: z.preprocess(emptyStringToUndefined, z.enum(['PUBLISHED', 'DRAFT']).optional()),
});

export const adminContentPostStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'DRAFT'], { error: 'حالة المنشور مطلوبة' }),
  reason: auditReason,
});

export const adminContentCommentsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
});

export const adminContentArticlesQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['PUBLISHED', 'HIDDEN']).optional(),
  ),
});

export const adminContentArticleUpdateSchema = z
  .object({
    title: z.string().trim().min(3, 'عنوان المقال قصير جداً').max(200).optional(),
    excerpt: z.string().trim().min(10, 'المقتطف قصير جداً').max(500).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    coverImage: z.union([z.string().trim().max(500), z.null()]).optional(),
    status: z.enum(['PUBLISHED', 'HIDDEN']).optional(),
    reason: auditReason,
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'reason'), {
    message: 'لا توجد بيانات للتحديث',
  });

export const adminSkillCreateSchema = z.object({
  name: z.string().trim().min(2, 'اسم المهارة قصير جداً').max(60, 'اسم المهارة طويل جداً'),
  reason: auditReason,
});

export const adminSkillUpdateSchema = z.object({
  name: z.string().trim().min(2, 'اسم المهارة قصير جداً').max(60, 'اسم المهارة طويل جداً'),
  reason: auditReason,
});

export const adminAuditReasonBodySchema = z.object({
  reason: auditReason,
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ error: 'حالة الحساب مطلوبة' }),
  expectedIsActive: z.boolean().optional(),
  reason: auditReason,
});

export const updateUserFeaturedSchema = z.object({
  isFeatured: z.boolean({ error: 'حالة التمييز مطلوبة' }),
  featuredUntil: flexibleDateTimeSchema.optional(),
  reason: auditReason,
});

export const updateUserVerifiedSchema = z.object({
  isVerified: z.boolean({ error: 'حالة التوثيق مطلوبة' }),
  reason: auditReason,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['Freelancer', 'Buyer', 'Parent', 'Admin'], { error: 'الدور مطلوب' }),
  reason: auditReason,
});

export const manageUserSchema = z
  .object({
    ...updateProfileShape,
    avgResponseHours: z.preprocess(
      (value) => (value === '' ? null : value),
      z.number({ error: 'المتوسط بالساعات يجب أن يكون رقماً' }).min(0).max(168).nullable().optional(),
    ),
    reason: auditReason,
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'reason'), {
    message: 'لا توجد بيانات للتحديث',
  });

export const adminSetPasswordSchema = z.object({
  password: z
    .string({ error: 'كلمة المرور مطلوبة' })
    .min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل')
    .max(120, 'كلمة المرور طويلة جداً'),
  reason: auditReason,
});

export const updateReportSchema = z.object({
  status: z.enum(['Pending', 'Resolved', 'Dismissed'], {
    error: 'حالة البلاغ مطلوبة',
  }),
  reason: auditReason,
});

export type AdminUsersQueryInput = z.infer<typeof adminUsersQuerySchema>;
export type AdminReportsQueryInput = z.infer<typeof adminReportsQuerySchema>;
export type AdminReviewsQueryInput = z.infer<typeof adminReviewsQuerySchema>;
export type AdminConversationsQueryInput = z.infer<typeof adminConversationsQuerySchema>;
export type AdminOrdersQueryInput = z.infer<typeof adminOrdersQuerySchema>;
export type ForceOrderActionInput = z.infer<typeof forceOrderActionSchema>;
export type AdminAuditQueryInput = z.infer<typeof adminAuditQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserVerifiedInput = z.infer<typeof updateUserVerifiedSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AdminConversationMessagesParamsInput = z.infer<typeof adminConversationMessagesParamsSchema>;
export type AdminConversationMessagesQueryInput = z.infer<typeof adminConversationMessagesQuerySchema>;
export type UpdateUserFeaturedInput = z.infer<typeof updateUserFeaturedSchema>;
export type ManageUserInput = z.infer<typeof manageUserSchema>;
export type AdminInspectionConversationsQueryInput = z.infer<typeof adminInspectionConversationsQuerySchema>;
export type AdminInspectionConversationQueryInput = z.infer<typeof adminInspectionConversationQuerySchema>;
export type AdminChatAttachmentQueryInput = z.infer<typeof adminChatAttachmentQuerySchema>;
export type AdminVaultFilesQueryInput = z.infer<typeof adminVaultFilesQuerySchema>;
export type AdminVaultFileQueryInput = z.infer<typeof adminVaultFileQuerySchema>;
export type AdminOrderTranscriptQueryInput = z.infer<typeof adminOrderTranscriptQuerySchema>;
export type AdminContentServicesQueryInput = z.infer<typeof adminContentServicesQuerySchema>;
export type AdminContentServiceUpdateInput = z.infer<typeof adminContentServiceUpdateSchema>;
export type AdminContentPortfolioQueryInput = z.infer<typeof adminContentPortfolioQuerySchema>;
export type AdminContentPortfolioUpdateInput = z.infer<typeof adminContentPortfolioUpdateSchema>;
export type AdminContentPostsQueryInput = z.infer<typeof adminContentPostsQuerySchema>;
export type AdminContentPostStatusInput = z.infer<typeof adminContentPostStatusSchema>;
export type AdminContentCommentsQueryInput = z.infer<typeof adminContentCommentsQuerySchema>;
export type AdminContentArticlesQueryInput = z.infer<typeof adminContentArticlesQuerySchema>;
export type AdminContentArticleUpdateInput = z.infer<typeof adminContentArticleUpdateSchema>;
export type AdminSkillCreateInput = z.infer<typeof adminSkillCreateSchema>;
export type AdminSkillUpdateInput = z.infer<typeof adminSkillUpdateSchema>;
