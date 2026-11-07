import { useRef, useState } from 'react';
import { AlertTriangle, Link2, Paperclip, ShieldCheck, UploadCloud } from 'lucide-react';
import { InlineLoader } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import type { OrderDelivery, OrderStatus } from '@/services/orders.service';
import { isAllowedDeliveryLink } from '@/lib/delivery-link';
import { ORDER_DELIVERY_ACCEPT, ORDER_DELIVERY_EXTENSIONS_LABEL, ORDER_DELIVERY_MAX_FILES, ORDER_DELIVERY_MAX_SIZE } from '@/lib/upload-rules';
import { VaultFileExplorer } from './VaultFileExplorer';

export const OrderVault = ({ orderId, status, deliveries, canUpload, uploading, onUpload }: {
  orderId: string; status: OrderStatus; deliveries: OrderDelivery[]; canUpload: boolean; canDownloadOwn: boolean; uploading: boolean;
  onUpload: (files: File[], notes: string, link?: string) => Promise<void>;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const validLink = isAllowedDeliveryLink(link);
  const resetForm = () => {
    setFiles([]);
    setLink('');
    setNotes('');
    if (inputRef.current) inputRef.current.value = '';
  };
  const selectFiles = (selected: File[]) => {
    if (!selected.length) return;
    if (selected.length > ORDER_DELIVERY_MAX_FILES) {
      toast.error(`يمكن تسليم ${ORDER_DELIVERY_MAX_FILES} ملفات كحد أقصى. اخترت ${selected.length} ملفات.`);
      return;
    }
    const oversize = selected.find((file) => file.size > ORDER_DELIVERY_MAX_SIZE);
    if (oversize) {
      toast.error(`حجم الملف «${oversize.name}» يتجاوز 25 ميجابايت.`);
      return;
    }
    setFiles(selected);
  };
  const submit = async () => {
    if (!files.length || uploading) return;
    try {
      await onUpload(files, notes.trim());
      resetForm();
    } catch {
      // Keep files/notes so the freelancer can retry after a failed upload.
    }
  };
  const submitLink = async () => {
    if (!validLink || uploading) return;
    try {
      await onUpload([], notes.trim(), link.trim());
      resetForm();
    } catch {
      // Keep the link/notes so the freelancer can retry after a failed submission.
    }
  };
  return <section className="space-y-4">
    {canUpload ? <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">رفع ملفات التسليم</h2><p className="mt-1 text-xs text-slate-500">تُحفظ الملفات داخل خزنة خاصة بكل طلب وإصدار.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800"><ShieldCheck className="size-4"/>تسليم محمي</span></div>
      <input ref={inputRef} type="file" multiple accept={ORDER_DELIVERY_ACCEPT} className="sr-only" onChange={(event) => { selectFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ''; window.setTimeout(() => inputRef.current?.removeAttribute('webkitdirectory'), 0); }} aria-label="اختر ملفات التسليم"/>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="flex items-center gap-3"><UploadCloud className="size-5 text-brand-700"/><span className="text-xs font-semibold text-slate-600">حتى {ORDER_DELIVERY_MAX_FILES} ملفات، 25 ميجابايت لكل ملف</span></div><div className="flex gap-2"><button type="button" onClick={() => { inputRef.current?.removeAttribute('webkitdirectory'); inputRef.current?.click(); }} className="btn btn-secondary"><Paperclip className="size-4"/>اختيار ملفات</button><button type="button" onClick={() => { inputRef.current?.setAttribute('webkitdirectory', ''); inputRef.current?.click(); }} className="btn btn-secondary">اختيار مجلد</button></div></div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">الامتدادات المسموحة: {ORDER_DELIVERY_EXTENSIONS_LABEL}.</p>
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
        <label htmlFor="order-delivery-link" className="label flex items-center gap-2"><Link2 className="size-4 text-brand-700"/>{'\u0623\u0648 \u0623\u0631\u0633\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u0633\u0644\u064a\u0645'}</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="order-delivery-link" type="url" inputMode="url" dir="ltr" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://..." className="input min-w-0 flex-1 text-left" aria-invalid={Boolean(link.trim()) && !validLink}/><button type="button" disabled={!validLink || uploading} onClick={() => void submitLink()} className="btn btn-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"><Link2 className="size-4"/>{'\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0627\u0628\u0637'}</button></div>
        {link.trim() && !validLink ? <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-rose-600"><AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>رابط غير مقبول. يُسمح بروابط YouTube أو Google Drive، أو روابط مواقع آمنة عبر HTTPS فقط (بدون أرقام IP أو منافذ مخصصة).</p> : <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-amber-700"><AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>روابط المواقع الخارجية غير المستضافة على منصة مبدعين تُفتح خارجها، وسيُنبَّه العميل بذلك قبل الفتح.</p>}
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{'\u064a\u0638\u0647\u0631 \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u0644\u0639\u0645\u064a\u0644 \u0628\u0639\u062f \u0627\u0643\u062a\u0645\u0627\u0644 \u0627\u0644\u0637\u0644\u0628.'}</p>
      </div>      {files.length ? <ul className="mt-3 space-y-1 text-xs text-slate-600">{files.map((file, i) => <li className="truncate" key={`${file.name}-${i}`}>{file.name} · {(file.size / 1024).toFixed(0)} KB</li>)}</ul> : null}
      <label htmlFor="order-delivery-notes" className="label mt-4">ملاحظة للعميل (اختيارية)</label><textarea id="order-delivery-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={2} className="input resize-y"/>
      <button type="button" disabled={uploading || !files.length} onClick={() => void submit()} className="btn btn-primary mt-3 w-full sm:w-auto">{uploading ? <InlineLoader label="جارٍ رفع الملفات"/> : 'تسليم الملفات'}</button>
    </div> : null}
    <VaultFileExplorer orderId={orderId} files={deliveries} status={status}/>
    {status === 'COMPLETED' ? <p className="px-2 text-xs font-semibold text-emerald-700">اكتمل الطلب وأصبح التنزيل الأصلي متاحًا من المعاينة.</p> : <p className="px-2 text-xs text-slate-500">المعاينة فقط متاحة الآن؛ يُفتح التنزيل بعد اكتمال الطلب.</p>}
  </section>;
};
