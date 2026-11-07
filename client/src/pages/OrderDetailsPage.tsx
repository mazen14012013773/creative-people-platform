import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Ban, CheckCircle2, LoaderCircle, Play, RotateCcw, ShieldCheck, Star, BadgeCheck, Wallet } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderVault } from '@/components/orders/OrderVault';
import { OrderChat } from '@/components/orders/OrderChat';
import { RatingModal } from '@/components/orders/RatingModal';
import { RevisionModal } from '@/components/orders/RevisionModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { formatPrice } from '@/lib/utils';
import { ordersApi, type OrderStatus } from '@/services/orders.service';
import { orderStatusView } from '@/components/orders/OrderCard';

export const OrderDetailsPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const role = user?.role === 'Buyer' ? 'Buyer' : 'Freelancer';
  const client = useQueryClient();
  const toast = useToast();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewReply, setReviewReply] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const query = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.get(id), enabled: Boolean(id && user && ['Buyer', 'Freelancer'].includes(user.role)), refetchInterval: 5000 });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['order', id] }),
      client.invalidateQueries({ queryKey: ['orders'] }),
    ]);
  };
  const deliver = useMutation({ mutationFn: ({ files, notes, link }: { files: File[]; notes: string; link?: string }) => ordersApi.deliver(id, files, notes, link), onSuccess: async () => { toast.success('تم تسليم الملفات في الخزنة المحمية.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'تعذر رفع ملفات التسليم.')) });
  const start = useMutation({ mutationFn: () => ordersApi.start(id), onSuccess: async () => { toast.success('بدأ تنفيذ الطلب، وأُبلغ العميل بذلك.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'تعذر بدء تنفيذ الطلب.')) });
  const revise = useMutation({ mutationFn: (notes: string) => ordersApi.revise(id, notes), onSuccess: async () => { setRevisionOpen(false); toast.success('أُرسل طلب التعديل إلى المستقل.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'تعذر إرسال طلب التعديل.')) });
  const accept = useMutation({ mutationFn: () => ordersApi.accept(id), onSuccess: async () => { toast.success('\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062a\u0633\u0644\u064a\u0645. \u0623\u0631\u0633\u0644 \u062a\u0642\u064a\u064a\u0645\u0643 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0637\u0644\u0628.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'Unable to accept delivery.')) });
  const review = useMutation({ mutationFn: ({ rating, comment }: { rating: number; comment: string }) => ordersApi.review(id, rating, comment), onSuccess: async () => { setReviewOpen(false); toast.success('اكتمل الطلب، شكرًا لتقييمك.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'تعذر حفظ التقييم.')) });
  const cancel = useMutation({ mutationFn: () => ordersApi.cancel(id), onSuccess: async () => { toast.success('\u0623\u064f\u0644\u063a\u064a \u0627\u0644\u0637\u0644\u0628.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'Unable to cancel order.')) });
  const reply = useMutation({ mutationFn: (text: string) => ordersApi.reply(id, text), onSuccess: async () => { setReviewReply(''); toast.success('تم نشر ردك على التقييم.'); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, 'تعذر نشر الرد.')) });

  useEffect(() => {
    if (query.data?.status === 'AWAITING_REVIEW' && query.data.buyerId === user?.id) setReviewOpen(true);
  }, [query.data?.status, query.data?.buyerId, user?.id]);

  useDocumentTitle(query.data?.serviceTitle ?? 'تفاصيل الطلب');
  if (user && !['Buyer', 'Freelancer'].includes(user.role)) return <Navigate to="/" replace/>;
  if (query.isPending) return <PageLoader label="جارٍ تحميل تفاصيل الطلب…"/>;
  if (query.isError || !query.data) return <div dir="rtl" className="container-page py-12"><ErrorState message={getErrorMessage(query.error, 'تعذر تحميل الطلب.')} onRetry={() => void query.refetch()}/></div>;

  const order = query.data;
  const buyer = role === 'Buyer' && user?.id === order.buyerId;
  const freelancer = role === 'Freelancer' && user?.id === order.freelancerId;
  if (!buyer && !freelancer) return <div dir="rtl" className="container-page py-12"><ErrorState message="لا تملك صلاحية الوصول لهذا الطلب."/></div>;
  const status = orderStatusView(order.status);
  const canUpload = freelancer && (order.status === 'IN_PROGRESS' || order.status === 'REVISION_REQUESTED');
  const canStart = freelancer && order.status === 'PENDING';
  const canCancel = (buyer && order.status === 'PENDING') || (freelancer && (order.status === 'PENDING' || order.status === 'IN_PROGRESS'));
  const forcedReview = buyer && order.status === 'AWAITING_REVIEW';
  const otherParty = buyer ? order.freelancerName : order.buyerName;
  const confirmCancel = () => {
    setCancelOpen(true);
  };

  return <div dir="rtl" className="min-h-[70vh] bg-[#F8FAFC]">
    <section className="border-b border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-orange-50/70">
      <div className="container-page py-7 sm:py-9">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-bold text-brand-800 hover:text-brand-950"><ArrowRight className="size-4"/>العودة إلى الطلبات</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${status.style}`}>{status.label}</span><span className="text-xs font-bold text-slate-500">رقم الطلب · {order.id.slice(0, 8)}</span></div><h1 className="mt-3 break-words text-2xl font-black text-slate-950 sm:text-3xl">{order.serviceTitle}</h1><p className="mt-2 text-sm text-slate-600">{buyer ? 'المستقل' : 'العميل'}: <span className="font-extrabold text-slate-800">{otherParty}</span></p><p className="mt-1 text-xs font-semibold text-slate-500">موعد التسليم المتوقع: {new Date(order.dueAt).toLocaleDateString('ar-EG')}</p><p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800"><Wallet className="size-3.5"/>قيمة الخدمة: {formatPrice(order.priceAmount)}</p></div>
        </div>
      </div>
    </section>

    <main className="container-page min-w-0 space-y-5 py-6 sm:py-8">
      <OrderTimeline status={order.status} revisionNotes={order.revisionNotes} createdAt={order.createdAt}/>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)]">
      <OrderChat orderId={order.id} status={order.status}/>
      <aside className="min-w-0 space-y-4">
        {canStart ? <section className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-lg shadow-brand-100/40">
          <div className="flex items-start gap-3"><Play className="mt-0.5 size-5 shrink-0 text-brand-700"/><div><h2 className="font-black text-slate-900">جاهز لبدء التنفيذ؟</h2><p className="mt-1 text-xs leading-6 text-slate-600">راجع تفاصيل الطلب مع العميل، ثم ابدأ العمل ليصبح الطلب «قيد التنفيذ». يبقى بإمكان العميل الإلغاء قبل بدء العمل فقط.</p></div></div>
          <button type="button" disabled={start.isPending} onClick={() => start.mutate()} className="btn btn-primary mt-4 w-full">{start.isPending ? <LoaderCircle className="size-4 animate-spin"/> : <Play className="size-4"/>} بدء العمل على الطلب</button>
        </section> : null}
        <OrderVault orderId={order.id} status={order.status as OrderStatus} deliveries={order.deliveries ?? []} canUpload={Boolean(canUpload)} canDownloadOwn={freelancer} uploading={deliver.isPending} onUpload={(files, notes, link) => deliver.mutateAsync({ files, notes, link }).then(() => undefined)}/>
        {buyer && order.status === 'DELIVERED' ? <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700"/><div><h2 className="font-black text-slate-900">راجع التسليم</h2><p className="mt-1 text-xs leading-6 text-slate-600">{'\u0627\u0642\u0628\u0644 \u0627\u0644\u062a\u0633\u0644\u064a\u0645 \u0644\u0625\u062a\u0627\u062d\u0629 \u062a\u0646\u0632\u064a\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062a\u060c \u0623\u0648 \u0627\u0637\u0644\u0628 \u062a\u0639\u062f\u064a\u0644\u064b\u0627.'}</p></div></div>
          <button type="button" disabled={accept.isPending} onClick={() => accept.mutate()} className="btn btn-primary mt-4 w-full">{accept.isPending ? <LoaderCircle className="size-4 animate-spin"/> : <CheckCircle2 className="size-4"/>} قبول واستلام</button>
          <button type="button" onClick={() => setRevisionOpen(true)} className="btn btn-secondary mt-2 w-full"><RotateCcw className="size-4"/> طلب تعديل · متبقي {order.revisionsRemaining} من {order.revisionLimit}</button>
        </section> : null}
        {canCancel ? <button type="button" disabled={cancel.isPending} onClick={confirmCancel} className="btn btn-secondary w-full text-rose-700"><Ban className="size-4"/>{'\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628'}</button> : null}
        {forcedReview ? <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 text-sm leading-6 text-violet-950"><p className="font-extrabold">التسليم مقبول وينتظر تقييمك</p><p className="mt-1 text-xs">يمكنك تقييم الطلب الآن أو لاحقًا من هذه الصفحة. تصفحك للمنصة وبقية طلباتك غير مقيد.</p><button type="button" onClick={() => setReviewOpen(true)} className="btn btn-primary mt-3 w-full">قيّم الطلب الآن</button></div> : null}
        {order.status === 'COMPLETED' ? <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold leading-6 text-emerald-900">اكتمل الطلب والتقييم. يمكنك تنزيل ملفات التسليم من الخزنة.</div> : null}
        {order.status === 'COMPLETED' && order.review ? <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-lg shadow-slate-200/30">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black text-slate-900">تقييم الطلب</h2><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-800"><BadgeCheck className="size-4"/>طلب موثق ومكتمل 🌟</span></div>
          <div className="mt-4 flex items-center gap-1" aria-label={`التقييم ${order.review.rating} من 5`}>
            {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-5 ${index < order.review!.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}/>)}
          </div>
          <p className="mt-3 text-sm font-extrabold text-slate-800">{order.review.clientName}</p>
          {order.review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{order.review.comment}</p> : <p className="mt-2 text-sm text-slate-400">لم يضف العميل تعليقاً.</p>}
          <time className="mt-3 block text-xs text-slate-400">{new Date(order.review.createdAt).toLocaleString('ar-EG')}</time>
          {order.review.freelancerReply ? <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-xs font-extrabold text-cyan-900">رد المستقل</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.review.freelancerReply}</p>{order.review.repliedAt ? <time className="mt-2 block text-[11px] text-slate-400">{new Date(order.review.repliedAt).toLocaleString('ar-EG')}</time> : null}</div> : freelancer ? <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); if (reviewReply.trim()) reply.mutate(reviewReply.trim()); }}><label htmlFor="order-review-reply" className="text-xs font-extrabold text-slate-700">أضف ردك على التقييم</label><textarea id="order-review-reply" value={reviewReply} onChange={(event) => setReviewReply(event.target.value)} maxLength={2000} rows={3} className="input resize-y" placeholder="اكتب رداً مهنياً للعميل"/><button type="submit" disabled={reply.isPending || reviewReply.trim().length < 2} className="btn btn-primary w-full">{reply.isPending ? <LoaderCircle className="size-4 animate-spin"/> : null}نشر الرد</button></form> : null}
        </section> : null}
        {order.status === 'CANCELLED' ? <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-bold leading-6 text-slate-700">{'\u0623\u064f\u0644\u063a\u064a \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628.'}</div> : null}
      </aside>
      </div>
    </main>

    <RevisionModal open={revisionOpen} pending={revise.isPending} remaining={order.revisionsRemaining} limit={order.revisionLimit} onClose={() => setRevisionOpen(false)} onSubmit={(notes) => revise.mutate(notes)}/>
    <RatingModal key={order.id} open={Boolean(forcedReview && reviewOpen)} pending={review.isPending} freelancerName={order.freelancerName} onClose={() => setReviewOpen(false)} onSubmit={(rating, comment) => review.mutate({ rating, comment })}/>
    <ConfirmDialog
      open={cancelOpen}
      title="إلغاء الطلب"
      description="سيتم إلغاء الطلب نهائيًا وإبلاغ الطرف الآخر. هل تريد المتابعة؟"
      confirmLabel="إلغاء الطلب"
      cancelLabel="تراجع"
      busy={cancel.isPending}
      onCancel={() => setCancelOpen(false)}
      onConfirm={() => cancel.mutate(undefined, { onSuccess: () => setCancelOpen(false) })}
    />
  </div>;
};
