import { useQuery } from '@tanstack/react-query';
import { Download, Filter, ScrollText, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminAuditParams } from '@/services/admin.service';

const ACTION_LABELS: Record<string, string> = {
  user_status: 'تغيير حالة مستخدم',
  user_role: 'تغيير دور مستخدم',
  user_verified: 'تعديل توثيق مستخدم',
  user_featured: 'تمييز بروفايل',
  user_edit: 'تعديل بيانات مستخدم',
  user_password_reset: 'تعيين كلمة مرور',
  user_delete: 'حذف/أرشفة حساب',
  system_settings_update: 'تعديل إعدادات النظام',
  session_evict: 'إنهاء جلسة',
  session_evict_all: 'طرد كل الأجهزة',
  ip_block: 'حظر عنوان IP',
  ip_unblock: 'رفع حظر عنوان IP',
  moderation_rescan: 'إعادة فحص المحتوى',
  moderation_flag_status: 'تحديث بلاغ محتوى',
  profile_cleanup: 'تنظيف بروفايل',
  content_report_status: 'قرار بلاغ محتوى',
  account_report_action: 'قرار بلاغ حساب',
  parent_verification_approve: 'قبول توثيق ولي أمر',
  parent_verification_reject: 'رفض توثيق ولي أمر',
  support_ticket_close: 'إغلاق تذكرة دعم',
  support_ticket_open: 'إعادة فتح تذكرة دعم',
  system_backup_download: 'تنزيل نسخة احتياطية',
  system_restore: 'استعادة نسخة احتياطية',
  system_reset_data: 'مسح البيانات التشغيلية',
  order_force_action: 'قرار طلب/نزاع',
  review_delete: 'حذف تقييم',
  notification_create: 'إنشاء إشعار',
  notification_update: 'تعديل إشعار',
  view_conversation: 'اطلاع على محادثة',
};

export const AdminAuditPanel = () => {
  const [adminId, setAdminId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const debouncedAction = useDebounce(action, 400);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [adminId, entityId, debouncedAction, from, to]);

  const params: AdminAuditParams = useMemo(
    () => ({
      page,
      limit: 20,
      adminId: adminId || undefined,
      entityId: entityId.trim() || undefined,
      action: debouncedAction.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, adminId, entityId, debouncedAction, from, to],
  );

  const auditQuery = useQuery({
    queryKey: ['admin-audit', params],
    queryFn: () => adminApi.auditLogs(params),
  });

  const adminsQuery = useQuery({
    queryKey: ['admin-admins-list'],
    queryFn: () => adminApi.users({ role: 'Admin', limit: 100 }),
    staleTime: 60_000,
  });

  const hasFilters = Boolean(adminId || entityId.trim() || action.trim() || from || to);

  const clearFilters = () => {
    setAdminId('');
    setEntityId('');
    setAction('');
    setFrom('');
    setTo('');
  };

  const exportCsv = () => {
    const items = auditQuery.data?.items ?? [];

    if (items.length === 0) {
      return;
    }

    downloadCsv(csvFilename('audit-log'), [
      ['التاريخ', 'الأدمن', 'الإجراء', 'نوع الهدف', 'معرّف الهدف', 'السبب', 'بيانات إضافية', 'صورة إثبات الوجه'],
      ...items.map((log) => [
        formatDate(log.createdAt),
        log.adminName ?? 'النظام',
        ACTION_LABELS[log.action] ?? log.action,
        log.subjectType,
        log.subjectId,
        log.reason,
        JSON.stringify(log.metadata),
      ]),
    ]);
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">سجل التدقيق الإداري</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            كل إجراء حساس في اللوحة يُسجَّل هنا مع الأدمن والسبب والبيانات الإضافية.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {auditQuery.isFetching ? <Spinner className="size-5" /> : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!auditQuery.data || auditQuery.data.items.length === 0}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <select
          value={adminId}
          onChange={(event) => setAdminId(event.target.value)}
          className="input"
          aria-label="فلترة حسب الأدمن"
        >
          <option value="">كل الأدمنية</option>
          {(adminsQuery.data?.items ?? []).map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>

        <input type="search" value={entityId} onChange={(event) => setEntityId(event.target.value)} className="input" placeholder="معرّف المستخدم أو الهدف" aria-label="فلترة حسب الحساب أو الهدف" />

        <div className="relative">
          <Filter className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="input ps-9"
            placeholder="نوع الإجراء (مثال: ip_block)"
            aria-label="فلترة حسب نوع الإجراء"
          />
        </div>

        <label className="label text-[11px]">
          من تاريخ
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="input mt-1"
          />
        </label>

        <label className="label text-[11px]">
          إلى تاريخ
          <input
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="input mt-1"
          />
        </label>

        <button
          type="button"
          className="btn btn-ghost self-end"
          disabled={!hasFilters}
          onClick={clearFilters}
        >
          <X className="size-4" />
          مسح الفلاتر
        </button>
      </div>

      <div className="mt-5">
        {auditQuery.isError ? (
          <ErrorState
            message={getErrorMessage(auditQuery.error, 'تعذر تحميل سجل التدقيق')}
            onRetry={() => void auditQuery.refetch()}
          />
        ) : auditQuery.isPending ? (
          <PageLoader label="جارٍ تحميل سجل التدقيق..." />
        ) : auditQuery.data.items.length > 0 ? (
          <>
            <div className="space-y-3">
              {auditQuery.data.items.map((log) => (
                <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="sky">{ACTION_LABELS[log.action] ?? log.action}</Badge>
                      <span className="text-xs font-bold text-slate-700">
                        {log.adminName ?? 'النظام'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400" dir="ltr">
                        {log.subjectType}:{log.subjectId}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{log.reason}</p>

                  {Object.keys(log.metadata).length > 0 ? (
                    <pre
                      dir="ltr"
                      className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"
                    >
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="mt-5">
              <Pagination pagination={auditQuery.data.pagination} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState
            icon={ScrollText}
            title="لا يوجد سجل مطابق"
            description={hasFilters ? 'جرّب توسيع نطاق الفلاتر.' : 'لم تُسجَّل أي إجراءات إدارية بعد.'}
          />
        )}
      </div>
    </section>
  );
};
