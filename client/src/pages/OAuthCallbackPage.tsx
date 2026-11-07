import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/lib/utils';

export const OAuthCallbackPage = () => {
  const { completeOAuthLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', `${location.pathname}${location.search}`);
    if (window.opener && !window.opener.closed) {
      const provider = location.pathname.includes('github') ? 'github' : 'google';
      const errorCode = searchParams.get(`${provider}_error`);
      window.opener.postMessage({ type: 'mabdeen-oauth', provider, token, error: errorCode }, window.location.origin);
      window.close();
      return;
    }
    if (!token) {
      setError(true);
      return;
    }

    void completeOAuthLogin(token).then((user) => {
      if (!user.profileComplete) {
        navigate('/complete-profile', { replace: true });
        return;
      }
      const returnTo = searchParams.get('returnTo');
      const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : getDashboardPath(user.role);
      navigate(destination, { replace: true });
    }).catch(() => setError(true));
  }, [completeOAuthLogin, location.hash, location.pathname, location.search, navigate, searchParams]);

  if (error) {
    return (
      <main className="container-page flex min-h-[60vh] items-center justify-center py-12" dir="rtl">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <h1 className="text-xl font-extrabold text-slate-950">تعذر إكمال تسجيل الدخول</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">يرجى المحاولة مرة أخرى أو استخدام طريقة تسجيل الدخول المعتادة.</p>
          <Link to="/login" className="btn btn-primary mt-6 w-full">العودة لتسجيل الدخول</Link>
        </section>
      </main>
    );
  }

  return <PageLoader label="جارٍ إكمال تسجيل الدخول..." />;
};

export default OAuthCallbackPage;
