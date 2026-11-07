import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GitHubAuthButton } from '@/components/auth/GitHubAuthButton';
import { InlineLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getDashboardPath } from '@/lib/utils';
import { loginSchema, type LoginFormValues } from '@/lib/validation';
import { getErrorMessage } from '@/services/api';
import { authApi } from '@/services/auth.service';
import { renderGoogleSignInButton } from '@/lib/google-identity';

export const LoginPage = () => {
  useDocumentTitle('تسجيل الدخول');

  const { user, isLoading, login, completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnPath = (location.state as { from?: string } | null)?.from;
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleBusyRef = useRef(false);
  const googleCleanupRef = useRef<(() => void) | null>(null);
  const googleError = searchParams.get('google_error');
  const githubError = searchParams.get('github_error');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get('email') ?? '', password: '' },
  });

  useEffect(() => {
    let active = true;
    const initializeGoogleButton = async () => {
      try {
        if (!googleButtonRef.current) return;
        googleCleanupRef.current = await renderGoogleSignInButton(googleButtonRef.current, async ({ credential }) => {
            if (!credential || googleBusyRef.current) return;
            googleBusyRef.current = true;
            setGooglePending(true);
            setServerError(null);
            try {
              const result = await authApi.googleVerify(credential);
              const googleUser = await completeOAuthLogin(result.token);
              if (!googleUser.profileComplete) {
                navigate('/complete-profile', { replace: true });
              } else {
                navigate(returnPath || getDashboardPath(googleUser.role), { replace: true });
              }
            } catch (error) {
              setServerError(getErrorMessage(error, 'تعذر تسجيل الدخول باستخدام Google'));
            } finally {
              googleBusyRef.current = false;
              setGooglePending(false);
            }
          }, Math.min(400, googleButtonRef.current.clientWidth || 400));
      } catch (error) {
        if (active) setServerError(getErrorMessage(error, 'تعذر تهيئة تسجيل الدخول باستخدام Google'));
      }
    };

    void initializeGoogleButton();
    return () => {
      active = false;
      googleCleanupRef.current?.();
    };
  }, [completeOAuthLogin, navigate, returnPath]);

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
        {googleError ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {googleError === 'cancelled'
              ? 'تم إلغاء تسجيل الدخول باستخدام Google.'
              : googleError === 'invalid_client'
                ? 'إعدادات عميل Google لم تُقبل بعد. إذا أنشأت العميل أو حدّثته للتو، انتظر حتى تكتمل مزامنة الإعدادات ثم أعد المحاولة. إذا استمر الخطأ، انسخ السر الحالي وتأكد أنه تابع لنفس Client ID في server/.env ثم أعد تشغيل السيرفر.'
                : 'تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.'}
          </div>
        ) : null}
        {githubError ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {githubError === 'cancelled' ? 'تم إلغاء تسجيل الدخول باستخدام GitHub.' : githubError === 'configuration' ? 'إعدادات GitHub OAuth غير مقبولة. راجع Client ID وClient Secret وعنوان Callback في إعدادات OAuth App.' : 'تعذر إكمال تسجيل الدخول عبر GitHub. حاول مرة أخرى، وإذا تكرر الخطأ راجع سجل السيرفر.'}
          </div>
        ) : null}
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
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400">أو</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="relative mx-auto flex min-h-12 w-full max-w-[400px] justify-center" dir="ltr" aria-busy={googlePending}>
        <div ref={googleButtonRef} className={googlePending ? 'pointer-events-none opacity-60' : ''} />
        {googlePending ? <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-xs font-bold text-slate-700">جارٍ تسجيل الدخول...</span> : null}
      </div>
      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400">أو</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <GitHubAuthButton returnTo={returnPath} />
    </AuthLayout>
  );
};
