import { Construction, RefreshCw, ShieldCheck, Timer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate, formatNumber } from '@/lib/utils';
import type { SystemStatus } from '@/types';

const remaining = (iso: string): string | null => {
  const diffMs = new Date(iso).getTime() - Date.now();

  if (diffMs <= 0) {
    return null;
  }

  const minutes = Math.ceil(diffMs / 60_000);

  if (minutes < 60) {
    return `يعود الموقع خلال ${formatNumber(minutes)} دقيقة`;
  }

  const hours = Math.ceil(minutes / 60);

  if (hours < 24) {
    return `يعود الموقع خلال ${formatNumber(hours)} ساعة`;
  }

  return `يعود الموقع خلال ${formatNumber(Math.ceil(hours / 24))} يوم`;
};

const formatClock = (iso: string): string => {
  return new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

interface MaintenancePageProps {
  status: SystemStatus;
  onRetry: () => void;
}

export const MaintenancePage = ({ status, onRetry }: MaintenancePageProps) => {
  useDocumentTitle('جارٍ الصيانة');
  const [checking, setChecking] = useState(false);
  const { user } = useAuth();
  const countdown = status.maintenanceReturnsAt
    ? remaining(status.maintenanceReturnsAt)
    : null;

  const retry = () => {
    setChecking(true);
    onRetry();
    window.setTimeout(() => setChecking(false), 1200);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-16 text-slate-900">
      <div className="pointer-events-none absolute -inset-e-24 -top-24 size-104 rounded-full bg-amber-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 inset-s-1/4 size-96 rounded-full bg-sky-100/70 blur-3xl" />

      <div className="relative w-full max-w-2xl animate-fade-up rounded-4xl border border-slate-100 bg-white p-7 text-center shadow-xl shadow-slate-200/50 sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
          <Construction className="size-8" />
        </div>

        <div className="mt-6 flex justify-center">
          <Logo className="justify-center" />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold leading-snug sm:text-4xl">
          المنصة قيد الصيانة الدورية
        </h1>

        <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm leading-8 text-slate-600 sm:text-base">
          {status.maintenanceMessage}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
            <Timer className="size-4 text-amber-500" />
            وقت الخادم: {formatClock(status.serverTime)}
          </span>
          {status.maintenanceReturnsAt ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
              <Construction className="size-4 text-amber-500" />
              {countdown ?? 'الصيانة على وشك الانتهاء'} — {formatDate(status.maintenanceReturnsAt)}
            </span>
          ) : null}
          {!status.registrationOpen ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
              <ShieldCheck className="size-4 text-amber-500" />
              التسجيل موقوف مؤقتاً
            </span>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={retry} className="btn theme-keep-light bg-white text-brand-900 hover:bg-brand-50">
            {checking ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            تحقّق من عودة الموقع
          </button>
          {user ? null : (
            <Link
              to="/login"
              className="btn btn-secondary"
            >
              تسجيل دخول الحسابات الإدارية
            </Link>
          )}
        </div>

        <p className="mt-7 text-[11px] leading-6 text-slate-400">
          جميع بياناتك ومفضلاتك محفوظة. يعمل فريق مبدعين على إعادة الخدمة في أقرب وقت.
        </p>
      </div>
    </div>
  );
};
