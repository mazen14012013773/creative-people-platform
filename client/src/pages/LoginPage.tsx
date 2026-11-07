import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InlineLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getDashboardPath } from '@/lib/utils';
import { loginSchema, type LoginFormValues } from '@/lib/validation';
import { getErrorMessage } from '@/services/api';

export const LoginPage = () => {
  useDocumentTitle('تسجيل الدخول');

  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnPath = (location.state as { from?: string } | null)?.from;
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get('email') ?? '', password: '' },
  });

  if (!isLoading && user) {
    return <Navigate to={returnPath || getDashboardPath(user.role)} replace />;
  }

  const submit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const result = await login(values);
      navigate(returnPath || getDashboardPath(result.user.role), { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'تعذر تسجيل الدخول'));
    }
  });

  return (
    <AuthLayout
      mode="any"
      title="مرحباً بعودتك"
      subtitle="سجّل الدخول لإدارة حسابك، ومتابعة بروفايلك، والوصول إلى المستقلين المحفوظين."
      footer={
        <p>
          ليس لديك حساب؟{' '}
          <Link to={returnPath?.startsWith('/chat?userId=') ? '/register?type=buyer' : '/register'} state={{ from: returnPath }} className="font-extrabold text-brand-700 hover:text-brand-900">
            أنشئ حساباً مجانياً كمستقل أو مشتري أو ولي أمر
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {serverError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {serverError}
          </div>
        ) : null}

        <div>
          <label htmlFor="login-email" className="label">
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="login-password" className="label">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pe-11"
              placeholder="••••••••"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-e-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-700"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {errors.password ? (
            <p className="field-error">{errors.password.message}</p>
          ) : null}
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoader label="جارٍ تسجيل الدخول..." />
          ) : (
            <>
              <LogIn className="size-4" />
              تسجيل الدخول
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};
