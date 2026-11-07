import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

const optionalText = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(min, message).max(max).optional(),
  );

export const registerSchema = z
  .object({
    name: z
      .string({ error: 'الاسم مطلوب' })
      .trim()
      .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
      .max(100, 'الاسم طويل جداً'),
    email: z
      .string({ error: 'البريد الإلكتروني مطلوب' })
      .trim()
      .email('البريد الإلكتروني غير صالح')
      .max(255, 'البريد الإلكتروني طويل جداً'),
    password: z
      .string({ error: 'كلمة المرور مطلوبة' })
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .refine(
        (value) => Buffer.byteLength(value, 'utf8') <= 72,
        'كلمة المرور طويلة جداً',
      ),
    accountType: z
      .enum(['Freelancer', 'Buyer', 'Parent'], {
        error: (issue) => issue.input === undefined ? 'نوع الحساب مطلوب' : 'نوع الحساب غير صالح',
      })
      .default('Freelancer'),
    title: optionalText(2, 120, 'المسمى الوظيفي قصير جداً'),
    location: optionalText(1, 120, 'المحافظة مطلوبة'),
  })
  .superRefine((value, context) => {
    if (value.accountType !== 'Freelancer') {
      return;
    }

    if (!value.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'المسمى الوظيفي مطلوب',
      });
    }

    if (!value.location) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'المحافظة مطلوبة',
      });
    }
  });

export const loginSchema = z.object({
  email: z
    .string({ error: 'البريد الإلكتروني مطلوب' })
    .trim()
    .email('البريد الإلكتروني غير صالح'),
  password: z
    .string({ error: 'كلمة المرور مطلوبة' })
    .min(1, 'كلمة المرور مطلوبة'),
});

const optionalPhone = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .max(24, 'رقم الهاتف طويل جداً')
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .pipe(z.string().regex(/^\+?\d{7,15}$/, 'رقم الهاتف غير صالح'))
    .optional(),
);

export const accountProfileSchema = z.object({
  name: z
    .string({ error: 'الاسم مطلوب' })
    .trim()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم طويل جداً')
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100, 'الاسم طويل جداً')),
  phone: optionalPhone,
  whatsappNumber: optionalPhone,
  isPrivate: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'كلمة المرور الحالية مطلوبة' }).min(1, 'كلمة المرور الحالية مطلوبة'),
    newPassword: z
      .string({ error: 'كلمة المرور الجديدة مطلوبة' })
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'كلمة المرور طويلة جداً'),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AccountProfileInput = z.infer<typeof accountProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
