import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, Save, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { profileApi } from '@/services/profile.service';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export const BuyerProfileSettings = ({ accountRole = 'Buyer' }: { accountRole?: 'Buyer' | 'Parent' }) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const imageInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  useEffect(() => setName(user?.name ?? ''), [user?.name]);

  const nameMutation = useMutation({
    mutationFn: () => accountRole === 'Parent' ? profileApi.updateParentAccount(name.trim()) : profileApi.updateBuyerAccount(name.trim()),
    onSuccess: async () => { await refreshUser(); toast.success('تم تحديث اسم الحساب'); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث الاسم')),
  });
  const imageMutation = useMutation({
    mutationFn: (file: File) => accountRole === 'Parent' ? profileApi.uploadParentAvatar(file) : profileApi.uploadBuyerAvatar(file),
    onSuccess: async () => { await refreshUser(); toast.success('تم تحديث الصورة الشخصية'); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر رفع الصورة')),
  });

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { toast.error('اختر صورة JPG أو PNG أو WebP أو GIF'); return; }
    if (file.size > MAX_IMAGE_SIZE) { toast.error('يجب ألا يتجاوز حجم الصورة 3 ميجابايت'); return; }
    imageMutation.mutate(file);
  };

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) { toast.error('اكتب اسمًا لا يقل عن حرفين'); return; }
    if (name.trim() !== user?.name) nameMutation.mutate();
  };

  if (!user) return null;
  return <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-center gap-2"><span className="flex size-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><UserRound className="size-5"/></span><div><h2 className="font-black text-slate-900">بيانات حسابك</h2><p className="text-xs text-slate-500">غيّر الاسم والصورة التي تظهر للمستقلين في المحادثات.</p></div></div>
    <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4"><div className="relative"><Avatar name={user.name} src={user.avatarUrl} className="size-20 rounded-3xl text-xl"/>{imageMutation.isPending ? <span className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-900/50"><Spinner className="size-6 text-white"/></span> : null}</div><div><p className="font-extrabold text-slate-800">صورتك الشخصية</p><p className="mt-1 text-xs text-slate-500">JPG أو PNG أو WebP أو GIF · حتى 3 ميجابايت</p><input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} onChange={selectImage} className="sr-only"/><button type="button" onClick={() => imageInput.current?.click()} disabled={imageMutation.isPending} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-extrabold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50"><Camera className="size-4"/>اختيار صورة</button></div></div>
      <form onSubmit={saveName} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><label htmlFor="buyer-profile-name" className="mb-1 block text-xs font-extrabold text-slate-700">اسم الملف الشخصي</label><input id="buyer-profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} minLength={2} required className="input w-full" placeholder="اكتب اسمك"/></div><button type="submit" disabled={nameMutation.isPending || name.trim() === user.name} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0e7490] transition hover:bg-cyan-700 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"><Save className="size-4"/>حفظ الاسم</button></form>
    </div>
  </section>;
};
