import { ArrowLeft, Clock3, PackageCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatPrice } from '@/lib/utils';
import type { OrderStatus, PlatformOrder } from '@/services/orders.service';

const STATUS: Record<OrderStatus, { label: string; style: string }> = {
  PENDING: { label: 'بانتظار بدء العمل', style: 'bg-amber-50 text-amber-800' },
  IN_PROGRESS: { label: 'قيد التنفيذ', style: 'bg-sky-50 text-sky-800' },
  DELIVERED: { label: 'تم التسليم', style: 'bg-amber-50 text-amber-800' },
  REVISION_REQUESTED: { label: 'مطلوب تعديل', style: 'bg-orange-50 text-orange-800' },
  AWAITING_REVIEW: { label: 'بانتظار تقييمك', style: 'bg-violet-50 text-violet-800' },
  COMPLETED: { label: 'مكتمل', style: 'bg-emerald-50 text-emerald-800' },
  CANCELLED: { label: 'ملغي', style: 'bg-slate-100 text-slate-600' },
};

export const orderStatusView = (status: OrderStatus) => STATUS[status];

export const OrderCard = ({ order, role }: { order: PlatformOrder; role: 'Buyer' | 'Freelancer' }) => {
  const status = STATUS[order.status];
  const counterpart = role === 'Buyer' ? order.freelancerName : order.buyerName;
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-cyan-100 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{role === 'Buyer' ? 'المستقل' : 'العميل'} · {counterpart}</p>
          <h2 className="mt-2 truncate text-lg font-black text-slate-900">{order.serviceTitle}</h2>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${status.style}`}>
          {order.status === 'COMPLETED' ? <PackageCheck className="size-4"/> : <Clock3 className="size-4"/>}{status.label}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
          <span>بدأ في {formatDate(order.createdAt)}</span>
          <span className="inline-flex items-center gap-1 text-emerald-700"><Wallet className="size-3.5"/>{formatPrice(order.priceAmount)}</span>
        </div>
        <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
          تفاصيل الطلب <ArrowLeft className="size-4"/>
        </Link>
      </div>
    </article>
  );
};
