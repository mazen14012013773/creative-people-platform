import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { EyeOff, LockKeyhole, Mail, MessageCircle, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { InlineLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authApi, type AccountProfilePayload } from '@/services/auth.service';
import { getErrorMessage } from '@/services/api';

export const AccountSettingsPage = () => {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ?? '');
    setWhatsappNumber(user.whatsappNumber ?? '');
    setIsPrivate(user.isPrivate);
  }, [user]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || savingProfile) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error('الاسم يجب أن يكون حرفين على الأقل.');
      return;
    }
    const payload: AccountProfilePayload = {
      name: trimmedName,
      phone: phone.trim(),
      whatsappNumber: whatsappNumber.trim(),
    };
    if (user.role === 'Freelancer') payload.isPrivate = isPrivate;
    setSavingProfile(true);
    try {
      await authApi.updateAccount(payload);
      await refreshUser();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['freelancers'] }),
        queryClient.invalidateQueries({ queryKey: ['featured-freelancers'] }),
        queryClient.invalidateQueries({ queryKey: ['freelancer'] }),
      ]);
      toast.success('تم حفظ إعدادات الحساب بنجاح.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر حفظ إعدادات الحساب'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (savingPassword) return;
    if (newPassword.length < 8) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور الجديدتان غير متطابقتين.');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('تم تغيير كلمة المرور. سجّل الدخول مجددًا.');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر تغيير كلمة المرور'));
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
          <ShieldCheck className="size-4" />
          إعدادات الحساب
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-900">بياناتك وأمان حسابك</h1>
        <p className="mt-2 text-sm text-slate-600">حدّث بيانات التواصل، واضبط خصوصية ملفك، وغيّر كلمة المرور بأمان.</p>
      </header>

      <form onSubmit={saveProfile} className="card space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <UserRound className="size-5 text-brand-700" />
          <h2 className="text-lg font-extrabold text-slate-900">بيانات الحساب</h2>
        </div>

        <div>
          <label htmlFor="account-email" className="label flex items-center gap-2">
            <Mail className="size-4 text-slate-400" />
            البريد الإلكتروني
          </label>
          <input id="account-email" value={user.email} dir="ltr" readOnly disabled className="input mt-1.5 cursor-not-allowed bg-slate-50 text-left text-slate-500" />
          <p className="mt-1 text-[11px] text-slate-500">لا يمكن تغيير البريد الإلكتروني من هنا حفاظًا على أمان الحساب.</p>
        </div>

        <div>
          <label htmlFor="account-name" className="label">الاسم الكامل</label>
          <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="input mt-1.5" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="account-phone" className="label flex items-center gap-2">
              <Phone className="size-4 text-slate-400" />
              رقم الهاتف
            </label>
            <input id="account-phone" value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" inputMode="tel" maxLength={24} placeholder="+201234567890" className="input mt-1.5 text-left" />
          </div>
          <div>
            <label htmlFor="account-whatsapp" className="label flex items-center gap-2">
              <MessageCircle className="size-4 text-slate-400" />
              رقم واتساب
            </label>
            <input id="account-whatsapp" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} dir="ltr" inputMode="tel" maxLength={24} placeholder="+201234567890" className="input mt-1.5 text-left" />
          </div>
        </div>
        <p className="-mt-2 text-[11px] leading-5 text-slate-500">اترك الحقلين فارغين لإخفاء رقم التواصل. الأرقام الدولية تبدأ بعلامة +.</p>

        {user.role === 'Freelancer' ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} className="mt-0.5 size-4 accent-brand-700" />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><EyeOff className="size-4 text-brand-700" />إخفاء ملفي من نتائج البحث العامة</span>
              <span className="mt-1 block text-[11px] leading-5 text-slate-500">عند التفعيل لن يظهر ملفك في قوائم المستقلين أو البحث، لكن يبقى الوصول متاحًا لطلباتك الحالية.</span>
            </span>
          </label>
        ) : null}

        <button type="submit" disabled={savingProfile} className="btn btn-primary w-full sm:w-auto">
          {savingProfile ? <InlineLoader label="جارٍ الحفظ" /> : 'حفظ التغييرات'}
        </button>
      </form>

      <form onSubmit={savePassword} className="card mt-6 space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <LockKeyhole className="size-5 text-brand-700" />
          <h2 className="text-lg font-extrabold text-slate-900">كلمة المرور</h2>
        </div>

        <div>
          <label htmlFor="current-password" className="label">كلمة المرور الحالية</label>
          <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="input mt-1.5" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-password" className="label">كلمة المرور الجديدة</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={120} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="input mt-1.5" required />
          </div>
          <div>
            <label htmlFor="confirm-password" className="label">تأكيد كلمة المرور الجديدة</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={120} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input mt-1.5" required />
          </div>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">بعد تغيير كلمة المرور سيتم إنهاء جميع جلساتك على كل الأجهزة، وسجّل الدخول من جديد بالكلمة الجديدة.</p>

        <button type="submit" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="btn btn-secondary w-full sm:w-auto">
          {savingPassword ? <InlineLoader label="جارٍ التحديث" /> : 'تغيير كلمة المرور'}
        </button>
      </form>
    </main>
  );
};
