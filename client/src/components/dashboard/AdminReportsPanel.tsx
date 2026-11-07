import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  Flag,
  MessageSquareWarning,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminReportsParams } from '@/services/admin.service';
import type { AdminUnifiedReport } from '@/types';

type ReportActionKind =
  | 'TEMP_BLOCK'
  | 'PERMANENT_BLOCK'
  | 'WARNING'
  | 'DISMISS'
  | 'RESOLVE'
  | 'REOPEN';

interface ActionDialog {
  report: AdminUnifiedReport;
  kind: ReportActionKind;
}

const MIN_REASON = 0;

const CATEGORY_LABELS: Record<string, string> = {
  FRAUD: 'احتيال',
  INAPPROPRIATE: 'محتوى غير لائق',
  IMPERSONATION: 'انتحال شخصية',
  NONCOMPLIANCE: 'عدم الالتزام',
  OTHER: 'أخرى',
  contact_info: 'بيانات تواصل',
  external_link: 'رابط خارجي',
  phone_number: 'رقم هاتف',
  email: 'بريد إلكتروني',
  profanity: 'ألفاظ غير لائقة',
  blocked_term: 'مصطلح محظور',
};

const DEFAULT_NOTES: Record<ReportActionKind, string> = {
  TEMP_BLOCK: 'حظر مؤقت لمدة 7 أيام بعد مراجعة البلاغ.',
  PERMANENT_BLOCK: 'حظر دائم بعد مراجعة البلاغ.',
  WARNING: '',
  DISMISS: 'تمت مراجعة البلاغ وحفظه دون إجراء.',
  RESOLVE: 'تمت معالجة بلاغ المحتوى وإزالة المخالفة.',
  REOPEN: 'إعادة فتح البلاغ للمراجعة.',
};

const ACTION_LABELS: Record<ReportActionKind, string> = {
  TEMP_BLOCK: 'حظر الحساب 7 أيام',
  PERMANENT_BLOCK: 'حظر الحساب نهائيًا',
  WARNING: 'إرسال تحذير للمستخدم',
  DISMISS: 'تجاهل البلاغ',
  RESOLVE: 'معالجة البلاغ',
  REOPEN: 'إعادة فتح البلاغ',
};

const STATUS_LABELS: Record<AdminUnifiedReport['status'], string> = {
  PENDING: 'قيد الانتظار',
  RESOLVED: 'تمت المعالجة',
  DISMISSED: 'متجاهَل',
};

const ROLE_LABELS: Record<string, string> = {
  Freelancer: 'مستقل',
  Buyer: 'مشتري',
  Parent: 'ولي أمر',
  Admin: 'أدمن',
};

const confirmButtonClass = (kind: ReportActionKind): string => {
  if (kind === 'TEMP_BLOCK' || kind === 'PERMANENT_BLOCK') return 'btn btn-danger';
  if (kind === 'WARNING') return 'btn btn-secondary';
  if (kind === 'DISMISS') return 'btn btn-ghost';
  return 'btn btn-primary';
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  TEMP_BLOCK: 'حظر مؤقت',
  PERMANENT_BLOCK: 'حظر دائم',
  WARNING: 'تحذير',
  DISMISS: 'تجاهل',
};

const STATUS_TONES: Record<AdminUnifiedReport['status'], 'amber' | 'emerald' | 'slate'> = {
  PENDING: 'amber',
  RESOLVED: 'emerald',
  DISMISSED: 'slate',
};

const Evidence = ({
  reportId,
  proof,
}: {
  reportId: string;
  proof: { id: string; name: string; mimeType: string };
}) => {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    let objectUrl = '';

    adminApi
      .accountReportEvidence(reportId, proof.id)
      .then((blob) => {
        if (live) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });

    return () => {
      live = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [reportId, proof.id]);

  if (failed) {
    return (
      <span className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
        تعذر تحميل {proof.name}
      </span>
    );
  }

  if (!url) {
    return (
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
        جارٍ تحميل {proof.name}
      </span>
    );
  }

  return proof.mimeType.startsWith('image/') ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-slate-200"
    >
      <img src={url} alt={proof.name} className="h-28 w-40 object-cover" />
    </a>
  ) : (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-brand-800"
    >
      <Eye className="size-4" />
      {proof.name}
    </a>
  );
};

