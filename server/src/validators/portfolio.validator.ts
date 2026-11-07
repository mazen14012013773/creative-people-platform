import { z } from 'zod';
import { emptyStringToUndefined, imageUrlSchema } from './common.validator';
import { sanitizePlainText } from '../utils/sanitize';

export const createPortfolioSchema = z
  .object({
    title: z
      .string({ error: 'عنوان المشروع مطلوب' })
      .trim()
      .min(3, 'العنوان قصير جداً')
      .max(120, 'العنوان طويل جداً').transform(sanitizePlainText).pipe(z.string().min(3).max(120)),
    description: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(1000, 'الوصف طويل جداً').transform(sanitizePlainText).pipe(z.string().max(1000)).optional(),
    ),
    imageUrl: z.preprocess(
      emptyStringToUndefined,
      imageUrlSchema.optional(),
    ),
    projectUrl: z.preprocess(
      emptyStringToUndefined,
      z.string().url('رابط GitHub غير صالح').max(500).optional(),
    ),
  });

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
