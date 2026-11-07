import { useState } from 'react';
import { Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { InlineLoader } from '@/components/ui/Spinner';

export const RatingModal = ({ open, pending, freelancerName, onSubmit, onClose }: {
  open: boolean; pending: boolean; freelancerName: string; onSubmit: (rating: number, comment: string) => void; onClose: () => void;
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  return <Modal open={open} onClose={onClose} title="قيّم تجربتك" size="sm" footer={
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={onClose} className="btn btn-secondary flex-1">تقييم لاحقًا</button>
      <button type="button" disabled={pending || rating === 0} onClick={() => onSubmit(rating, comment.trim())} className="btn btn-primary flex-[2]">{pending ? <InlineLoader label="جارٍ حفظ التقييم"/> : 'إرسال التقييم وإغلاق الطلب'}</button>
    </div>
  }>
    <p className="text-sm leading-7 text-slate-600">تسليمك مقبول. قيّم العمل الذي أنجزه <strong className="text-slate-900">{freelancerName}</strong> الآن أو لاحقًا من صفحة الطلب. إرسال التقييم يغلق الطلب نهائيًا ويمنح المستقل نقاطه.</p>
    <div className="mt-5 flex items-center justify-center gap-2" role="radiogroup" aria-label="التقييم من نجمة إلى خمس نجوم" dir="ltr">
      {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} من 5`} onClick={() => setRating(value)} className="rounded-xl p-2 text-amber-500 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><Star className={`size-8 ${rating >= value ? 'fill-current' : ''}`}/></button>)}
    </div>
    <label htmlFor="order-review-comment" className="label mt-5">مراجعتك (اختيارية)</label>
    <textarea id="order-review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} className="input resize-y" placeholder="شارك رأيك في جودة العمل والتواصل…"/>
    {rating === 0 ? <p className="mt-2 text-xs font-bold text-rose-700">اختر تقييمًا بالنجوم لإرساله.</p> : null}
  </Modal>;
};
