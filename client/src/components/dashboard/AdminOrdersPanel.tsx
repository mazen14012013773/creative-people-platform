import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FileSearch,
  Gavel,
  MessageSquareText,
  Search,
  ShoppingBag,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { InlineLoader, PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate, formatPrice } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminOrdersParams } from '@/services/admin.service';
import type { AdminOrder, AdminOrderFullTranscript } from '@/types';
import { AdminProtectedFile } from './AdminProtectedFile';

type OrderStatus = AdminOrder['status'];
type Dialog = { order: AdminOrder; action: 'CANCEL' | 'CLOSE' } | null;

const DEFAULT_INSPECT_REASON = 'تفتيش إداري شامل على الطلب والخزنة';
const MIN_INSPECT_REASON = 5;

const STATUS_OPTIONS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'كل الحالات' },
  { value: 'PENDING', label: 'قيد الانتظار' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { value: 'DELIVERED', label: 'تم التسليم' },
  { value: 'REVISION_REQUESTED', label: 'تعديل مطلوب' },
  { value: 'AWAITING_REVIEW', label: 'بانتظار التقييم' },
  { value: 'COMPLETED', label: 'مكتمل' },
  { value: 'CANCELLED', label: 'ملغى' },
];

const STATUS_LABEL: Record<OrderStatus, { label: string; tone: 'brand' | 'amber' | 'slate' | 'rose' | 'emerald' | 'sky' }> = {
  PENDING: { label: 'قيد الانتظار', tone: 'slate' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'brand' },
  DELIVERED: { label: 'تم التسليم', tone: 'sky' },
  REVISION_REQUESTED: { label: 'تعديل مطلوب', tone: 'amber' },
  AWAITING_REVIEW: { label: 'بانتظار التقييم', tone: 'amber' },
  COMPLETED: { label: 'مكتمل', tone: 'emerald' },
  CANCELLED: { label: 'ملغى', tone: 'rose' },
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} بايت`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} ك.ب`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};

