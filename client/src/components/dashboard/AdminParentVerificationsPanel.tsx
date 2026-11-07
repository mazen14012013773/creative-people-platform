import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Mail, ShieldCheck, XCircle } from 'lucide-react';
import { parentApi, type ParentVerificationRequest } from '@/services/parent.service';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';


const VerificationPhoto = ({ id }: { id: string }) => {
  const query = useQuery({ queryKey: ['parent-verification-photo', id], queryFn: () => parentApi.adminVerificationPhoto(id), retry: false, staleTime: Infinity });
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!query.data) {
      setUrl(undefined);
      return undefined;
    }
    const next = URL.createObjectURL(query.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [query.data]);

  if (query.isPending) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100"/>;
  if (query.isError || !url) return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">لا توجد صورة مرفقة بهذا الطلب.</p>;
  return <a href={url} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"><img src={url} alt="صورة ولي الأمر المرفقة للتحقق" className="h-48 w-full object-contain"/></a>;
};

const VerificationCard = ({ item, onReview, busy }: { item: ParentVerificationRequest; onReview: (item: ParentVerificationRequest, approve: boolean) => void; busy: boolean }) => (
  <article className="grid gap-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 sm:grid-cols-[220px_1fr]">
    <VerificationPhoto id={item.id}/>
    <div>
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-violet-600"/>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">بانتظار الإدارة</span>
      </div>
      <h3 className="mt-3 text-lg font-black text-slate-900">حساب المستقل: {item.childName}</h3>
      <p dir="ltr" className="mt-1 text-start text-sm text-slate-500">{item.childEmail}</p>
      <p dir="ltr" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-700"><Mail className="size-4 text-cyan-700"/>{item.parentEmail}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="size-3.5"/>وافق ولي الأمر وأجاب عن السؤال الحسابي والتقط صورته</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Clock3 className="size-3.5"/>أُرسل للمراجعة: {item.submittedAt ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.submittedAt)) : '—'}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => onReview(item, true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"><CheckCircle2 className="size-4"/>موافقة وتفعيل</button>
        <button type="button" disabled={busy} onClick={() => onReview(item, false)} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700 disabled:opacity-50"><XCircle className="size-4"/>رفض</button>
      </div>
    </div>
  </article>
);

export const AdminParentVerificationsPanel = () => {
  const toast = useToast();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ item: ParentVerificationRequest; approve: boolean } | null>(null);
  const query = useQuery({ queryKey: ['admin-parent-verifications', page], queryFn: () => parentApi.adminQueue({ page, limit: 10 }) });
  const review = useMutation({
    mutationFn: ({ id, approve, reason: text }: { id: string; approve: boolean; reason: string }) => parentApi.review(id, approve, text),
    onSuccess: async (_result, vars) => {
      setDialog(null);
      toast.success(vars.approve ? 'تم اعتماد التوثيق وتفعيل الحساب' : 'تم رفض طلب التوثيق');
      await client.invalidateQueries({ queryKey: ['admin-parent-verifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذرت مراجعة الطلب')),
  });
  const submit = () => {
    if (!dialog) return;
    review.mutate({ id: dialog.item.id, approve: dialog.approve, reason: '' });
  };
  return <section dir="rtl" className="space-y-4">
    {query.isPending ? <div className="rounded-2xl bg-white p-8 text-center text-slate-500">جارٍ تحميل طلبات التوثيق…</div> : null}
    {query.isError ? <button type="button" onClick={() => void query.refetch()} className="rounded-2xl bg-rose-50 p-5 font-bold text-rose-700">تعذر تحميل الطلبات. أعد المحاولة</button> : null}
    {query.data?.items.map((item) => <VerificationCard key={item.id} item={item} busy={review.isPending} onReview={(target, approve) => setDialog({ item: target, approve })}/>)}
    {query.data && query.data.items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">لا توجد طلبات توثيق معلقة حاليًا.</div> : null}
    {query.data && query.data.pagination.totalPages > 1 ? <Pagination pagination={query.data.pagination} onPageChange={setPage}/> : null}
    <Modal open={Boolean(dialog)} onClose={() => setDialog(null)} title={dialog?.approve ? 'اعتماد توثيق ولي الأمر' : 'رفض طلب التوثيق'} size="sm" footer={<div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setDialog(null)} className="btn btn-secondary" disabled={review.isPending}>رجوع</button><button type="button" onClick={submit} disabled={review.isPending} className={dialog?.approve ? 'btn btn-primary' : 'btn btn-danger'}>{review.isPending ? 'جارٍ التنفيذ…' : dialog?.approve ? 'اعتماد وتفعيل' : 'تأكيد الرفض'}</button></div>}>
      {dialog ? <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          <p className="font-extrabold text-slate-900">{dialog.item.childName}</p>
          <p dir="ltr" className="text-start">{dialog.item.childEmail}</p>
          <p className="mt-1 text-slate-500">{dialog.approve ? 'سيتم تفعيل حساب المستقل وإشعار ولي الأمر بنجاح التوثيق.' : 'سيُرفض الطلب ويبقى الحساب غير مفعّل حتى إعادة المحاولة.'}</p>
        </div>
      </div> : null}
    </Modal>
  </section>;
};
