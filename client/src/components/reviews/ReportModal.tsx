import { Flag, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { InlineLoader } from '@/components/ui/Spinner';
import type { ReportCategory } from '@/services/reports.service';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmit: (category: ReportCategory, description: string, files: File[]) => Promise<boolean>;
}

const categories: Array<[ReportCategory, string]> = [
  ['FRAUD', 'احتيال'], ['INAPPROPRIATE', 'محتوى غير لائق'], ['IMPERSONATION', 'انتحال شخصية'],
  ['NONCOMPLIANCE', 'عدم الالتزام بالتعليمات'], ['OTHER', 'أخرى'],
];

export const ReportModal = ({ open, onClose, isSubmitting, onSubmit }: ReportModalProps) => {
  const [category, setCategory] = useState<ReportCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const close = () => { if (isSubmitting) return; setDescription(''); setFiles([]); setError(''); onClose(); };
  const submit = async () => {
    if (description.trim().length < 10) { setError('اكتب تفاصيل واضحة لا تقل عن 10 أحرف.'); return; }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) { setError('الحد الأقصى لحجم الملف الواحد 10 ميجابايت.'); return; }
    if (await onSubmit(category, description.trim(), files)) close();
  };
  return <Modal open={open} onClose={close} title="الإبلاغ عن الحساب" size="md">
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">اختر سببًا مناسبًا واشرح تفاصيل المشكلة. تقتصر معاينة الأدلة على فريق الإدارة.</div>
      <label className="label" htmlFor="report-category">نوع المشكلة</label>
      <select id="report-category" className="input" value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)}>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      <label className="label" htmlFor="report-description">التفاصيل</label>
      <textarea id="report-description" rows={5} maxLength={4000} className="input resize-y" value={description} onChange={(event) => { setDescription(event.target.value); setError(''); }} placeholder="اشرح ما حدث..."/>
      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-3 text-sm font-bold text-slate-700"><Paperclip className="size-4 text-brand-700"/>إرفاق صور أو PDF أو TXT (حتى 5 ملفات)<input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}/></label>
      {files.length ? <p className="text-xs text-slate-500">{files.map((file) => file.name).join('، ')}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
      <div className="flex justify-end gap-2"><button type="button" onClick={close} className="btn btn-secondary">إلغاء</button><button type="button" disabled={isSubmitting} onClick={() => void submit()} className="btn btn-danger">{isSubmitting ? <InlineLoader label="جارٍ الإرسال"/> : <><Flag className="size-4"/>إرسال البلاغ</>}</button></div>
    </div>
  </Modal>;
};
