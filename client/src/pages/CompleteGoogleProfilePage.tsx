import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BadgeCheck, BriefcaseBusiness, HeartHandshake, MapPin, UserRound } from 'lucide-react';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EGYPT_GOVERNORATES } from '@/lib/constants';
import { getDashboardPath } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';

export const CompleteGoogleProfilePage = () => {
  useDocumentTitle('إكمال بيانات الحساب');
  const { user, isLoading, completeGoogleProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [accountType, setAccountType] = useState<'Freelancer' | 'Buyer' | 'Parent'>('Freelancer');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  if (isLoading) return <PageLoader label="جارٍ التحقق من الحساب..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.profileComplete) return <Navigate to={getDashboardPath(user.role)} replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const updatedUser = await completeGoogleProfile({
        name,
        accountType,
        ...(accountType === 'Freelancer' ? { title, location } : {}),
      });
      navigate(getDashboardPath(updatedUser.role), { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'تعذر حفظ بيانات الحساب'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <main className="container-page flex min-h-[75vh] items-center justify-center py-10" dir="rtl">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-9">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <BadgeCheck className="size-7" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-extrabold text-slate-950">أكمل بيانات حسابك</h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm leading-7 text-slate-600">
          تم إنشاء حسابك باستخدام Google. اختر نوع الحساب وأكمل البيانات المطلوبة للمتابعة.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="google-profile-name" className="label">الاسم</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input id="google-profile-name" className="input ps-10" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required />
            </div>
          </div>

          <fieldset>
            <legend className="label">نوع الحساب</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${accountType === 'Freelancer' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="accountType" value="Freelancer" checked={accountType === 'Freelancer'} onChange={() => setAccountType('Freelancer')} />
                <BriefcaseBusiness className="size-4 text-brand-700" />
                <span className="text-sm font-bold">مستقل</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${accountType === 'Buyer' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="accountType" value="Buyer" checked={accountType === 'Buyer'} onChange={() => setAccountType('Buyer')} />
                <UserRound className="size-4 text-brand-700" />
                <span className="text-sm font-bold">عميل</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${accountType === 'Parent' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="accountType" value="Parent" checked={accountType === 'Parent'} onChange={() => setAccountType('Parent')} />
                <HeartHandshake className="size-4 text-brand-700" />
                <span className="text-sm font-bold">ولي أمر</span>
              </label>
            </div>
          </fieldset>

          {accountType === 'Freelancer' ? (
            <>
              <div>
                <label htmlFor="google-profile-title" className="label">المسمى المهني</label>
                <input id="google-profile-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={120} placeholder="مثال: مصمم واجهات" required />
              </div>
              <div>
                <label htmlFor="google-profile-location" className="label">المحافظة أو المدينة</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <select id="google-profile-location" className="input ps-10" value={location} onChange={(event) => setLocation(event.target.value)} required>
                    <option value="">اختر المحافظة</option>
                    {EGYPT_GOVERNORATES.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : null}

          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
            {isSaving ? 'جارٍ حفظ البيانات...' : 'حفظ ومتابعة'}
          </button>
        </form>
        </section>
      </main>
    </>
  );
};

export default CompleteGoogleProfilePage;
