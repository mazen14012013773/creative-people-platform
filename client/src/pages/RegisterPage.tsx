import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import {
  Briefcase,
  Eye,
  EyeOff,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InlineLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EGYPT_GOVERNORATES } from '@/lib/constants';
import { cn, getDashboardPath } from '@/lib/utils';
import { registerSchema, type RegisterFormValues } from '@/lib/validation';
import { getErrorMessage } from '@/services/api';

const ACCOUNT_TYPES = [
  {
    value: 'Freelancer' as const,
    title: 'مستقل',
    description: 'أعرض مهاراتي وأستقبل العملاء',
    icon: Briefcase,
  },
  {
    value: 'Buyer' as const,
    title: 'مشتري خدمة',
    description: 'أبحث عن مستقل لمشروعي وخدمتي',
    icon: ShoppingBag,
  },
  {
    value: 'Parent' as const,
    title: 'ولي أمر',
    description: 'اربط حساب طفلك وتابع إنجازاته بموافقته',
    icon: HeartHandshake,
  },
];

export const RegisterPage = () => {
  useDocumentTitle('إنشاء حساب');

  const { user, isLoading, register: registerUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { from?: string } | null)?.from;
  const [searchParams] = useSearchParams();
  const initialAccountType = searchParams.get('type') === 'parent'
    ? 'Parent'
    : searchParams.get('type') === 'buyer' ? 'Buyer' : 'Freelancer';
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailConflict, setEmailConflict] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: initialAccountType,
      title: '',
      location: '',
      acceptTerms: false as unknown as true,
    },
  });

  const accountType = watch('accountType');
  const isFreelancer = accountType === 'Freelancer';

  if (!isLoading && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    setEmailConflict(false);

    try {
      const createdUser = await registerUser({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        accountType: values.accountType,
        title: isFreelancer ? values.title?.trim() : undefined,
        location: isFreelancer ? values.location?.trim() : undefined,
      });
      toast.success('\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0646\u062c\u0627\u062d.');
      navigate(returnPath || getDashboardPath(createdUser.role), { replace: true });
    } catch (error) {
      const duplicateEmail = axios.isAxiosError(error) && error.response?.status === 409;
      setEmailConflict(duplicateEmail);
      setServerError(duplicateEmail
        ? '\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0645\u0633\u062c\u0644 \u0645\u0646 \u0642\u0628\u0644. \u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0647 \u0623\u0648 \u0627\u0633\u062a\u062e\u062f\u0645 \u0628\u0631\u064a\u062f\u064b\u0627 \u0622\u062e\u0631.'
        : getErrorMessage(error, '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628'));
    }
  });

  return (
    <AuthLayout
      mode={isFreelancer ? 'freelancer' : 'buyer'}
      title="أنشئ حسابك المجاني"
      subtitle={
        isFreelancer
          ? 'اعرض مهاراتك وأعمالك، واستقبل تواصل العملاء مباشرة بدون وسيط أو عمولة.'
          : 'ابحث عن المستقل المناسب، احفظ المفضلين، وتواصل معهم مباشرة بدون رسوم.'
      }
      footer={
        <p>
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-extrabold text-brand-700 hover:text-brand-900">
            سجّل الدخول
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {serverError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <p>{serverError}</p>
            {emailConflict ? <Link to={`/login?email=${encodeURIComponent(watch('email').trim())}`} className="mt-2 inline-flex font-extrabold text-cyan-800 underline underline-offset-2">{'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f'}</Link> : null}
          </div>
        ) : null}

        <fieldset>
          <legend className="label">نوع الحساب</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {ACCOUNT_TYPES.map((type) => {
              const active = accountType === type.value;

              return (
                <label
                  key={type.value}
                  className={cn(
                    'relative cursor-pointer rounded-2xl border p-4 transition duration-200',
                    active
                      ? 'border-brand-500 bg-brand-50/80 shadow-sm ring-4 ring-brand-500/10'
                      : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/30',
                  )}
                >
                  <input
                    type="radio"
                    value={type.value}
                    className="sr-only"
                    {...register('accountType')}
                  />
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-xl transition',
                      active
                        ? 'bg-brand-700 text-white'
                        : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <type.icon className="size-5" />
                  </span>
                  <span className="mt-3 block text-sm font-extrabold text-slate-950">
                    {type.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-5 text-slate-500">
                    {type.description}
                  </span>
                  {active ? (
                    <Sparkles className="absolute inset-e-3 top-3 size-4 text-brand-600" />
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="register-name" className="label">
              الاسم الكامل
            </label>
            <input
              id="register-name"
              className="input"
              placeholder="مثال: محمد أحمد"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
          </div>

          <div>
            <label htmlFor="register-email" className="label">
              البريد الإلكتروني
            </label>
            <input
              id="register-email"
              type="email"
              dir="ltr"
              className="input text-start"
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="register-password" className="label">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="input pe-10"
                placeholder="8 أحرف على الأقل"
                autoComplete="new-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-e-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="field-error">{errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-confirm" className="label">
              تأكيد كلمة المرور
            </label>
            <input
              id="register-confirm"
              type={showPassword ? 'text' : 'password'}
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="field-error">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </div>

        {isFreelancer ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-title" className="label">
                المسمى الوظيفي
              </label>
              <input
                id="register-title"
                className="input"
                placeholder="مثال: مصمم واجهات مستخدم"
                {...register('title')}
              />
              {errors.title ? <p className="field-error">{errors.title.message}</p> : null}
            </div>

            <div>
              <label htmlFor="register-location" className="label">
                المحافظة
              </label>
              <select id="register-location" className="input" {...register('location')}>
                <option value="">اختر المحافظة</option>
                {EGYPT_GOVERNORATES.map((governorate) => (
                  <option key={governorate} value={governorate}>
                    {governorate}
                  </option>
                ))}
              </select>
              {errors.location ? (
                <p className="field-error">{errors.location.message}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <label className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-brand-700"
            {...register('acceptTerms')}
          />
          <span>
            أوافق على{' '}
            <Link
              to="/terms"
              target="_blank"
              className="font-extrabold text-brand-700 underline-offset-2 hover:underline"
            >
              شروط الاستخدام وإخلاء المسؤولية
            </Link>
            ، وأتحمل مسؤولية صحة بياناتي والاتفاقات التي أعقدها.
          </span>
        </label>
        {errors.acceptTerms ? (
          <p className="field-error">{errors.acceptTerms.message}</p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoader label="جارٍ إنشاء الحساب..." />
          ) : (
            <>
              <UserPlus className="size-4" />
              إنشاء حساب {isFreelancer ? 'مستقل' : accountType === 'Parent' ? 'ولي أمر' : 'مشتري'}
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};
