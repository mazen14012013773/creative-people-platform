import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

const text = (min: number, max: number, label: string) => z.string().trim()
  .min(min, `${label} قصير جداً`)
  .max(max, `${label} طويل جداً`)
  .transform(sanitizePlainText)
  .pipe(z.string().min(min).max(max));

const safeMediaUrl = z.string().trim().refine((value) => {
  if (value.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch { return false; }
}, 'رابط الوسيط غير صالح');
const safeSourceUrl = z.string().trim().min(1).max(2048)
  .transform((value) => /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`)
  .pipe(z.string().url())
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
    } catch { return false; }
  }, 'أدخل رابط ويب يبدأ بـ http:// أو https://');
const mediaSchema = z.array(z.discriminatedUnion('type', [
  z.object({ url: safeMediaUrl, type: z.literal('image') }),
  z.object({ url: safeMediaUrl, type: z.literal('video') }),
  z.object({ url: safeSourceUrl, type: z.literal('link') }),
])).max(12).optional();
const sourcesSchema = z.array(z.object({ title: text(1, 80, 'اسم المصدر'), url: safeSourceUrl })).max(20).optional();
const price = z.number().finite().min(0).max(1_000_000).optional();

export const serviceListQuerySchema = z.object({
  freelancerId: z.string().uuid('معرف المستقل غير صالح').optional(),
});

export const serviceCreateSchema = z.object({
  title: text(3, 100, 'عنوان الخدمة'),
  description: text(10, 1500, 'وصف الخدمة'),
  price,
  category: text(2, 80, 'التصنيف'),
  media: mediaSchema,
  sources: sourcesSchema,
});

export const serviceUpdateSchema = serviceCreateSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
}).refine((value) => Object.keys(value).length > 0, 'أدخل حقلاً واحداً على الأقل للتعديل');

export const serviceIdSchema = z.object({
  id: z.string().uuid('معرف الخدمة غير صالح'),
});

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
