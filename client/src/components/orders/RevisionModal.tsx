import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { InlineLoader } from '@/components/ui/Spinner';

export const RevisionModal = ({ open, pending, remaining, limit, onClose, onSubmit }: {
  open: boolean; pending: boolean; remaining: number; limit: number; onClose: () => void; onSubmit: (notes: string) => void;
}) => {
  const [notes, setNotes] = useState('');
  useEffect(() => { if (!open) setNotes(''); }, [open]);
  const close = () => { setNotes(''); onClose(); };
  const exhausted = remaining <= 0;
  return <Modal open={open} onClose={close} title="طلب تعديل على التسليم" size="sm" footer={
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={close} className="btn btn-secondary">إلغاء</button><button type="button" disabled={pending || exhausted || notes.trim().length < 3} onClick={() => onSubmit(notes.trim())} className="btn btn-primary">{pending ? <InlineLoader label="جارٍ الإرسال"/> : 'إرسال طلب التعديل'}</button></div>
  }>
    <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-xs font-extrabold ${exhausted ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <span>دورات التعديل المتبقية</span>
      <span className="rounded-full bg-white px-3 py-1 text-sm">{Math.max(0, remaining)} / {limit}</span>
    </div>
    {exhausted ? <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-6 text-rose-900">استهلكت الحد الأقصى لدورات التعديل. يمكنك قبول التسليم الحالي أو التواصل مع الإدارة لفتح نزاع.</p> : <p className="mt-3 text-xs leading-6 text-slate-500">يمكنك طلب التعديل حتى {limit} مرات لكل طلب. استخدم هذه الدورة بحكمة.</p>}
    <label htmlFor="order-revision-notes" className="label mt-4">اشرح التعديلات المطلوبة</label>
    <textarea id="order-revision-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={5} disabled={exhausted} className="input resize-y" placeholder="اكتب ملاحظات واضحة تساعد المستقل على تنفيذ التعديل…"/>
    <p className="mt-2 text-xs text-slate-500">{notes.length}/2000 حرف</p>
    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-xs leading-6 text-sky-900"><MessageSquareText className="mt-1 size-4 shrink-0"/>سيبقى المبلغ محجوزًا حتى تقبل التسليم أو يُلغى الطلب.</div>
  </Modal>;
};
