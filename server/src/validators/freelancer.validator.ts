import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';
import {
  emptyStringToUndefined,
  optionalNumberQuerySchema,
  optionalStringQuerySchema,
  paginationSchema,
  uuidArraySchema,
  imageUrlSchema,
} from './common.validator';

export const booleanQuerySchema = z.preprocess((value) => {
  if (value === '1' || value === 'yes') return 'true';
  if (value === '0' || value === 'no') return 'false';
  return emptyStringToUndefined(value);
}, z.enum(['true', 'false']).transform((value) => value === 'true').optional());

export const freelancerQuerySchema = paginationSchema.extend({
  q: optionalStringQuerySchema(100),
  skill: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid('معرف المهارة غير صالح').optional(),
  ),
  location: optionalStringQuerySchema(120),
  governorate: optionalStringQuerySchema(120),
  budget: optionalNumberQuerySchema,
  minBudget: optionalNumberQuerySchema,
  maxBudget: optionalNumberQuerySchema,
  featured: booleanQuerySchema,
  available: booleanQuerySchema,
  verified: booleanQuerySchema,
  minRating: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().min(0).max(5).optional(),
  ),
  maxResponseHours: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(168).optional(),
  ),
  sort: z.preprocess(
    emptyStringToUndefined,
    z.enum(['featured', 'newest', 'rating', 'budget_low', 'response']).optional(),
  ),
});

const cleanText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} قصير جداً`)
    .max(max, `${label} طويل جداً`)
    .transform(sanitizePlainText)
    .pipe(z.string().min(min).max(max));

const optionalCleanText = (max: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(max).transform(sanitizePlainText).nullable().optional(),
  );

export const updateProfileShape = {
  name: z.preprocess(
    emptyStringToUndefined,
    cleanText(2, 100, 'الاسم').optional(),
  ),
  bio: optionalCleanText(2000),
  title: optionalCleanText(120),
  location: optionalCleanText(120),
  minBudget: z.number().min(0).nullable().optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
  avatarUrl: z.preprocess(emptyStringToUndefined, imageUrlSchema.nullable().optional()),
  isAvailable: z.boolean().optional(),
  skillIds: uuidArraySchema.optional(),
};

export const updateProfileSchema = z
  .object(updateProfileShape)
  .refine((data) => Object.keys(data).length > 0, {
    message: 'لا توجد بيانات للتحديث',
  });

export const featuredFreelancersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export const createReviewSchema = z.object({
  orderId: z.string().uuid('اختر طلبًا مكتملًا لتقييمه'),
  rating: z.coerce
    .number({ error: 'التقييم مطلوب' })
    .int('التقييم يجب أن يكون رقماً صحيحاً')
    .min(1, 'التقييم من 1 إلى 5')
    .max(5, 'التقييم من 1 إلى 5'),
  comment: z
    .preprocess(
      emptyStringToUndefined,
      z.string().trim().max(1000, 'التعليق طويل جداً').transform(sanitizePlainText).pipe(z.string().max(1000)).optional(),
    ),
});

export const createReportSchema = z.object({
  reason: z
    .string({ error: 'سبب البلاغ مطلوب' })
    .trim()
    .min(10, 'يرجى كتابة سبب واضح للبلاغ')
    .max(1000, 'سبب البلاغ طويل جداً'),
});

export type FreelancerQueryInput = z.infer<typeof freelancerQuerySchema>;
export type FeaturedFreelancersQueryInput = z.infer<typeof featuredFreelancersQuerySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
