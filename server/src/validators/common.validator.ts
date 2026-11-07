import { z } from 'zod';

export const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
};

const NULL_SENTINELS = ['', 'null', 'undefined'];

/** Turns form empties (`''`, `'null'`) into a real nullable value. */
export const nullableField = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && NULL_SENTINELS.includes(value.trim())) {
      return null;
    }

    return value;
  }, schema.nullable().optional());

/** Accepts `datetime-local` values (YYYY-MM-DDTHH:mm) or full ISO strings. */
export const flexibleDateTimeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (NULL_SENTINELS.includes(trimmed)) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}(:\d{2})?$/.test(trimmed)) {
    const parsed = new Date(trimmed.length === 16 ? `${trimmed}:00` : trimmed);

    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }

  return trimmed;
}, z.iso.datetime({ offset: true }).nullable());

export const imageUrlSchema = z
  .string()
  .trim()
  .max(500, 'رابط الصورة طويل جداً')
  .refine((value) => {
    return (
      z.string().url().safeParse(value).success ||
      value.startsWith('/uploads/')
    );
  }, 'رابط الصورة غير صالح');

export const optionalTextSchema = (max: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(max).optional(),
  );

export const optionalStringQuerySchema = (max = 120) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(max).optional(),
  );

export const optionalNumberQuerySchema = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().min(0).optional(),
);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminPaginationInput = z.infer<typeof adminPaginationSchema>;

export const uuidParamSchema = z.object({
  id: z.string().uuid('المعرف غير صالح'),
});

export const uuidArraySchema = z
  .array(z.string().uuid('معرف المهارة غير صالح'))
  .max(20, 'يمكن اختيار 20 مهارة كحد أقصى')
  .transform((values) => Array.from(new Set(values)));
