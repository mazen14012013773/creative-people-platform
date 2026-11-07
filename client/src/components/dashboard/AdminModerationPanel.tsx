import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCheck,
  EyeOff,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  Wand2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/dashboard/StatCard';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { systemApi, type ModerationParams } from '@/services/system.service';
import type { ModerationFlag, ModerationSeverity } from '@/types';

type StatusFilter = 'Pending' | 'Resolved' | 'Dismissed' | 'All';

const STATUS_LABELS: Record<StatusFilter, string> = {
  Pending: 'بانتظار المراجعة',
  Resolved: 'تمت المعالجة',
  Dismissed: 'تم تجاهلها',
  All: 'كل البلاغات',
};

const SEVERITY_LABELS: Record<ModerationSeverity, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
};

const SEVERITY_TONES: Record<ModerationSeverity, 'rose' | 'amber' | 'slate'> = {
  high: 'rose',
  medium: 'amber',
  low: 'slate',
};

const STATUS_TONES: Record<ModerationFlag['status'], 'amber' | 'emerald' | 'slate'> = {
  Pending: 'amber',
  Resolved: 'emerald',
  Dismissed: 'slate',
};

const FIELD_LABELS: Record<string, string> = {
  bio: 'نبذة التعريف',
  title: 'المسمى الوظيفي',
  location: 'الموقع',
  name: 'الاسم',
};

const RULE_LABELS: Record<string, string> = {
  blocked_term: 'مصطلح محظور',
  external_link: 'رابط خارجي',
  off_platform_contact: 'تواصل خارج المنصة',
  phone_in_free_text: 'رقم هاتف في نص حر',
  email_in_free_text: 'بريد إلكتروني في نص حر',
  markup_injection: 'كود HTML',
  spam_repetition: 'تكرار عشوائي',
};

const fieldLabel = (field: string): string => FIELD_LABELS[field] ?? field;

const ruleLabel = (rule: string): string => RULE_LABELS[rule] ?? rule;

const COUNT_QUERY = { limit: 1, page: 1 } as const;

const MIN_REASON = 0;

type FlagActionKind = 'Resolve' | 'Dismiss' | 'Reopen' | 'Cleanup';

interface FlagDialog {
  flag: ModerationFlag;
  kind: FlagActionKind;
}

const ACTION_TITLES: Record<FlagActionKind, string> = {
  Resolve: 'تأكيد المعالجة اليدوية',
  Dismiss: 'تأكيد تجاهل البلاغ',
  Reopen: 'تأكيد إعادة فتح البلاغ',
  Cleanup: 'تأكيد تنظيف البروفايل',
};

const ACTION_DEFAULT_REASON: Record<FlagActionKind, string> = {
  Resolve: 'راجعت المحتوى يدوياً وعالجت المخالفة.',
  Dismiss: 'راجعت المحتوى ولا توجد مخالفة تستدعي إجراء.',
  Reopen: 'أحتاج إعادة مراجعة هذا البلاغ.',
  Cleanup: 'تطبيق التنظيف المقترح على البروفايل بعد المراجعة.',
};

