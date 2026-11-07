import { useState } from 'react';
import { ArrowRight, HeartHandshake, MessageSquareText, ShieldCheck, UserRound } from 'lucide-react';
import { BuyerProfileSettings } from '@/components/dashboard/BuyerProfileSettings';
import { ParentChildrenPanel } from '@/components/dashboard/ParentChildrenPanel';
import { CommunityDashboardPanel } from '@/components/dashboard/CommunityDashboardPanel';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type UtilityView = 'children' | 'profile' | 'community';

export const ParentDashboardPage = () => {
  const { user } = useAuth();
  const [view, setView] = useState<UtilityView>('children');
  useDocumentTitle('لوحة ولي الأمر');

  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-12">
    <div className="container-page mx-auto max-w-7xl py-5 sm:py-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-cyan-100 via-white to-orange-50 p-5 shadow-xl shadow-slate-200/50 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm"><HeartHandshake className="size-7"/></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-cyan-800">مساحة العائلة الآمنة</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">لوحة ولي الأمر{user?.name ? ` · ${user.name}` : ''}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">تابع إنجازات أبنائك وخدماتهم ومحادثاتهم التي أتاحوها لك، من مكان واحد.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setView('profile')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${view === 'profile' ? 'bg-cyan-700 text-white' : 'bg-white text-slate-700 hover:bg-cyan-50'}`}><UserRound className="size-4"/>ملفي</button>
            <button type="button" onClick={() => setView('community')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${view === 'community' ? 'bg-cyan-700 text-white' : 'bg-white text-slate-700 hover:bg-cyan-50'}`}><MessageSquareText className="size-4"/>مشاركاتي</button>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"><ShieldCheck className="size-4"/>متابعة بإذن الابن</span>
          </div>
        </div>
      </section>

      {view === 'children' ? <div className="mt-5"><ParentChildrenPanel/></div> : <section className="mt-5 rounded-3xl bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-6">
        <button type="button" onClick={() => setView('children')} className="mb-5 inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800 hover:bg-cyan-100"><ArrowRight className="size-4"/>العودة إلى متابعة الأبناء</button>
        {view === 'profile' ? <><div className="mb-5"><h2 className="text-xl font-black text-slate-900">ملف ولي الأمر</h2><p className="mt-1 text-sm text-slate-500">حدّث بيانات حسابك وصورتك الشخصية.</p></div><BuyerProfileSettings accountRole="Parent"/></> : <><div className="mb-5"><h2 className="text-xl font-black text-slate-900">مشاركاتي في المجتمع</h2><p className="mt-1 text-sm text-slate-500">أنشئ منشوراتك وراجع ما شاركته مع مجتمع مبدعين.</p></div><CommunityDashboardPanel/></>}
      </section>}
    </div>
  </main>;
};

export default ParentDashboardPage;
