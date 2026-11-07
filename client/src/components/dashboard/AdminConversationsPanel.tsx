import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Eye,
  LockKeyhole,
  MessageSquareText,
  Paperclip,
  Search,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminInspectionParams } from '@/services/admin.service';
import type { AdminInspectionConversation, AdminInspectionTranscript, AdminOrder } from '@/types';
import { AdminProtectedFile } from './AdminProtectedFile';

const DEFAULT_REASON = 'تفتيش إداري شامل من لوحة السيطرة';

const KIND_LABELS: Record<AdminInspectionConversation['kind'], string> = {
  direct: 'محادثة مباشرة',
  order: 'محادثة طلب',
};

const ORDER_STATUS_LABELS: Record<AdminOrder['status'], string> = {
  PENDING: 'قيد الانتظار',
  IN_PROGRESS: 'قيد التنفيذ',
  DELIVERED: 'تم التسليم',
  REVISION_REQUESTED: 'تعديل مطلوب',
  AWAITING_REVIEW: 'بانتظار التقييم',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

export const AdminConversationsPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const queryText = useDebounce(search, 350);
  const [kind, setKind] = useState<'' | 'direct' | 'order'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminInspectionConversation | null>(null);
  const [transcript, setTranscript] = useState<AdminInspectionTranscript | null>(null);

  useEffect(() => setPage(1), [queryText, kind, from, to]);

  const params: AdminInspectionParams = {
    q: queryText.trim() || undefined,
    kind: kind || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: 15,
  };

  const conversationsQuery = useQuery({
    queryKey: ['admin-all-conversations', params],
    queryFn: () => adminApi.allConversations(params),
  });

  const transcriptMutation = useMutation({
    mutationFn: ({ conversationId, viewReason }: { conversationId: string; viewReason: string }) =>
      adminApi.conversationTranscript(conversationId, viewReason),
    onSuccess: (data) => {
      setTranscript(data);
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
      toast.success('تم تسجيل مراجعة المحادثة في سجل التدقيق');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر فتح المحادثة')),
  });

  const openConversation = (conversation: AdminInspectionConversation) => {
    setSelected(conversation);
    setTranscript(null);
    transcriptMutation.reset();
  };

  const viewTranscript = () => {
    if (!selected) return;
    transcriptMutation.mutate({ conversationId: selected.id, viewReason: DEFAULT_REASON });
  };

  const closeTranscript = () => {
    setSelected(null);
    setTranscript(null);
    transcriptMutation.reset();
  };

  const exportCsv = () => {
    const items = conversationsQuery.data?.items ?? [];

    if (items.length === 0) {
      return;
    }

    downloadCsv(csvFilename('conversations'), [
      [
        'نوع المحادثة',
        'الطرف الأول',
        'بريد الطرف الأول',
        'الطرف الثاني',
        'بريد الطرف الثاني',
        'الخدمة أو الطلب',
        'حالة الطلب',
        'عدد الرسائل',
        'عدد المرفقات',
        'آخر رسالة',
        'آخر نشاط',
      ],
      ...items.map((conversation) => [
        KIND_LABELS[conversation.kind],
        conversation.participantA.name,
        conversation.participantA.email,
        conversation.participantB.name,
        conversation.participantB.email,
        conversation.serviceTitle ?? '',
        conversation.orderStatus ? ORDER_STATUS_LABELS[conversation.orderStatus] : '',
        conversation.messageCount,
        conversation.attachmentCount,
        conversation.lastMessage,
        formatDate(conversation.lastMessageAt),
      ]),
    ]);
  };

  const activeReason = DEFAULT_REASON;

  return (
    <section className="card p-5 sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <MessageSquareText className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">مراقبة المحادثات والوسائط</h2>
            <p className="mt-1 max-w-2xl text-xs font-semibold leading-6 text-slate-500">
              سجل موحد للمحادثات المباشرة ومحادثات الطلبات. افتح أي محادثة لقراءة النص كاملاً ومعاينة
              الصور والفيديو والصوت وتحميل أي مرفق — وكل فتح يُسجَّل باسمك وسببه.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversationsQuery.isFetching ? <Spinner className="size-5" /> : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!conversationsQuery.data || conversationsQuery.data.items.length === 0}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input ps-9"
            placeholder="ابحث باسم أو بريد أي طرف، أو اسم الخدمة/رقم الطلب"
            aria-label="البحث في المحادثات"
          />
        </div>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as '' | 'direct' | 'order')}
          className="input"
          aria-label="فلترة بنوع المحادثة"
        >
          <option value="">كل المحادثات</option>
          <option value="direct">مباشرة</option>
          <option value="order">طلبات</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-slate-500">من تاريخ</span>
            <input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="input"
              aria-label="من تاريخ"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-slate-500">إلى تاريخ</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="input"
              aria-label="إلى تاريخ"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {conversationsQuery.isError ? (
          <ErrorState message="تعذر تحميل المحادثات." onRetry={() => void conversationsQuery.refetch()} />
        ) : conversationsQuery.isPending ? (
          <PageLoader label="جارٍ تحميل المحادثات..." />
        ) : conversationsQuery.data.items.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="لا توجد محادثات مطابقة"
            description="جرّب تغيير كلمة البحث أو نوع المحادثة أو نطاق التاريخ."
            compact
          />
        ) : (
          conversationsQuery.data.items.map((conversation) => (
            <article
              key={conversation.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex shrink-0 items-center -space-x-3">
                <Avatar
                  name={conversation.participantA.name}
                  src={conversation.participantA.avatarUrl}
                  className="size-10 rounded-xl ring-2 ring-white"
                />
                <Avatar
                  name={conversation.participantB.name}
                  src={conversation.participantB.avatarUrl}
                  className="size-10 rounded-xl ring-2 ring-white"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {conversation.participantA.name} <span className="text-slate-400">↔</span>{' '}
                    {conversation.participantB.name}
                  </p>
                  <Badge tone={conversation.kind === 'order' ? 'brand' : 'slate'}>
                    {conversation.kind === 'order' ? (
                      <>
                        <ShoppingBag className="me-1 size-3" />
                        {KIND_LABELS.order}
                      </>
                    ) : (
                      KIND_LABELS.direct
                    )}
                  </Badge>
                  {conversation.orderStatus ? (
                    <Badge tone="sky">{ORDER_STATUS_LABELS[conversation.orderStatus]}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500" dir="ltr">
                  {conversation.participantA.email} · {conversation.participantB.email}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {conversation.lastMessage || 'لا توجد رسائل نصية'}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-brand-700">
                  <span>{conversation.serviceTitle ?? (conversation.kind === 'order' ? 'طلب مباشر' : 'محادثة عامة')}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquareText className="size-3" />
                    {conversation.messageCount} رسالة
                  </span>
                  {conversation.attachmentCount > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="size-3" />
                      {conversation.attachmentCount} مرفق
                    </span>
                  ) : null}
                  <span className="text-slate-400">{formatDate(conversation.lastMessageAt)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => openConversation(conversation)}
                className="btn btn-secondary btn-sm shrink-0"
              >
                <Eye className="size-4" />
                فتح للتفتيش
              </button>
            </article>
          ))
        )}
      </div>

      {conversationsQuery.data ? (
        <div className="mt-5">
          <Pagination pagination={conversationsQuery.data.pagination} onPageChange={setPage} />
        </div>
      ) : null}

      <Modal
        open={Boolean(selected)}
        onClose={closeTranscript}
        title={selected ? `${selected.participantA.name} ↔ ${selected.participantB.name}` : ''}
        size="xl"
        footer={
          <div className="flex justify-end">
            <button type="button" onClick={closeTranscript} className="btn btn-secondary">
              إغلاق
            </button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-4" dir="rtl">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              <Badge tone={selected.kind === 'order' ? 'brand' : 'slate'}>{KIND_LABELS[selected.kind]}</Badge>
              {selected.orderId ? <span dir="ltr">#{selected.orderId.slice(0, 8)}</span> : null}
              <span>{selected.serviceTitle ?? 'بدون خدمة مرتبطة'}</span>
              <span>·</span>
              <span>{selected.messageCount} رسالة</span>
              {selected.attachmentCount > 0 ? <span>· {selected.attachmentCount} مرفق</span> : null}
            </div>

            <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
              <LockKeyhole className="mt-0.5 size-5 shrink-0" />
              <p>يُسجَّل الاطلاع باسم المشرف وسببه التلقائي في سجل التدقيق.</p>
            </div>

            <button
              type="button"
              onClick={viewTranscript}
              disabled={transcriptMutation.isPending}
              className="btn btn-primary w-full"
            >
              {transcriptMutation.isPending ? <Spinner className="size-4" /> : <ShieldCheck className="size-4" />}
              عرض المحادثة بعد تسجيل الاطلاع
            </button>

            {transcript ? (
              <div className="max-h-[55vh] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
                {transcript.items.length === 0 ? (
                  <p className="py-8 text-center text-xs font-semibold text-slate-500">لا توجد رسائل في هذه المحادثة.</p>
                ) : (
                  transcript.items.map((message) => {
                    const fromA = message.senderId === transcript.conversation.participantA.id;

                    return (
                      <div key={message.id} className={`flex ${fromA ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                            fromA
                              ? 'bg-brand-700 text-white'
                              : 'border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <p className="text-[10px] font-extrabold opacity-70">
                            {message.senderName}
                            {message.receiverName ? ` → ${message.receiverName}` : ''}
                          </p>
                          {message.content ? (
                            <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">
                              {message.content}
                            </p>
                          ) : null}
                          {message.attachment ? (
                            <div className="mt-2">
                              <AdminProtectedFile
                                name={message.attachment.name}
                                mimeType={message.attachment.mimeType}
                                size={message.attachment.size}
                                fetchBlob={(download) =>
                                  adminApi.chatAttachment(message.attachment!.messageId, activeReason, download)
                                }
                                compact
                              />
                            </div>
                          ) : null}
                          <time className="mt-1 block text-[10px] opacity-60">{formatDate(message.createdAt)}</time>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
};