export const AdminReportsPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AdminReportsParams['status']>('PENDING');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<ActionDialog | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => setPage(1), [status]);

  useEffect(() => {
    setNotes(dialog ? DEFAULT_NOTES[dialog.kind] : '');
  }, [dialog]);

  const params: AdminReportsParams = { status, page, limit: 15 };

  const query = useQuery({
    queryKey: ['admin-reports', params],
    queryFn: () => adminApi.reports(params),
  });

  const action = useMutation({
    mutationFn: async ({
      report,
      kind,
      reason,
     
    }: {
      report: AdminUnifiedReport;
      kind: ReportActionKind;
      reason: string;
     
    }) => {
      if (report.kind === 'account') {
        await adminApi.resolveAccountReport(
          report.id,
          kind as 'TEMP_BLOCK' | 'PERMANENT_BLOCK' | 'WARNING' | 'DISMISS',
          reason,
         
        );
        return;
      }

      await adminApi.setReportStatus(
        report.id,
        kind === 'REOPEN' ? 'Pending' : kind === 'DISMISS' ? 'Dismissed' : 'Resolved',
        reason,
      );
    },
    onSuccess: async () => {
      toast.success('تم حفظ قرار البلاغ.');
      setDialog(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حفظ قرار البلاغ')),
  });

  const exportCsv = () => {
    const items = query.data?.items ?? [];

    if (items.length === 0) {
      return;
    }

    downloadCsv(csvFilename('reports'), [
      [
        'نوع البلاغ',
        'الحساب المستهدف',
        'البريد',
        'الدور',
        'المبلّغ',
        'التصنيف',
        'الحالة',
        'التفاصيل',
        'ملاحظات الإدارة',
        'تاريخ البلاغ',
      ],
      ...items.map((report) => [
        report.kind === 'account' ? 'بلاغ حساب' : 'بلاغ محتوى',
        report.targetName,
        report.targetEmail,
        report.targetRole,
        report.reporterName ?? '',
        CATEGORY_LABELS[report.category] ?? report.category,
        STATUS_LABELS[report.status],
        report.description,
        report.adminActionNotes ?? '',
        formatDate(report.createdAt),
      ]),
    ]);
  };

  const openAction = (report: AdminUnifiedReport, kind: ReportActionKind) => {
    setDialog({ report, kind });
  };

  const busy = action.isPending;
  const reasonReady = dialog?.kind === 'WARNING' ? notes.trim().length >= MIN_REASON : true;

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">طابور البلاغات الموحّد</h2>
          <p className="mt-1 text-xs text-slate-500">
            بلاغات الحسابات وبلاغات المحتوى في مكان واحد — راجع الأدلة، ثم أكّد القرار بمطابقة الوجه.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {query.isFetching ? <Spinner className="size-5" /> : null}
          <select
            className="input w-auto"
            value={status ?? ''}
            onChange={(event) =>
              setStatus((event.target.value || undefined) as AdminReportsParams['status'])
            }
            aria-label="فلترة البلاغات بالحالة"
          >
            <option value="">كل الحالات</option>
            <option value="PENDING">قيد الانتظار</option>
            <option value="RESOLVED">تمت المعالجة</option>
            <option value="DISMISSED">متجاهَل</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!query.data || query.data.items.length === 0}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="mt-5">
        {query.isPending ? (
          <PageLoader label="جارٍ تحميل البلاغات..." />
        ) : query.isError ? (
          <ErrorState
            message={getErrorMessage(query.error, 'تعذر تحميل البلاغات')}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length > 0 ? (
          <>
            <div className="space-y-4">
              {query.data.items.map((report) => {
                const pending = report.status === 'PENDING';
                const isAccount = report.kind === 'account';

                return (
                  <article
                    key={`${report.kind}-${report.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid size-10 place-items-center rounded-xl ${
                            pending ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {pending ? (
                            <ShieldAlert className="size-5" />
                          ) : (
                            <CheckCircle2 className="size-5" />
                          )}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-extrabold text-slate-900">{report.targetName}</h3>
                            <Badge tone={isAccount ? 'rose' : 'sky'}>
                              {isAccount ? 'بلاغ حساب' : 'بلاغ محتوى'}
                            </Badge>
                            <Badge tone={STATUS_TONES[report.status]}>
                              {STATUS_LABELS[report.status]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500" dir="ltr">
                            {report.targetEmail}
                            {report.targetRole ? ` · ${ROLE_LABELS[report.targetRole] ?? report.targetRole}` : ''}
                          </p>
                          <p className="mt-2 text-xs font-bold text-rose-700">
                            {CATEGORY_LABELS[report.category] ?? report.category}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(report.createdAt)}</span>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-bold text-slate-500">
                        المبلّغ: {report.reporterName ?? 'النظام الآلي'}
                        {report.reporterEmail ? ` · ${report.reporterEmail}` : ''}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {report.description}
                      </p>
                    </div>

                    {isAccount && report.proofFiles.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {report.proofFiles.map((proof) => (
                          <Evidence key={proof.id} reportId={report.id} proof={proof} />
                        ))}
                      </div>
                    ) : null}

                    {report.adminActionNotes || report.actionType ? (
                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        {report.actionType
                          ? `الإجراء: ${ACTION_TYPE_LABELS[report.actionType] ?? report.actionType}. `
                          : ''}
                        {report.adminActionNotes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {pending && isAccount ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openAction(report, 'TEMP_BLOCK')}
                            className="btn btn-danger btn-sm"
                          >
                            <Ban className="size-4" />
                            حظر 7 أيام
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openAction(report, 'PERMANENT_BLOCK')}
                            className="btn btn-danger btn-sm"
                          >
                            <Ban className="size-4" />
                            حظر دائم
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openAction(report, 'WARNING')}
                            className="btn btn-secondary btn-sm"
                          >
                            <MessageSquareWarning className="size-4" />
                            إرسال تحذير
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openAction(report, 'DISMISS')}
                            className="btn btn-ghost btn-sm"
                          >
                            <Flag className="size-4" />
                            تجاهل البلاغ
                          </button>
                        </>
                      ) : null}

                      {pending && !isAccount ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openAction(report, 'RESOLVE')}
                            className="btn btn-primary btn-sm"
                          >
                            <CheckCircle2 className="size-4" />
                            معالجة البلاغ
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openAction(report, 'DISMISS')}
                            className="btn btn-ghost btn-sm"
                          >
                            <Flag className="size-4" />
                            تجاهل البلاغ
                          </button>
                        </>
                      ) : null}

                      {!pending && !isAccount ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openAction(report, 'REOPEN')}
                          className="btn btn-secondary btn-sm"
                        >
                          <RotateCcw className="size-4" />
                          إعادة فتح البلاغ
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5">
              <Pagination pagination={query.data.pagination} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState
            icon={Flag}
            title="لا توجد بلاغات"
            description="لا توجد بلاغات مطابقة للحالة المحددة."
            compact
          />
        )}
      </div>

      <Modal
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog ? ACTION_LABELS[dialog.kind] : 'قرار البلاغ'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className={dialog ? confirmButtonClass(dialog.kind) : 'btn btn-primary'}
              disabled={!dialog || action.isPending || !reasonReady}
              onClick={() => {
                if (dialog) {
                  const actionRequest = { report: dialog.report, kind: dialog.kind, reason: notes.trim() };
                  if (dialog.report.kind === 'account' && (dialog.kind === 'TEMP_BLOCK' || dialog.kind === 'PERMANENT_BLOCK')) {
                    action.mutate(actionRequest);
                  } else action.mutate(actionRequest);
                }
              }}
            >
              {action.isPending ? <Spinner className="size-4" /> : <Flag className="size-4" />}
              تأكيد القرار
            </button>
          </div>
        }
      >
        {dialog ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              سيتم تطبيق إجراء <strong className="text-slate-900">{ACTION_LABELS[dialog.kind]}</strong>{' '}
              على <strong className="text-slate-900">{dialog.report.targetName}</strong>
              {dialog.report.kind === 'account' ? ' وتُرسل إشعارات الحظر/التحذير تلقائياً' : ''}.
            </p>
            <label className="label">
              {dialog.kind === 'WARNING' ? 'نص التحذير الذي سيصل للمستخدم' : 'ملاحظات إضافية (اختيارية؛ يُسجل الإجراء بعد مطابقة الوجه)'}
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="input mt-1.5 resize-y"
                minLength={dialog.kind === 'WARNING' ? MIN_REASON : 0}
                maxLength={2000}
                placeholder={
                  dialog.kind === 'WARNING'
                    ? 'اكتب نص التحذير الذي سيصل للمستخدم...'
                    : 'اكتب تفاصيل القرار وما تم فحصه...'
                }
              />
              <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                {notes.trim().length < MIN_REASON
                  ? `أدخل ${MIN_REASON} أحرف على الأقل`
                  : `${notes.trim().length}/2000`}
              </span>
            </label>
          </div>
        ) : null}
      </Modal>
    </section>
  );
};
