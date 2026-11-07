import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, Edit3, ExternalLink, ImagePlus, Link2, PackagePlus, Plus, Share2, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaLightbox } from '@/components/ui/MediaLightbox';
import { ShareServiceModal } from '@/components/freelancers/ShareServiceModal';
import { ExternalMediaCard } from '@/components/ui/ExternalMediaCard';
import { ExternalWebViewLink } from '@/components/ui/ExternalWebViewLink';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { StarRating } from '@/components/ui/StarRating';
import { getErrorMessage } from '@/services/api';
import { formatPrice } from '@/lib/utils';
import { servicesApi } from '@/services/services.service';
import type { MicroService, MicroServicePayload, ServiceMedia, ServiceSource } from '@/types';

const emptyForm = (): MicroServicePayload => ({ title: '', description: '', category: '', price: 0, media: [], sources: [] });
const MAX_MEDIA = 12;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SOURCE_ACCENTS = [
  'border-sky-100 bg-sky-50 text-sky-700',
  'border-violet-100 bg-violet-50 text-violet-700',
  'border-emerald-100 bg-emerald-50 text-emerald-700',
  'border-orange-100 bg-orange-50 text-orange-700',
];

const normalizeWebUrl = (input: string): string => {
  const trimmed = input.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('invalid URL');
  }
  return parsed.href;
};
const sourceHost = (value: string): string => {
  try { return new URL(value).hostname; } catch { return value; }
};
export const ServicesManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<MicroService | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{ items: ServiceMedia[]; index: number; title: string } | null>(null);
  const [sharedService, setSharedService] = useState<{ id: string; title: string } | null>(null);
  const [form, setForm] = useState<MicroServicePayload>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; fileName: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ kind: 'service'; id: string; label: string } | { kind: 'media'; fileName: string } | null>(null);
  const servicesQuery = useQuery({ queryKey: ['my-services'], queryFn: servicesApi.listMine });
  const uploadedMediaQuery = useQuery({ queryKey: ['my-service-uploads'], queryFn: servicesApi.listUploadedMedia });
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: ServiceMedia[] = [];
      const failed: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setUploadProgress({ completed: index + 1, total: files.length, fileName: file.name });
        try { uploaded.push(await servicesApi.uploadMedia(file)); }
        catch (reason) { failed.push(`${file.name}: ${getErrorMessage(reason, 'تعذر رفع الملف')}`); }
      }
      setUploadProgress({ completed: files.length, total: files.length, fileName: '' });
      return { uploaded, failed };
    },
    onSuccess: ({ uploaded, failed }) => {
      if (uploaded.length) setForm((current) => ({ ...current, media: [...(current.media ?? []), ...uploaded] }));
      setError(failed.length ? `تعذر رفع بعض الملفات:\n${failed.join('\n')}` : null);
      if (uploaded.length) toast.success(`تم رفع ${uploaded.length} ملف${uploaded.length === 1 ? '' : 'ات'}. احفظ الخدمة لإضافتها.`);
      setUploadProgress(null);
      void queryClient.invalidateQueries({ queryKey: ['my-service-uploads'] });
    },
    onError: (reason) => { setUploadProgress(null); setError(getErrorMessage(reason, 'تعذر رفع الملفات. تحقق من نوعها وحجمها ثم حاول مجددًا.')); },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-services'] });
    await queryClient.invalidateQueries({ queryKey: ['freelancer-services'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => editing ? servicesApi.update(editing.id, form) : servicesApi.create(form),
    onSuccess: async () => {
      toast.success(editing ? 'تم تحديث الخدمة' : 'تمت إضافة الخدمة');
      setEditing(null);
      setForm(emptyForm());
      setError(null);
      await refresh();
    },
    onError: (reason) => setError(getErrorMessage(reason, 'تعذر حفظ الخدمة')),
  });

  const removeMutation = useMutation({
    mutationFn: servicesApi.remove,
    onSuccess: async () => { toast.success('تم حذف الخدمة'); await refresh(); },
    onError: (reason) => toast.error(getErrorMessage(reason, 'تعذر حذف الخدمة')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => servicesApi.update(id, { status }),
    onSuccess: refresh,
    onError: (reason) => toast.error(getErrorMessage(reason, 'تعذر تحديث حالة الخدمة')),
  });

  const deleteUploadMutation = useMutation({
    mutationFn: servicesApi.deleteUploadedMedia,
    onSuccess: async (_result, fileName) => {
      setForm((current) => ({ ...current, media: current.media?.filter((item) => !item.url.endsWith(`/${fileName}`)) }));
      await queryClient.invalidateQueries({ queryKey: ['my-service-uploads'] });
      toast.success('تم حذف الملف من التخزين نهائيًا');
    },
    onError: (reason) => setError(getErrorMessage(reason, 'تعذر حذف الملف')),
  });

  const confirmBusy = confirmDialog?.kind === 'service' ? removeMutation.isPending : deleteUploadMutation.isPending;

  const runConfirm = () => {
    if (!confirmDialog) return;
    if (confirmDialog.kind === 'service') {
      removeMutation.mutate(confirmDialog.id, { onSuccess: () => setConfirmDialog(null) });
    } else {
      deleteUploadMutation.mutate(confirmDialog.fileName, { onSuccess: () => setConfirmDialog(null) });
    }
  };

  const startEdit = (service: MicroService) => {    setEditing(service);
    setForm({ title: service.title, description: service.description, category: service.category, price: service.price, media: service.media, sources: service.sources });
    setError(null);
  };

  const addSourceLink = () => {
    const enteredUrl = sourceUrl.trim();
    if (!enteredUrl) { setError('أضف رابط الموقع أو الملف أولاً.'); return; }
    let url: string;
    try {
      url = normalizeWebUrl(enteredUrl);
      if (url.length > 2048) throw new Error('URL is too long');
    } catch { setError('تعذر قراءة الرابط. أدخل عنوان موقع صحيحًا مثل drive.google.com أو رابطًا يبدأ بـ https://'); return; }
    const title = sourceTitle.trim() || new URL(url).hostname.replace(/^www\./i, '');
    if ((form.sources?.length ?? 0) >= 20) { setError('يمكن إضافة 20 مصدرًا كحد أقصى.'); return; }
    if (form.sources?.some((source) => source.url === url)) { setError('هذا المصدر مضاف بالفعل.'); return; }
    setError(null);
    setForm((current) => ({ ...current, sources: [...(current.sources ?? []), { title, url }] }));
    setSourceTitle(''); setSourceUrl('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    if (!form.title.trim() || form.title.trim().length < 3 || form.description.trim().length < 10 || !form.category.trim() || !Number.isFinite(form.price) || form.price < 0) {
      setError('أكمل عنوان الخدمة ووصفًا لا يقل عن 10 أحرف وتصنيفًا واضحًا، وأدخل سعرًا غير سالب.'); return;
    }
    saveMutation.mutate();
  };

  const removeMedia = (index: number) => setForm((current) => ({ ...current, media: current.media?.filter((_, i) => i !== index) }));
  const moveMedia = (index: number, direction: -1 | 1) => setForm((current) => {
    const media = [...(current.media ?? [])];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= media.length) return current;
    [media[index], media[nextIndex]] = [media[nextIndex], media[index]];
    return { ...current, media };
  });
  const addUploadedMedia = (item: ServiceMedia) => {
    if ((form.media?.length ?? 0) >= MAX_MEDIA) { setError(`يمكن إضافة ${MAX_MEDIA} وسائط كحد أقصى.`); return; }
    if (form.media?.some((media) => media.url === item.url)) return;
    setError(null);
    setForm((current) => ({ ...current, media: [...(current.media ?? []), item] }));
  };

  return (
    <div dir="rtl" className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
      <section className="card min-w-0 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><PackagePlus className="size-5" /></span>
          <div><h2 className="text-lg font-extrabold text-slate-900">خدماتي المصغّرة</h2><p className="mt-1 text-sm text-slate-500">اعرض خدماتك وأعمالك ليستطيع الآخرون طلبها بسهولة.</p></div>
        </div>
        <div className="mt-5 space-y-4">
          {servicesQuery.isPending && <p className="text-sm text-slate-500">جارٍ تحميل الخدمات...</p>}
          {servicesQuery.isError && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">تعذر تحميل الخدمات. أعد المحاولة لاحقًا.</p>}
          {!servicesQuery.isPending && !servicesQuery.isError && (servicesQuery.data?.length ?? 0) === 0 && <EmptyState icon={PackagePlus} title="لا توجد خدمات بعد" description="أضف خدمتك الأولى لتظهر في ملفك الشخصي." compact />}
          {servicesQuery.data?.map((service) => (
            <article key={service.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {service.media?.length > 0 && <div className="grid grid-cols-2 gap-1 bg-slate-100 sm:grid-cols-3">{service.media.slice(0, 3).map((item, index) => item.type === 'link' ? <ExternalMediaCard key={`${item.url}-${index}`} url={item.url} title={sourceHost(item.url)} className="aspect-video rounded-none p-2" /> : <button key={`${item.url}-${index}`} type="button" onClick={() => setMediaViewer({ items: service.media, index, title: service.title })} className="group relative aspect-video overflow-hidden bg-black" aria-label={`معاينة ${item.type === 'video' ? 'فيديو' : 'صورة'} من خدمة ${service.title}`}>{item.type === 'video' ? <video src={item.url} muted preload="metadata" playsInline className="size-full object-cover transition group-hover:scale-105" /> : <img src={item.url} alt={`صورة من خدمة ${service.title}`} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />}{item.type === 'video' ? <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="ms-1 border-y-[7px] border-s-[11px] border-y-transparent border-s-white" /></span> : null}</button>)}</div>}
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{service.title}</h3>{service.isFeatured ? <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold text-orange-800"><Sparkles className="size-3"/>{'\u062e\u062f\u0645\u0629 \u0645\u0645\u064a\u0632\u0629'}</span> : null}<span className={`chip ${service.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>{service.status === 'active' ? 'منشورة' : 'مخفية'}</span></div><p className="mt-1 text-xs font-semibold text-slate-500">{service.category} · <span className="font-extrabold text-emerald-700">{formatPrice(service.price)}</span></p></div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => setSharedService({ id: service.id, title: service.title })} className="btn btn-secondary btn-sm" aria-label={`مشاركة خدمة ${service.title}`} title="رابط وQR للخدمة"><Share2 className="size-4" /></button><button type="button" onClick={() => statusMutation.mutate({ id: service.id, status: service.status === 'active' ? 'inactive' : 'active' })} className="btn btn-secondary btn-sm" aria-label={service.status === 'active' ? 'إخفاء الخدمة' : 'نشر الخدمة'}>{service.status === 'active' ? <X className="size-4" /> : <Check className="size-4" />}</button>
                    <button type="button" onClick={() => startEdit(service)} className="btn btn-secondary btn-sm" aria-label="تعديل الخدمة"><Edit3 className="size-4" /></button>
                    <button type="button" onClick={() => setConfirmDialog({ kind: 'service', id: service.id, label: service.title })} className="btn btn-secondary btn-sm text-rose-600" aria-label="حذف الخدمة"><Trash2 className="size-4" /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="whitespace-pre-line text-sm leading-6 text-slate-600">{service.description}</p><StarRating value={service.avgRating} count={service.reviewCount}/></div>
                {service.media?.length > 3 && <p className="mt-2 text-xs font-semibold text-slate-500">ووسائط أخرى: {service.media.length - 3}</p>}
                {!!service.sources?.length && <div className="mt-3 grid gap-3 sm:grid-cols-2">{service.sources.map((source, index) => <ExternalMediaCard key={`${source.url}-${index}`} url={source.url} title={source.title} className="rounded-2xl shadow-sm" />)}</div>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <form className="card min-w-0 p-5 sm:p-6" onSubmit={submit}>
        <h2 className="text-base font-extrabold text-slate-900">{editing ? 'تعديل الخدمة' : 'أضف خدمة جديدة'}</h2>
        <p className="mt-1 text-sm text-slate-500">أضف التفاصيل والوسائط، ثم احفظ الخدمة لنشرها.</p>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="label">عنوان الخدمة</span><input className="input" maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: تصميم شعار لمشروعك" required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">التصنيف</span><input className="input" maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="تصميم، برمجة..." required /></label>
            <label className="block"><span className="label">سعر الخدمة (ج.م)</span><input className="input" type="number" inputMode="decimal" min={0} max={1000000} step="0.01" value={form.price} onChange={(event) => { const next = Number(event.target.value); setForm({ ...form, price: event.target.value === '' || !Number.isFinite(next) ? 0 : next }); }} placeholder="0" /><span className="mt-1 block text-[11px] text-slate-500">اتركه 0 إذا كان السعر حسب الاتفاق.</span></label>
          </div>
          <label className="block"><span className="label">وصف الخدمة</span><textarea className="input min-h-28 resize-y" maxLength={1500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="اشرح ما الذي سيحصل عليه العميل..." required /></label>

          <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <legend className="px-1 text-sm font-extrabold text-slate-800">صور وفيديوهات الخدمة</legend>
            <input ref={fileRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={(event) => { const files = Array.from(event.target.files ?? []); const remaining = MAX_MEDIA - (form.media?.length ?? 0); if (files.length > remaining) setError(`يمكن إضافة ${remaining} ملف${remaining === 1 ? '' : 'ات'} فقط؛ الحد الأقصى ${MAX_MEDIA} وسيطًا للخدمة.`); else if (files.some((file) => file.size > MAX_FILE_SIZE)) setError('يجب ألا يتجاوز حجم كل صورة أو فيديو 25 ميجابايت.'); else if (files.length) { setError(null); uploadMutation.mutate(files); } event.currentTarget.value = ''; }} />
            <button type="button" disabled={uploadMutation.isPending || (form.media?.length ?? 0) >= MAX_MEDIA} onClick={() => fileRef.current?.click()} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-4 text-center transition hover:border-brand-500 hover:bg-brand-50/40 disabled:opacity-60">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{uploadMutation.isPending ? <UploadCloud className="size-5 animate-pulse" /> : <ImagePlus className="size-5" />}</span>
              <span className="text-sm font-bold text-slate-800">{uploadMutation.isPending ? `جارٍ رفع ${uploadProgress?.completed ?? 0} من ${uploadProgress?.total ?? 0}: ${uploadProgress?.fileName ?? ''}` : 'اختر صورة أو فيديو — يمكنك تحديد عدة ملفات'}</span>
              <span className="text-xs text-slate-500">JPG أو PNG أو GIF أو WebP أو MP4 أو WebM أو MOV · حتى 25 ميجابايت للملف · 12 ملفًا للخدمة</span>
              {uploadMutation.isPending ? <span className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(8, ((uploadProgress?.completed ?? 0) / (uploadProgress?.total ?? 1)) * 100)}%` }} /></span> : null}
            </button>
            <p className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-xs leading-5 text-cyan-900">📌 أضف الصور والفيديوهات من جهازك فقط. لإضافة مرجع أو موقع خارجي، استخدم قسم «مصادر وروابط المشروع»؛ ستُفتح هذه الروابط خارج المنصة.</p>
            {!!form.media?.length && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{form.media.map((item: ServiceMedia, index) => <div key={`${item.url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">{item.type === 'link' ? <ExternalMediaCard url={item.url} title={sourceHost(item.url)} className="aspect-video w-full border-0 rounded-none p-3" /> : <button type="button" onClick={() => setMediaViewer({ items: form.media ?? [], index, title: form.title || 'معاينة وسائط الخدمة' })} className="relative block w-full bg-black" aria-label={`معاينة الوسيط ${index + 1}`}>{item.type === 'video' ? <video src={item.url} muted preload="metadata" playsInline className="aspect-video w-full object-cover" /> : <img src={item.url} alt={`معاينة صورة ${index + 1}`} className="aspect-video w-full object-cover" onError={(event) => { event.currentTarget.alt = 'تعذر عرض معاينة الصورة'; }} />}{item.type === 'video' ? <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="ms-1 border-y-[7px] border-s-[11px] border-y-transparent border-s-white" /></span> : null}</button>}<div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow"><button type="button" disabled={index === 0} onClick={() => moveMedia(index, -1)} className="rounded p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30" aria-label="تحريك الوسيط للأعلى"><ArrowUp className="size-3.5" /></button><button type="button" disabled={index === form.media!.length - 1} onClick={() => moveMedia(index, 1)} className="rounded p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30" aria-label="تحريك الوسيط للأسفل"><ArrowDown className="size-3.5" /></button><button type="button" onClick={() => removeMedia(index)} className="rounded p-1 text-rose-700 hover:bg-rose-50" aria-label="إزالة الوسيط من الخدمة"><X className="size-3.5" /></button></div></div>)}</div>}
            {!!uploadedMediaQuery.data?.filter((item) => !form.media?.some((selected) => selected.url === item.url)).length && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-extrabold text-slate-700">ملفات رفعتها من قبل</p><p className="mt-1 text-[11px] text-slate-500">أضف ملفًا للخدمة أو احذفه نهائيًا من التخزين.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{uploadedMediaQuery.data.filter((item) => !form.media?.some((selected) => selected.url === item.url)).slice(0, 12).map((item) => { const fileName = item.url.split('/').pop() ?? ''; return <div key={item.url} className="overflow-hidden rounded-lg border border-slate-200"><div className="aspect-video bg-slate-100">{item.type === 'video' ? <video src={item.url} preload="metadata" className="size-full object-cover" /> : <img src={item.url} alt="ملف مرفوع سابقًا" loading="lazy" className="size-full object-cover" />}</div><div className="grid grid-cols-[1fr_auto]"><button type="button" onClick={() => addUploadedMedia(item)} className="px-2 py-2 text-xs font-extrabold text-brand-700 hover:bg-brand-50">إضافة للخدمة</button><button type="button" disabled={deleteUploadMutation.isPending} onClick={() => setConfirmDialog({ kind: 'media', fileName })} className="px-2 py-2 text-rose-600 hover:bg-rose-50" aria-label="حذف الملف نهائيًا"><Trash2 className="size-3.5" /></button></div></div>; })}</div></div>}
          </fieldset>

          <fieldset className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/40 sm:p-6">
            <div className="pointer-events-none absolute -left-12 -top-14 size-40 rounded-full bg-violet-100/60 blur-3xl" />
            <legend className="relative px-2 text-base font-black text-slate-900">مصادر وروابط المشروع</legend>
            <div className="relative">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-xl text-sm leading-7 text-slate-600">أضف روابط المراجع وملفات المشروع. عند الضغط عليها، تُفتح في تبويب خارجي جديد.</p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-extrabold text-cyan-800"><ExternalLink className="size-3.5" /> روابط خارجية</span>
              </div>
              <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_auto]">
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-extrabold text-slate-700">اسم الرابط <span className="font-medium text-slate-400">(اختياري)</span></span>
                  <input className="input min-w-0 border-slate-200 bg-white focus:border-cyan-400 focus:ring-cyan-100" maxLength={80} placeholder="مثال: ملفات المشروع" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-extrabold text-slate-700">رابط الموقع أو الملف</span>
                  <input className="input min-w-0 border-slate-200 bg-white focus:border-cyan-400 focus:ring-cyan-100" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={2048} placeholder="https://example.com أو drive.google.com" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSourceLink(); } }} />
                </label>
                <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-2xl border-b-4 border-cyan-700 bg-cyan-500 px-5 font-extrabold text-white shadow-lg shadow-cyan-100 transition hover:bg-cyan-600 active:translate-y-0.5 active:border-b-0 sm:w-12 sm:px-0" onClick={addSourceLink} aria-label="إضافة الرابط"><Plus className="size-5" /><span className="sm:hidden">إضافة الرابط</span></button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="أمثلة لمواقع وروابط خارجية">
                <span className="me-1 text-xs font-bold text-slate-500">يدعم أي موقع ويب:</span>
                {['Google Drive', 'YouTube', 'GitHub', 'Behance', 'Figma', 'وأي موقع آخر'].map((label, index) => <span key={label} className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${SOURCE_ACCENTS[index % SOURCE_ACCENTS.length]}`}>{label}</span>)}
              </div>
              {!!form.sources?.length && <div className="mt-5 grid gap-3 sm:grid-cols-2">{form.sources.map((source: ServiceSource, index: number) => <div key={`${source.url}-${index}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm transition hover:border-cyan-100 hover:shadow-md"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${SOURCE_ACCENTS[index % SOURCE_ACCENTS.length]}`}><Link2 className="size-4" /></span><div className="min-w-0 flex-1"><ExternalWebViewLink className="block max-w-full truncate text-sm font-extrabold text-slate-800 hover:text-sky-700" href={source.url} title={source.title}>{source.title}<ExternalLink className="ms-1 inline size-3.5" /></ExternalWebViewLink><span className="mt-1 block truncate text-[11px] text-slate-400" dir="ltr">{sourceHost(source.url)}</span></div><button type="button" className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => setForm((current) => ({ ...current, sources: current.sources?.filter((_, i) => i !== index) }))} aria-label={`حذف ${source.title}`} title="حذف الرابط"><X className="size-4" /></button></div>)}</div>}
              {form.sources?.length ? <p className="mt-3 text-xs font-semibold text-slate-500">روابط Google Drive يجب أن تكون مشاركة بحيث يستطيع العميل فتحها.</p> : null}
            </div>
          </fieldset>
          <p className="text-xs font-semibold leading-5 text-slate-500">شارك روابط المراجع والملفات التي تخص الخدمة، وتجنب إضافة معلومات شخصية حساسة.</p>
          {error && <p role="alert" className="whitespace-pre-line rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-2"><button type="submit" className="btn btn-primary flex-1" disabled={saveMutation.isPending || uploadMutation.isPending}><Plus className="size-4" />{saveMutation.isPending ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'نشر الخدمة'}</button>{editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm(emptyForm()); setError(null); }}>إلغاء</button>}</div>
        </div>
      </form>
      {mediaViewer ? <MediaLightbox items={mediaViewer.items} initialIndex={mediaViewer.index} title={mediaViewer.title} onClose={() => setMediaViewer(null)} /> : null}
      {user ? <ShareServiceModal open={Boolean(sharedService)} onClose={() => setSharedService(null)} freelancerId={user.id} service={sharedService} /> : null}
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.kind === 'media' ? 'حذف ملف من التخزين' : 'حذف الخدمة'}
        description={confirmDialog?.kind === 'media'
          ? 'سيُحذف هذا الملف نهائيًا من التخزين ولا يمكن استرجاعه. هل تريد المتابعة؟'
          : `سيتم حذف خدمة «${confirmDialog?.kind === 'service' ? confirmDialog.label : ''}» نهائيًا مع وسائطها. هل تريد المتابعة؟`}
        confirmLabel="حذف نهائي"
        busy={confirmBusy}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={runConfirm}
      />
    </div>
  );
};
