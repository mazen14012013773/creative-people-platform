import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatPrice } from '@/lib/utils';
export const OrderConfirmModal = ({ open, title, description, price, pending, onClose, onConfirm }: { open: boolean; title: string; description: string; price?: number; pending: boolean; onClose: () => void; onConfirm: () => void }) => <Modal open={open} onClose={onClose} title="تأكيد طلب الخدمة" size="sm" footer={<div className="flex gap-2"><button type="button" onClick={onClose} disabled={pending} className="btn btn-secondary flex-1">رجوع</button><button type="button" onClick={onConfirm} disabled={pending} className="btn btn-primary flex-1">{pending ? <LoaderCircle className="size-4 animate-spin"/> : <ShieldCheck className="size-4"/>}تأكيد الطلب</button></div>}>
  <p className="break-words font-extrabold text-slate-900">{title}</p>
  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{description}</p>
  {typeof price === 'number' ? <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"><span className="text-xs font-extrabold text-emerald-900">قيمة الخدمة</span><span className="text-sm font-black text-emerald-800">{formatPrice(price)}</span></div> : null}
  <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-500">يُحفظ السعر كلقطة مع الطلب، ولن يبدأ التنفيذ إلا بعد أن يبدأ المستقل العمل. يمكنك إلغاء الطلب قبل ذلك.</p>
</Modal>;
