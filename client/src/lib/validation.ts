import { z } from 'zod';

const urlField = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\/.+\..+/.test(value), message);

const imageField = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        /^https?:\/\/.+\..+/.test(value) ||
        value.startsWith('/uploads/'),
      message,
    );

export const loginSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
    email: z.string().trim().email('البريد الإلكتروني غير صالح'),
    password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string().min(1, 'يرجى تأكيد كلمة المرور'),
    accountType: z.enum(['Freelancer', 'Buyer', 'Parent']),
    title: z.string().trim().optional(),
    location: z.string().trim().optional(),
    acceptTerms: z.literal(true, { error: 'يجب الموافقة على شروط الاستخدام' }),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'كلمتا المرور غير متطابقتين',
      });
    }

    if (values.accountType !== 'Freelancer') {
      return;
    }

    if (!values.title || values.title.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'المسمى الوظيفي مطلوب',
      });
    }

    if (!values.location) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'المحافظة مطلوبة',
      });
    }
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  title: z.string().trim().min(2, 'المسمى الوظيفي مطلوب'),
  bio: z.string().trim().max(2000, 'النبذة طويلة جداً').optional(),
  location: z.string().trim().min(1, 'اختر المحافظة أو المدينة'),
  isAvailable: z.boolean(),
  skillIds: z.array(z.string()).max(20, 'يمكن اختيار 20 مهارة كحد أقصى'),
});

export const portfolioSchema = z.object({
  title: z.string().trim().min(3, 'عنوان المشروع مطلوب'),
  description: z.string().trim().max(1000, 'الوصف طويل جداً').optional(),
  imageUrl: imageField('رابط الصورة غير صالح'),
  projectUrl: urlField('رابط GitHub غير صالح'),
});

export const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'يرجى كتابة سبب واضح للبلاغ (10 أحرف على الأقل)')
    .max(1000, 'سبب البلاغ طويل جداً'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PortfolioFormValues = z.infer<typeof portfolioSchema>;
export type ReportFormValues = z.infer<typeof reportSchema>;
