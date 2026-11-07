import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, CheckCheck, Clock3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { OrderCard } from '@/components/orders/OrderCard';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { ordersApi, type PlatformOrder } from '@/services/orders.service';

type Tab = 'current' | 'review' | 'completed';
const TABS: Array<{ id: Tab; label: string; icon: typeof Clock3 }> = [
  { id: 'current', label: 'الطلبات الحالية', icon: Clock3 },
  { id: 'review', label: 'بانتظار المراجعة', icon: CheckCheck },
  { id: 'completed', label: 'المكتملة', icon: BriefcaseBusiness },
];

const inTab = (order: PlatformOrder, tab: Tab): boolean => {
  if (tab === 'current') return ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'].includes(order.status);
  if (tab === 'review') return order.status === 'AWAITING_REVIEW';
  return ['COMPLETED', 'CANCELLED'].includes(order.status);
};

export const OrdersPage = () => {
  const { user } = useAuth();
  const role = user?.role === 'Buyer' ? 'Buyer' : 'Freelancer';
  const [tab, setTab] = useState<Tab>('current');
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list, enabled: Boolean(user && ['Buyer', 'Freelancer'].includes(user.role) ) });
  const orders = ordersQuery.data ?? [];
  const visible = useMemo(() => orders.filter((order) => inTab(order, tab)), [orders, tab]);

  useDocumentTitle('إدارة الطلبات');

  return (
    <div dir="rtl" className="min-h-[70vh] bg-[#F8FAFC]">
      <section className="border-b border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-orange-50/70">
        <div className="container-page py-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-4 py-2 text-xs font-extrabold text-cyan-800"><BriefcaseBusiness className="size-4 text-orange-500"/> مساحة الطلبات والضمان</span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">إدارة الطلبات</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{'\u062a\u0627\u0628\u0639 \u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0648\u0627\u0644\u062a\u0633\u0644\u064a\u0645\u0627\u062a \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-7 sm:py-9">
        <div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-lg shadow-slate-200/40" role="tablist" aria-label="تصنيف الطلبات">
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = orders.filter((order) => inTab(order, id)).length;
            return <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${tab === id ? 'bg-brand-700 text-white shadow-md' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'}`}>
              <Icon className="size-4"/>{label}<span className={`rounded-full px-2 py-0.5 text-xs ${tab === id ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
            </button>;
          })}
        </div>
        {ordersQuery.isPending ? <PageLoader label="جارٍ تحميل طلباتك…"/> : ordersQuery.isError ? <ErrorState message={getErrorMessage(ordersQuery.error, 'تعذر تحميل الطلبات.')} onRetry={() => void ordersQuery.refetch()}/> : visible.length ?
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">{visible.map((order) => <OrderCard key={order.id} order={order} role={role}/>)}</div> :
          <EmptyState icon={BriefcaseBusiness} title="لا توجد طلبات في هذا القسم" description={tab === 'current' && role === 'Buyer' ? 'تصفح الخدمات واطلب الخدمة المناسبة لك.' : 'ستظهر الطلبات هنا عندما تتغير حالتها.'}/>
        }
      </section>
    </div>
  );
};
