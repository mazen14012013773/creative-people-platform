import { Check, Circle, Clock3 } from 'lucide-react';
import type { OrderStatus } from '@/services/orders.service';

const STEPS: Array<{ status: OrderStatus; title: string; description: string }> = [
  { status: 'PENDING', title: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628', description: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0623\u0646 \u064a\u0628\u062f\u0623 \u0627\u0644\u0645\u0633\u062a\u0642\u0644 \u0627\u0644\u0639\u0645\u0644\u061b \u064a\u0645\u0643\u0646 \u0644\u0644\u0639\u0645\u064a\u0644 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0642\u0628\u0644 \u0627\u0644\u0628\u062f\u0621.' },
  { status: 'IN_PROGRESS', title: 'قيد التنفيذ', description: 'بدأ المستقل العمل على الخدمة.' },
  { status: 'DELIVERED', title: 'التسليم والمراجعة', description: 'رفع المستقل ملفات التسليم.' },
  { status: 'AWAITING_REVIEW', title: '\u0642\u0628\u0648\u0644 \u0627\u0644\u062a\u0633\u0644\u064a\u0645', description: '\u0642\u0628\u0644 \u0627\u0644\u0639\u0645\u064a\u0644 \u0627\u0644\u062a\u0633\u0644\u064a\u0645\u060c \u0648\u064a\u0646\u062a\u0638\u0631 \u062a\u0642\u064a\u064a\u0645\u0647.' },
  { status: 'COMPLETED', title: 'اكتمل الطلب', description: 'حُفظ تقييم العميل.' },
];

const rank: Partial<Record<OrderStatus, number>> = { PENDING: 0, IN_PROGRESS: 1, DELIVERED: 2, REVISION_REQUESTED: 2, AWAITING_REVIEW: 3, COMPLETED: 4 };

export const OrderTimeline = ({ status, revisionNotes, createdAt }: { status: OrderStatus; revisionNotes: string | null; createdAt: string }) => {
  const currentRank = rank[status] ?? -1;
  return <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30 sm:p-6" aria-label="المراحل الزمنية للطلب">
    <h2 className="text-lg font-black text-slate-900">مراحل الطلب</h2>
    {status === 'CANCELLED' ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">{'\u0623\u064f\u0644\u063a\u064a \u0627\u0644\u0637\u0644\u0628.'}</div> : null}
    <ol className="mt-5 space-y-0">
      {STEPS.map((step, index) => {
        const done = index < currentRank || status === 'COMPLETED';
        const active = index === currentRank;
        return <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
          {index < STEPS.length - 1 ? <span className={`absolute right-[0.6875rem] top-7 h-[calc(100%-0.75rem)] w-px ${done ? 'bg-brand-400' : 'bg-slate-200'}`}/> : null}
          <span className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${done ? 'bg-brand-700 text-white' : active ? 'border-2 border-brand-600 bg-brand-50 text-brand-700' : 'border border-slate-200 bg-white text-slate-400'}`}>
            {done ? <Check className="size-3.5"/> : active ? <Clock3 className="size-3.5"/> : <Circle className="size-2.5"/>}
          </span>
          <div className="min-w-0"><p className={`text-sm font-extrabold ${active ? 'text-brand-800' : done ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{index === 0 ? `${step.description} ${new Date(createdAt).toLocaleDateString('ar-EG')}` : step.description}</p></div>
        </li>;
      })}
    </ol>
    {status === 'REVISION_REQUESTED' && revisionNotes ? <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4"><p className="text-xs font-extrabold text-orange-900">ملاحظات التعديل</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-orange-900">{revisionNotes}</p></div> : null}
  </section>;
};
