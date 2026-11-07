import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Gift, LoaderCircle, Sparkles, Star, Trophy } from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { rewardsApi, type RewardCode } from '@/services/rewards.service';

const rewards: Array<{ code: RewardCode; title: string; description: string; cost: number; icon: typeof Sparkles }> = [
  { code: 'FEATURED_PROFILE', title: 'تمييز الملف الشخصي', description: 'إبراز ملفك ضمن المستقلين لمدة 7 أيام.', cost: 150, icon: Sparkles },
  { code: 'BOOST_SERVICE', title: 'تمييز خدمة', description: 'إبراز إحدى خدماتك لمدة 7 أيام.', cost: 100, icon: Star },
];

export const FreelancerRewardsPage = () => {
  const client = useQueryClient();
  const toast = useToast();
  const [serviceId, setServiceId] = useState('');
  const overview = useQuery({ queryKey: ['freelancer-rewards'], queryFn: rewardsApi.get });
  const redeem = useMutation({
    mutationFn: (reward: RewardCode) => rewardsApi.redeem(reward, reward === 'BOOST_SERVICE' ? serviceId : undefined),
    onSuccess: async ({ cost }) => {
      toast.success(`تم استبدال المكافأة وخصم ${cost} نقطة من رصيدك.`);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['freelancer-rewards'] }),
        client.invalidateQueries({ queryKey: ['my-profile'] }),
        client.invalidateQueries({ queryKey: ['freelancers'] }),
        client.invalidateQueries({ queryKey: ['featured-freelancers'] }),
        client.invalidateQueries({ queryKey: ['all-platform-services'] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر استبدال المكافأة.')),
  });
  useDocumentTitle('الهدايا والمكافآت');

  if (overview.isPending) return <PageLoader label="جارٍ تحميل رصيد المكافآت…"/>;
  if (overview.isError || !overview.data) return <main className="container-page py-12" dir="rtl"><ErrorState message={getErrorMessage(overview.error, 'تعذر تحميل المكافآت.')} onRetry={() => void overview.refetch()}/></main>;

  const data = overview.data;
  const rewardCost = (listedCost: number) => Math.ceil(listedCost * (data.balance > 200 ? 0.9 : 1));
  const canRedeem = (code: RewardCode, listedCost: number) => data.balance >= rewardCost(listedCost) && !(code === 'FEATURED_PROFILE' && data.isFeatured) && !(code === 'BOOST_SERVICE' && (!data.services.length || !serviceId));

  return <main dir="rtl" className="min-h-[75vh] bg-slate-50/70 pb-14">
    <section className="border-b border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-orange-50/70"><div className="container-page py-9 sm:py-12"><span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-4 py-2 text-xs font-extrabold text-cyan-800"><Gift className="size-4 text-orange-500"/>متجر هدايا المستقلين</span><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">الهدايا والمكافآت</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">استبدل نقاط إنجازك بمزايا تساعدك على إبراز ملفك وخدماتك.</p></div></section>
    <div className="container-page space-y-7 py-7 sm:py-9">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <article className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-lg shadow-slate-200/30"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-500">رصيد نقاطك</p><p className="mt-2 text-4xl font-black text-brand-800">{data.balance.toLocaleString('ar-EG')} <span className="text-base">نقطة</span></p></div><span className="grid size-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Trophy className="size-6"/></span></div><p className="mt-4 text-xs leading-6 text-slate-500">تُضاف النقاط تلقائياً عند إكمال الطلبات والحصول على تقييمات مميزة.</p></article>
        <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30"><div className="mb-4 flex items-center gap-2"><Clock3 className="size-4 text-brand-700"/><h2 className="font-black text-slate-900">سجل النقاط</h2></div>{data.history.length ? <ul className="max-h-48 space-y-2 overflow-y-auto">{data.history.slice(0, 8).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700" title={item.reason}>{item.reason}</p><time className="mt-1 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</time></div><span className={`shrink-0 text-sm font-black ${item.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{item.amount > 0 ? '+' : ''}{item.amount.toLocaleString('ar-EG')}</span></li>)}</ul> : <p className="py-8 text-center text-sm text-slate-500">سيظهر سجل نقاطك هنا.</p>}</article>
      </section>
      <section><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">استبدل نقاطك</h2><p className="mt-1 text-sm text-slate-500">المزايا المتاحة لحساب المستقل. شارة توثيق الهوية تُمنح فقط بعد مراجعة الإدارة لأوراق الهوية الرسمية.</p></div></div>
        {data.services.length ? <label className="mb-4 block max-w-xl text-xs font-bold text-slate-600">اختر خدمة عند استبدال ميزة تمييز الخدمة<select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="input mt-2 h-11"><option value="">اختر خدمة…</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label> : null}
        <div className="grid gap-4 md:grid-cols-2">{rewards.map(({ code, title, description, cost, icon: Icon }) => {
          const alreadyActive = code === 'FEATURED_PROFILE' ? data.isFeatured : false;
          const actualCost = rewardCost(cost);
          return <article key={code} className="flex min-h-64 flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30"><span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="size-6"/></span><h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3><p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{description}</p><div className="mt-4 flex items-center justify-between gap-3"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">{actualCost.toLocaleString('ar-EG')} نقطة{actualCost < cost ? <span className="ms-1 font-medium text-slate-400 line-through">{cost}</span> : null}</span>{alreadyActive ? <span className="text-xs font-bold text-emerald-700">مفعّلة</span> : null}</div><button type="button" disabled={!canRedeem(code, cost) || redeem.isPending} onClick={() => redeem.mutate(code)} className="btn btn-primary mt-auto w-full disabled:cursor-not-allowed disabled:opacity-50">{redeem.isPending && redeem.variables === code ? <LoaderCircle className="size-4 animate-spin"/> : <Gift className="size-4"/>}{alreadyActive ? 'تم تفعيلها' : data.balance < actualCost ? 'النقاط غير كافية' : code === 'BOOST_SERVICE' && !serviceId ? 'اختر خدمة أولاً' : 'استبدال النقاط'}</button></article>;
        })}</div>
      </section>
    </div>
  </main>;
};