export const AdminOrdersPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const debouncedQ = useDebounce(q, 400);
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [reason, setReason] = useState('');
  const [grantPoints, setGrantPoints] = useState(false);
  const [inspectOrder, setInspectOrder] = useState<AdminOrder | null>(null);
  const [inspectReason, setInspectReason] = useState(DEFAULT_INSPECT_REASON);
  const [inspectData, setInspectData] = useState<AdminOrderFullTranscript | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status]);

  useEffect(() => {
    if (dialog) {
      setReason('');
      setGrantPoints(false);
    }
  }, [dialog]);

  const params: AdminOrdersParams = useMemo(
    () => ({
      q: debouncedQ.trim() || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [debouncedQ, status, page],
  );

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => adminApi.orders(params),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-order-detail', detailOrder?.id],
    queryFn: () => adminApi.orderDetail(detailOrder!.id),
    enabled: Boolean(detailOrder),
  });

  const actionMutation = useMutation({
    mutationFn: ({
      order,
      action,
      arbitrationReason,
      grantCompletionPoints,
     
    }: {
      order: AdminOrder;
      action: 'CANCEL' | 'CLOSE';
      arbitrationReason: string;
      grantCompletionPoints: boolean;
     
    }) => adminApi.forceOrderAction(order.id, action, arbitrationReason, grantCompletionPoints),
    onSuccess: async (_data, variables) => {
      setDialog(null);
      toast.success(
        variables.action === 'CANCEL'
          ? 'تم إلغاء الطلب بقرار إداري.'
          : 'تم إغلاق الطلب بقرار إداري.',
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order', variables.order.id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-audit'] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تنفيذ القرار الإداري.')),
  });

  const inspectMutation = useMutation({
    mutationFn: ({ orderId, viewReason }: { orderId: string; viewReason: string }) =>
      adminApi.orderFullTranscript(orderId, viewReason),
    onSuccess: (data) => {
      setInspectData(data);
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
      toast.success('تم تسجيل تفتيش الطلب في سجل التدقيق');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر فتح تفتيش الطلب')),
  });

  const openInspection = (order: AdminOrder) => {
    setDetailOrder(null);
    setInspectOrder(order);
    setInspectReason(DEFAULT_INSPECT_REASON);
    setInspectData(null);
    inspectMutation.reset();
  };

  const closeInspection = () => {
    setInspectOrder(null);
    setInspectData(null);
    inspectMutation.reset();
  };

  const runInspection = () => {
    if (!inspectOrder || inspectReason.trim().length < MIN_INSPECT_REASON) {
      return;
    }

    inspectMutation.mutate({ orderId: inspectOrder.id, viewReason: inspectReason.trim() });
  };

  const submit = () => {
    if (!dialog) {
      return;
    }

    const trimmed = reason.trim() || 'Administrative action';

    actionMutation.mutate({
      order: dialog.order!,
      action: dialog.action!,
      arbitrationReason: trimmed,
      grantCompletionPoints: dialog.action === 'CLOSE' ? grantPoints : false,
    });
  };

  const exportCsv = () => {
    const items = ordersQuery.data?.items ?? [];

    if (items.length === 0) {
      return;
    }

    downloadCsv(csvFilename('orders'), [
      [
        'رقم الطلب',
        'الخدمة',
        'المشتري',
        'بريد المشتري',
        'المستقل',
        'بريد المستقل',
        'الحالة',
        'القيمة',
        'نسخة التسليم',
        'التعديلات المستخدمة',
        'حد التعديلات',
        'تاريخ الإنشاء',
        'موعد التسليم',
      ],
      ...items.map((order) => [
        order.id,
        order.serviceTitle,
        order.buyerName,
        order.buyerEmail,
        order.freelancerName,
        order.freelancerEmail,
        STATUS_LABEL[order.status].label,
        order.priceAmount,
        order.deliveryVersion,
        order.revisionsUsed,
        order.revisionLimit,
        formatDate(order.createdAt),
        formatDate(order.dueAt),
      ]),
    ]);
  };

  const isTerminal = (order: AdminOrder) =>
    order.status === 'COMPLETED' || order.status === 'CANCELLED';

  const openAction = (order: AdminOrder, action: 'CANCEL' | 'CLOSE') => {
    setDetailOrder(null);
    setDialog({ order, action });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">إدارة الطلبات والنزاعات</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            راجع تفاصيل الطلب كاملة (الخط الزمني، الخزنة، الرسائل) ثم افتح قراراً إدارياً موثقاً.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ordersQuery.isFetching ? <Spinner className="size-5" /> : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!ordersQuery.data || ordersQuery.data.items.length === 0}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="input ps-9"
            placeholder="ابحث برقم الطلب أو الخدمة أو اسم/بريد الطرفين..."
            aria-label="البحث في الطلبات"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as '' | OrderStatus)}
          className="input"
          aria-label="فلترة بحالة الطلب"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        {ordersQuery.isError ? (
          <ErrorState message="تعذر تحميل الطلبات." onRetry={() => void ordersQuery.refetch()} />
        ) : ordersQuery.isPending ? (
          <PageLoader label="جارٍ تحميل الطلبات..." />
        ) : ordersQuery.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-225 border-collapse text-start">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-start">الطلب</th>
                    <th className="px-4 py-3 text-start">الأطراف</th>
                    <th className="px-4 py-3 text-start">الحالة</th>
                    <th className="px-4 py-3 text-start">القيمة</th>
                    <th className="px-4 py-3 text-start">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersQuery.data.items.map((order) => {
                    const view = STATUS_LABEL[order.status];
                    const terminal = isTerminal(order);

                    return (
                      <tr key={order.id} className="align-middle">
                        <td className="px-4 py-3">
                          <p className="text-sm font-extrabold text-slate-900">{order.serviceTitle}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                            #{order.id.slice(0, 8)} — {formatDate(order.createdAt)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            تعديلات: {order.revisionsUsed} من {order.revisionLimit} — التسليم v{order.deliveryVersion}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-bold text-slate-700">المشتري: {order.buyerName}</p>
                          <p className="text-slate-400">{order.buyerEmail}</p>
                          <p className="mt-1 font-bold text-slate-700">المستقل: {order.freelancerName}</p>
                          <p className="text-slate-400">{order.freelancerEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={view.tone}>{view.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-extrabold text-slate-800">
                          {formatPrice(order.priceAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailOrder(order)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                            >
                              <Eye className="size-4" />
                              التفاصيل
                            </button>
                            <button
                              type="button"
                              onClick={() => openInspection(order)}
                              className="inline-flex items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-800 transition hover:bg-brand-100"
                            >
                              <FileSearch className="size-4" />
                              تفتيش الطلب بالكامل
                            </button>
                            {terminal ? null : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openAction(order, 'CLOSE')}
                                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  <CheckCircle2 className="size-4" /> إغلاق إداري
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(order, 'CANCEL')}
                                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100"
                                >
                                  <Ban className="size-4" /> إلغاء إداري
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination pagination={ordersQuery.data.pagination} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState icon={ShoppingBag} title="لا توجد طلبات مطابقة" description="غيّر كلمات البحث أو فلتر الحالة لعرض نتائج أخرى." />
        )}
      </div>

      <Modal
        open={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
        title={detailOrder ? `تفاصيل الطلب: ${detailOrder.serviceTitle}` : 'تفاصيل الطلب'}
        size="xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDetailOrder(null)}>
              إغلاق
            </button>
            {detailOrder ? (
              <button type="button" className="btn btn-secondary" onClick={() => openInspection(detailOrder)}>
                <FileSearch className="size-4" />
                تفتيش الطلب بالكامل
              </button>
            ) : null}
            {detailOrder && !isTerminal(detailOrder) ? (
              <>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => openAction(detailOrder, 'CANCEL')}
                >
                  <Ban className="size-4" />
                  إلغاء إداري
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openAction(detailOrder, 'CLOSE')}
                >
                  <CheckCircle2 className="size-4" />
                  إغلاق إداري
                </button>
              </>
            ) : null}
          </div>
        }
      >
        {detailQuery.isPending ? (
          <PageLoader label="جارٍ تحميل تفاصيل الطلب..." />
        ) : detailQuery.isError || !detailQuery.data ? (
          <ErrorState
            message="تعذر تحميل تفاصيل الطلب."
            onRetry={() => void detailQuery.refetch()}
          />
        ) : (
          (() => {
            const detail = detailQuery.data;
            const order = detail.order;
            const view = STATUS_LABEL[order.status];

            return (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-500">الحالة</p>
                    <div className="mt-1">
                      <Badge tone={view.tone}>{view.label}</Badge>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-500">القيمة</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      {formatPrice(order.priceAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-500">موعد التسليم</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      {formatDate(order.dueAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-500">التعديلات</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      {order.revisionsUsed} / {order.revisionLimit}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-[11px] font-bold text-slate-500">المشتري</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">{order.buyerName}</p>
                    <p className="text-xs text-slate-500" dir="ltr">{order.buyerEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-[11px] font-bold text-slate-500">المستقل</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">{order.freelancerName}</p>
                    <p className="text-xs text-slate-500" dir="ltr">{order.freelancerEmail}</p>
                  </div>
                </div>

                <section>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <FileArchive className="size-4 text-brand-700" />
                    الخزنة والتسليمات ({detail.deliveries.length})
                  </h3>
                  {detail.deliveries.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {detail.deliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-900">
                              v{delivery.versionNumber} — {delivery.originalFilename}
                            </span>
                            <span>{formatBytes(delivery.fileSize)}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {delivery.mimeType} • {formatDate(delivery.createdAt)}
                          </p>
                          {delivery.freelancerNotes ? (
                            <p className="mt-1 whitespace-pre-wrap">{delivery.freelancerNotes}</p>
                          ) : null}
                          <p dir="ltr" className="mt-1 truncate text-[10px] text-slate-400">
                            SHA256: {delivery.sha256}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                      لم يُسلّم المستقل أي ملفات بعد.
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <MessageSquareText className="size-4 text-brand-700" />
                    رسائل الطلب ({detail.messages.length})
                  </h3>
                  {detail.messages.length > 0 ? (
                    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                      {detail.messages.map((message) => (
                        <div key={message.id} className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800">
                              {message.senderName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-700">
                            {message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                      لا توجد رسائل داخل هذا الطلب.
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Star className="size-4 text-brand-700" />
                    الخط الزمني ({detail.events.length})
                  </h3>
                  {detail.events.length > 0 ? (
                    <ol className="mt-2 space-y-2">
                      {detail.events.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-900">{event.eventType}</span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(event.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {event.actorName ?? 'النظام'}
                          </p>
                          {event.details ? (
                            <p className="mt-1 whitespace-pre-wrap">{event.details}</p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                      لا توجد أحداث مسجّلة على هذا الطلب.
                    </p>
                  )}
                </section>
              </div>
            );
          })()
        )}
      </Modal>

      <Modal
        open={Boolean(inspectOrder)}
        onClose={closeInspection}
        title={inspectOrder ? `تفتيش الطلب بالكامل: ${inspectOrder.serviceTitle}` : 'تفتيش الطلب'}
        size="xl"
        footer={
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary" onClick={closeInspection}>
              إغلاق
            </button>
          </div>
        }
      >
        {inspectOrder ? (
          !inspectData ? (
            <div className="space-y-4" dir="rtl">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                سيتم عرض محادثة الطلب كاملة، وكل ملفات الخزنة والتسليمات بمعاينتها وتحميلها، والخط
                الزمني وأسباب التعديلات. يُسجَّل السبب والمسؤول ووقت الاطلاع في سجل التدقيق.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                <p className="font-extrabold text-slate-900">{inspectOrder.serviceTitle}</p>
                <p>المشتري: {inspectOrder.buyerName} — المستقل: {inspectOrder.freelancerName}</p>
                <p>الحالة: {STATUS_LABEL[inspectOrder.status].label}</p>
              </div>
              <label className="block">
                <span className="label">سبب التفتيش</span>
                <textarea
                  className="input min-h-20"
                  value={inspectReason}
                  onChange={(event) => setInspectReason(event.target.value)}
                  maxLength={300}
                  placeholder="اكتب سبباً واضحاً سيُسجَّل في سجل التدقيق..."
                />
                <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                  {inspectReason.trim().length < MIN_INSPECT_REASON
                    ? `أدخل ${MIN_INSPECT_REASON} أحرف على الأقل`
                    : `${inspectReason.trim().length}/300`}
                </span>
              </label>
              <button
                type="button"
                onClick={runInspection}
                disabled={inspectReason.trim().length < MIN_INSPECT_REASON || inspectMutation.isPending}
                className="btn btn-primary w-full"
              >
                {inspectMutation.isPending ? <InlineLoader label="جارٍ فتح التفتيش" /> : <><FileSearch className="size-4" /> تأكيد السبب وفتح التفتيش الشامل</>}
              </button>
            </div>
          ) : (
            <div className="space-y-5" dir="rtl">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Badge tone={STATUS_LABEL[inspectData.order.status].tone}>
                  {STATUS_LABEL[inspectData.order.status].label}
                </Badge>
                <span className="text-xs font-extrabold text-slate-800">{formatPrice(inspectData.order.priceAmount)}</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  التسليم v{inspectData.order.deliveryVersion} · التعديلات {inspectData.order.revisionsUsed}/{inspectData.order.revisionLimit}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">سبب التفتيش: {inspectReason.trim() || DEFAULT_INSPECT_REASON}</span>
              </div>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <MessageSquareText className="size-4 text-brand-700" />
                  محادثة الطلب ({inspectData.messages.length})
                </h3>
                {inspectData.messages.length > 0 ? (
                  <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
                    {inspectData.messages.map((message) => (
                      <div key={message.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-800">{message.senderName}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(message.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-700">{message.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                    لا توجد رسائل داخل هذا الطلب.
                  </p>
                )}
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <FileArchive className="size-4 text-brand-700" />
                  الخزنة والتسليمات ({inspectData.vaultFiles.length})
                </h3>
                {inspectData.vaultFiles.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {inspectData.vaultFiles.map((file) => (
                      <div key={file.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="font-extrabold text-slate-900">v{file.versionNumber}</span>
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                        {file.freelancerNotes ? (
                          <p className="mb-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-2 py-1.5 text-xs leading-6 text-slate-700">
                            ملاحظات المستقل: {file.freelancerNotes}
                          </p>
                        ) : null}
                        <AdminProtectedFile
                          name={file.originalFilename}
                          mimeType={file.mimeType}
                          size={file.fileSize}
                          fetchBlob={(download) =>
                            adminApi.orderVaultFile(
                              inspectData.order.id,
                              file.id,
                              inspectReason.trim() || DEFAULT_INSPECT_REASON,
                              download,
                            )
                          }
                        />
                        <p dir="ltr" className="mt-2 truncate text-[10px] text-slate-400">SHA256: {file.sha256}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                    لم يُسلّم المستقل أي ملفات بعد.
                  </p>
                )}
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Star className="size-4 text-brand-700" />
                  الخط الزمني وأسباب التعديل ({inspectData.events.length})
                </h3>
                {inspectData.events.length > 0 ? (
                  <ol className="mt-2 space-y-2">
                    {inspectData.events.map((event) => (
                      <li key={event.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900">{event.eventType}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(event.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">{event.actorName ?? 'النظام'}</p>
                        {event.details ? <p className="mt-1 whitespace-pre-wrap">{event.details}</p> : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                    لا توجد أحداث مسجّلة على هذا الطلب.
                  </p>
                )}
              </section>

              {inspectData.review ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
                    <Star className="size-4" />
                    تقييم العميل ({inspectData.review.rating}/5)
                  </h3>
                  <p className="mt-1 text-xs font-bold text-amber-900">{inspectData.review.clientName}</p>
                  {inspectData.review.comment ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-amber-900">{inspectData.review.comment}</p>
                  ) : null}
                  {inspectData.review.freelancerReply ? (
                    <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs leading-6 text-slate-700">
                      رد المستقل: {inspectData.review.freelancerReply}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </div>
          )
        ) : null}
      </Modal>

      <Modal
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog?.action === 'CANCEL' ? 'إلغاء الطلب بقرار إداري' : 'إغلاق الطلب بقرار إداري'}
        size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDialog(null)} className="btn btn-secondary" disabled={actionMutation.isPending}>رجوع</button>
            <button type="button" onClick={submit} disabled={actionMutation.isPending} className="btn btn-primary">
              {actionMutation.isPending ? <InlineLoader label="جارٍ التنفيذ" /> : <><Gavel className="size-4" /> تنفيذ القرار</>}
            </button>
          </div>
        }
      >
        {dialog ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
              <p className="font-extrabold text-slate-900">{dialog.order.serviceTitle}</p>
              <p>المشتري: {dialog.order.buyerName} — المستقل: {dialog.order.freelancerName}</p>
              <p>الحالة الحالية: {STATUS_LABEL[dialog.order.status].label}</p>
              <p className="mt-1 text-slate-500">
                {dialog.action === 'CANCEL'
                  ? 'سيُغلق الطلب كملغى نهائياً وستصل إشعارات للطرفين، ولن تُمنح نقاط إكمال.'
                  : 'سيُغلق الطلب كمكتمل. قرار منح نقاط الإكمال للمستقل متروك لمراجعتك أدناه.'}
              </p>
            </div>

            {dialog.action === 'CLOSE' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <Switch
                  checked={grantPoints}
                  onChange={setGrantPoints}
                  label="منح نقاط إكمال الطلب للمستقل"
                  description="فعّلها فقط إذا تحقق التسليم المتفق عليه. الإغلاق بدونها لا يمنح أي نقاط."
                />
              </div>
            ) : null}

          </div>
        ) : null}
      </Modal>
    </section>
  );
};