export const AdminModerationPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('Pending');
  const [severity, setSeverity] = useState<'' | ModerationSeverity>('');
  const [page, setPage] = useState(1);
  const [flagDialog, setFlagDialog] = useState<FlagDialog | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [rescanDialog, setRescanDialog] = useState(false);
  const [rescanReason, setRescanReason] = useState('');

  useEffect(() => {
    setPage(1);
  }, [status, severity]);

  useEffect(() => {
    setActionReason(flagDialog ? ACTION_DEFAULT_REASON[flagDialog.kind] : '');
  }, [flagDialog]);

  const params: ModerationParams = {
    status: status === 'All' ? undefined : status,
    severity: severity === '' ? undefined : severity,
    page,
    limit: 20,
  };

  const listQuery = useQuery({
    queryKey: ['admin-moderation', params],
    queryFn: () => systemApi.flags(params),
  });

  const pendingCount = useQuery({
    queryKey: ['admin-moderation', 'summary', 'pending'],
    queryFn: () => systemApi.flags({ ...COUNT_QUERY, status: 'Pending' }),
  });

  const highCount = useQuery({
    queryKey: ['admin-moderation', 'summary', 'high'],
    queryFn: () => systemApi.flags({ ...COUNT_QUERY, status: 'Pending', severity: 'high' }),
  });

  const resolvedCount = useQuery({
    queryKey: ['admin-moderation', 'summary', 'resolved'],
    queryFn: () => systemApi.flags({ ...COUNT_QUERY, status: 'Resolved' }),
  });

  const refreshAll = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const actionMutation = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'Resolve' | 'Dismiss' | 'Reopen';
      reason: string;
    }) => systemApi.actOnFlag(id, action, reason),
    onSuccess: async (flag) => {
      toast.success(
        flag.status === 'Pending' ? 'تمت إعادة فتح البلاغ' : 'تم تحديث حالة البلاغ',
      );
      setFlagDialog(null);
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث البلاغ')),
  });

  const cleanupMutation = useMutation({
    mutationFn: ({ flagId, reason }: { flagId: string; reason: string }) =>
      systemApi.cleanupFlag(flagId, reason),
    onSuccess: async () => {
      toast.success('تم تنظيف البروفايل تلقائياً وإغلاق البلاغ');
      setFlagDialog(null);
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تطبيق التنظيف')),
  });

  const rescanMutation = useMutation({
    mutationFn: (reason: string) => systemApi.rescan(reason),
    onSuccess: async (scan) => {
      toast.success(
        `انتهى الفحص: ${formatNumber(scan.scanned)} حقل، ومضبوطات على ${formatNumber(scan.flagged)} حساب`,
      );
      setRescanDialog(false);
      setRescanReason('');
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تشغيل الفحص الشامل')),
  });

  const isBusy =
    actionMutation.isPending || cleanupMutation.isPending || rescanMutation.isPending;
  const actionReasonReady = actionReason.trim().length >= MIN_REASON;

  if (listQuery.isLoading) {
    return <PageLoader label="جارٍ تحميل بلاغات المحتوى..." />;
  }

  if (listQuery.isError) {
    return <ErrorState message="تعذر تحميل بلاغات المحتوى" onRetry={() => void listQuery.refetch()} />;
  }

  return (
    <section className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">فاحص المحتوى الآلي</h2>
              <p className="mt-0.5 text-sm leading-6 text-slate-500">
                كل نبذة أو مسمى وظيفي يمر على فاحص آلي ينظّف الروابط ويبلّغ عن المحتوى المخالف. راجع
                البلاغات هنا أو طبّق التنظيف المقترح بضغطة واحدة.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={rescanMutation.isPending}
            onClick={() => {
              setRescanReason('');
              setRescanDialog(true);
            }}
            className="btn btn-primary shrink-0"
          >
            {rescanMutation.isPending ? <Spinner className="size-4" /> : <ScanSearch className="size-4" />}
            إعادة فحص كل البروفايلات
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ShieldAlert}
            label="بلاغات مفتوحة"
            value={formatNumber(pendingCount.data?.pagination.total ?? 0)}
            tone="amber"
          />
          <StatCard
            icon={ScanSearch}
            label="مخالفات عالية الخطورة"
            value={formatNumber(highCount.data?.pagination.total ?? 0)}
            tone="rose"
          />
          <StatCard
            icon={CheckCheck}
            label="بلاغات معالجة"
            value={formatNumber(resolvedCount.data?.pagination.total ?? 0)}
            tone="emerald"
          />
          <StatCard
            icon={RotateCcw}
            label="النتائج المعروضة"
            value={formatNumber(listQuery.data?.pagination.total ?? 0)}
            tone="sky"
          />
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <label className="label">
              الحالة
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="input mt-1.5 min-w-40"
              >
                {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              الخطورة
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as '' | ModerationSeverity)}
                className="input mt-1.5 min-w-36"
              >
                <option value="">الكل</option>
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="btn btn-secondary btn-sm shrink-0"
          >
            <RefreshCw className="size-4" />
            تحديث
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {listQuery.data && listQuery.data.items.length > 0 ? (
            listQuery.data.items.map((flag) => (
              <article
                key={flag.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 sm:p-5"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar name={flag.userName} src={null} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/freelancers/${flag.userId}`}
                        className="text-sm font-extrabold text-slate-900 hover:text-brand-700"
                      >
                        {flag.userName}
                      </Link>
                      <Badge tone={SEVERITY_TONES[flag.severity]}>
                        خطورة {SEVERITY_LABELS[flag.severity]}
                      </Badge>
                      <Badge tone={STATUS_TONES[flag.status]}>{STATUS_LABELS[flag.status]}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{flag.userEmail}</p>
                  </div>
                  <time className="text-xs text-slate-400">{formatDate(flag.createdAt)}</time>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="chip">الحقل: {fieldLabel(flag.field)}</span>
                  <span className="chip">القاعدة: {ruleLabel(flag.rule)}</span>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500">النص المخالف</p>
                    <p className="mt-1 whitespace-pre-line wrap-break-word rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
                      {flag.excerpt}
                    </p>
                  </div>

                  {flag.suggestion ? (
                    <div>
                      <p className="text-xs font-bold text-emerald-700">النص بعد التنظيف المقترح</p>
                      <p className="mt-1 whitespace-pre-line wrap-break-word rounded-xl bg-emerald-50/70 p-3 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100">
                        {flag.suggestion}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {flag.status === 'Pending' && flag.suggestion ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setFlagDialog({ flag, kind: 'Cleanup' })}
                      className="btn btn-primary btn-sm"
                    >
                      <Wand2 className="size-4" />
                      تطبيق التنظيف على البروفايل
                    </button>
                  ) : null}

                  {flag.status === 'Pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setFlagDialog({ flag, kind: 'Resolve' })}
                        className="btn btn-secondary btn-sm"
                      >
                        <CheckCheck className="size-4" />
                        تمت المعالجة يدوياً
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setFlagDialog({ flag, kind: 'Dismiss' })}
                        className="btn btn-ghost btn-sm"
                      >
                        <EyeOff className="size-4" />
                        تجاهل البلاغ
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setFlagDialog({ flag, kind: 'Reopen' })}
                      className="btn btn-secondary btn-sm"
                    >
                      <RotateCcw className="size-4" />
                      إعادة فتح البلاغ
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="لا توجد بلاغات مطابقة"
              description="المحتوى المنشور نظيف حسب الفلاتر الحالية. يمكنك إعادة الفحص الشامل في أي وقت."
              compact
            />
          )}
        </div>

        {listQuery.data ? (
          <div className="mt-5">
            <Pagination pagination={listQuery.data.pagination} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(flagDialog)}
        onClose={() => setFlagDialog(null)}
        title={flagDialog ? ACTION_TITLES[flagDialog.kind] : 'قرار البلاغ'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setFlagDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className={flagDialog?.kind === 'Cleanup' ? 'btn btn-primary' : 'btn btn-secondary'}
              disabled={
                !flagDialog || actionMutation.isPending || cleanupMutation.isPending || !actionReasonReady
              }
              onClick={() => {
                if (!flagDialog) {
                  return;
                }

                if (flagDialog.kind === 'Cleanup') {
                  cleanupMutation.mutate({
                    flagId: flagDialog.flag.id,
                    reason: actionReason.trim(),
                  });
                  return;
                }

                actionMutation.mutate({
                  id: flagDialog.flag.id,
                  action: flagDialog.kind,
                  reason: actionReason.trim(),
                });
              }}
            >
              {actionMutation.isPending || cleanupMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <Wand2 className="size-4" />
              )}
              تأكيد القرار
            </button>
          </div>
        }
      >
        {flagDialog ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              البلاغ على <strong className="text-slate-900">{flagDialog.flag.userName}</strong> في حقل{' '}
              <strong>{fieldLabel(flagDialog.flag.field)}</strong> — القاعدة:{' '}
              <strong>{ruleLabel(flagDialog.flag.rule)}</strong>.
            </p>
            {flagDialog.kind === 'Cleanup' && flagDialog.flag.suggestion ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">
                <p className="font-bold">سيُستبدل النص بـ:</p>
                <p className="mt-1 whitespace-pre-line">{flagDialog.flag.suggestion}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={rescanDialog}
        onClose={() => setRescanDialog(false)}
        title="تأكيد إعادة فحص كل البروفايلات"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setRescanDialog(false)}>
              تراجع
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={rescanMutation.isPending || rescanReason.trim().length < MIN_REASON}
              onClick={() => rescanMutation.mutate(rescanReason.trim())}
            >
              {rescanMutation.isPending ? <Spinner className="size-4" /> : <ScanSearch className="size-4" />}
              بدء الفحص الشامل
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            سيُعاد فحص نبذ ومسميات كل الحسابات المستقلة، وقد يستغرق وقتاً على قاعدة بيانات كبيرة.
            النتائج الجديدة تظهر في هذا الطابور فوراً.
          </p>
        </div>
      </Modal>
    </section>
  );
};
