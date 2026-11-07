import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  MonitorX,
  PowerOff,
  RefreshCw,
  Router as RouterIcon,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { isLocalOrPrivateIp } from '@/lib/ip';
import { formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { systemApi } from '@/services/system.service';
import type { ActiveSession } from '@/types';

const HOUR_CHOICES = [
  { value: '1', label: 'ساعة واحدة' },
  { value: '24', label: '24 ساعة' },
  { value: '168', label: 'أسبوع' },
  { value: '720', label: 'شهر' },
  { value: 'permanent', label: 'حظر دائم' },
];

const MIN_REASON = 0;

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) {
    return 'الآن';
  }

  if (minutes < 60) {
    return `قبل ${formatNumber(minutes)} دقيقة`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `قبل ${formatNumber(hours)} ساعة`;
  }

  return `قبل ${formatNumber(Math.round(hours / 24))} يوم`;
};

export const AdminSessionsPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 400);
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [page, setPage] = useState(1);
  const [blocksPage, setBlocksPage] = useState(1);
  const [banTarget, setBanTarget] = useState<ActiveSession | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banHours, setBanHours] = useState('24');
  const [revokeDialog, setRevokeDialog] = useState<{ session: ActiveSession; all: boolean } | null>(
    null,
  );
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, includeRevoked]);

  useEffect(() => {
    setRevokeReason('');
  }, [revokeDialog]);

  const params = {
    q: debouncedQ.trim() || undefined,
    includeRevoked,
    page,
    limit: 20,
  };

  const sessionsQuery = useQuery({
    queryKey: ['admin-sessions', params],
    queryFn: () => systemApi.sessions(params),
  });

  const blocksQuery = useQuery({
    queryKey: ['admin-ip-blocks', blocksPage],
    queryFn: () => systemApi.ipBlocks({ page: blocksPage, limit: 10 }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-ip-blocks'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-health'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const revokeMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: number; reason: string }) =>
      systemApi.revokeSession(sessionId, reason),
    onSuccess: async () => {
      toast.success('تم إنهاء هذه الجلسة تحديداً، وأصبح رمزها غير صالح');
      setRevokeDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إنهاء الجلسة')),
  });

  const revokeAllMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      systemApi.forceLogout(userId, reason),
    onSuccess: async (revoked) => {
      toast.success(
        revoked > 0
          ? `تم إنهاء ${formatNumber(revoked)} جلسة على كل الأجهزة، والحساب مطالب بتسجيل الدخول مجدداً`
          : 'لا توجد جلسات نشطة لهذا الحساب',
      );
      setRevokeDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إنهاء الجلسات')),
  });

  const banMutation = useMutation({
    mutationFn: (payload: { ip: string; reason: string; hours: number | null }) =>
      systemApi.blockIp(payload),
    onSuccess: async () => {
      toast.success('تم حظر العنوان، لن يستطيع الوصول للمنصة');
      setBanTarget(null);
      setBanReason('');
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حظر العنوان')),
  });

  const unbanMutation = useMutation({
    mutationFn: (ip: string) => systemApi.unblockIp(ip),
    onSuccess: async () => {
      toast.success('تم رفع الحظر عن العنوان');
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر رفع الحظر')),
  });

  const submitBan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!banTarget || isLocalOrPrivateIp(banTarget.ip)) {
      return;
    }

    const payload = {
      ip: banTarget.ip,
      reason: banReason.trim(),
      hours: banHours === 'permanent' ? null : Number(banHours),
    };
    banMutation.mutate(payload);
  };

  const sessions = sessionsQuery.data?.items ?? [];
  const revokeReady = revokeReason.trim().length >= MIN_REASON;
  const banTargetIsLocal = banTarget ? isLocalOrPrivateIp(banTarget.ip) : false;

  return (
    <section className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Users className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">الجلسات النشطة</h2>
              <p className="text-xs font-semibold text-slate-500">
                أنها جلسة محددة بعينها، أو اطرد كل أجهزة الحساب كخيار منفصل وواضح.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={includeRevoked}
              onChange={setIncludeRevoked}
              label="إظهار المنهية"
            />
            <button
              type="button"
              onClick={() => void sessionsQuery.refetch()}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw
                className={sessionsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
              />
              تحديث
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="input ps-9"
              placeholder="ابحث بالاسم أو البريد أو العنوان..."
              aria-label="البحث في الجلسات"
            />
          </div>
        </div>

        <div className="mt-5">
          {sessionsQuery.isError ? (
            <ErrorState
              message="تعذر تحميل الجلسات."
              onRetry={() => void sessionsQuery.refetch()}
            />
          ) : sessionsQuery.isPending ? (
            <PageLoader label="جارٍ تحميل الجلسات..." />
          ) : sessions.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-250 text-start">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-start">الحساب</th>
                      <th className="px-4 py-3 text-start">العنوان</th>
                      <th className="px-4 py-3 text-start">الجهاز / المتصفح</th>
                      <th className="px-4 py-3 text-start">الطلبات</th>
                      <th className="px-4 py-3 text-start">آخر ظهور</th>
                      <th className="px-4 py-3 text-start">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map((session) => (
                      <tr key={session.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={session.name ?? 'زائر'}
                              src={null}
                              className="size-9 rounded-xl"
                              textClassName="text-[11px]"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-slate-900">
                                {session.name ?? 'زائر غير مسجّل'}
                              </p>
                              <p dir="ltr" className="truncate text-start text-[11px] font-semibold text-slate-400">
                                {session.email ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p dir="ltr" className="text-start text-xs font-bold text-slate-700">
                            {session.ip}
                          </p>
                          {session.role ? (
                            <Badge tone={session.role === 'Admin' ? 'sky' : 'slate'} className="mt-1">
                              {session.role === 'Admin' ? 'أدمن' : session.role === 'Parent' ? 'ولي أمر' : session.role === 'Buyer' ? 'مشتري' : 'مستقل'}
                            </Badge>
                          ) : (
                            <Badge tone="amber" className="mt-1">
                              مجهول
                            </Badge>
                          )}
                          {session.revokedAt ? (
                            <Badge tone="rose" className="mt-1">
                              منتهية
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-slate-700">{session.device}</p>
                          <p dir="ltr" className="mt-0.5 max-w-64 truncate text-start text-[11px] text-slate-400">
                            {session.userAgent || 'بدون توقيع'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          {formatNumber(session.routeCount)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-slate-700">
                            {relativeTime(session.lastSeen)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            أول ظهور {relativeTime(session.firstSeen)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRevokeDialog({ session, all: false })}
                              disabled={Boolean(session.revokedAt)}
                              className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-40"
                              title="إنهاء هذه الجلسة فقط"
                            >
                              <PowerOff className="size-4" />
                            </button>
                            {session.userId ? (
                              <button
                                type="button"
                                onClick={() => setRevokeDialog({ session, all: true })}
                                className="rounded-lg border border-amber-200 p-2 text-amber-700 transition hover:bg-amber-50"
                                title="إنهاء كل أجهزة هذا الحساب"
                              >
                                <MonitorX className="size-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setBanTarget(session);
                                setBanReason('');
                                setBanHours('24');
                              }}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              title="حظر عنوان الـ IP"
                            >
                              <Ban className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5">
                <Pagination
                  pagination={sessionsQuery.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 }}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="لا توجد جلسات"
              description="لم يُسجَّل أي زائر أو مستخدم في النافذة الحالية."
            />
          )}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">العناوين المحظورة</h2>
            <p className="text-xs font-semibold text-slate-500">
              الحظر يمنع كل الطلبات من العنوان قبل وصولها لأي مسار.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {blocksQuery.isPending ? (
            <Spinner className="size-5" />
          ) : blocksQuery.isError ? (
            <ErrorState
              message="تعذر تحميل قائمة الحظر."
              onRetry={() => void blocksQuery.refetch()}
            />
          ) : blocksQuery.data && blocksQuery.data.items.length > 0 ? (
            <>
              {blocksQuery.data.items.map((block) => (
                <article
                  key={block.ip}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p dir="ltr" className="text-start text-sm font-extrabold text-slate-900">
                      {block.ip}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{block.reason}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {block.expiresAt
                        ? `ينتهي ${new Date(block.expiresAt).toLocaleString('ar-EG')}`
                        : 'حظر دائم'}
                      {block.createdByName ? ` • بواسطة ${block.createdByName}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={unbanMutation.isPending && unbanMutation.variables === block.ip}
                    onClick={() => unbanMutation.mutate(block.ip)}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    <Trash2 className="size-4" />
                    رفع الحظر
                  </button>
                </article>
              ))}
              <Pagination pagination={blocksQuery.data.pagination} onPageChange={setBlocksPage} />
            </>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
              لا توجد عناوين محظورة حالياً.
            </p>
          )}
        </div>
      </section>

      <Modal
        open={Boolean(revokeDialog)}
        onClose={() => setRevokeDialog(null)}
        title={revokeDialog?.all ? 'تأكيد طرد كل أجهزة الحساب' : 'تأكيد إنهاء الجلسة المحددة'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setRevokeDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={
                !revokeDialog ||
                !revokeReady ||
                revokeMutation.isPending ||
                revokeAllMutation.isPending
              }
              onClick={() => {
                if (!revokeDialog) {
                  return;
                }

                if (revokeDialog.all && revokeDialog.session.userId) {
                  revokeAllMutation.mutate({
                    userId: revokeDialog.session.userId,
                    reason: revokeReason.trim(),
                  });
                  return;
                }

                revokeMutation.mutate({
                  sessionId: revokeDialog.session.id,
                  reason: revokeReason.trim(),
                });
              }}
            >
              {revokeMutation.isPending || revokeAllMutation.isPending ? (
                <Spinner className="size-4" />
              ) : revokeDialog?.all ? (
                <MonitorX className="size-4" />
              ) : (
                <PowerOff className="size-4" />
              )}
              {revokeDialog?.all ? 'طرد كل الأجهزة' : 'إنهاء الجلسة'}
            </button>
          </div>
        }
      >
        {revokeDialog ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <RouterIcon className="size-4" />
                {revokeDialog.all ? 'الحساب المستهدف' : 'الجلسة المستهدفة'}
              </p>
              <p className="mt-2 text-sm font-extrabold text-slate-900">
                {revokeDialog.session.name ?? 'زائر غير مسجّل'}
                {revokeDialog.session.email ? ` — ${revokeDialog.session.email}` : ''}
              </p>
              <p dir="ltr" className="mt-1 text-start text-xs font-semibold text-slate-500">
                {revokeDialog.session.ip} · {revokeDialog.session.device}
              </p>
            </div>
            <p className="text-xs leading-6 text-slate-600">
              {revokeDialog.all
                ? 'سيتم إنهاء كل الجلسات النشطة لهذا الحساب على جميع الأجهزة، وسيُطلب منه تسجيل الدخول من جديد.'
                : 'سيتم إنهاء هذه الجلسة فقط (هذا المتصفح وهذا العنوان)، وتبقى الجلسات الأخرى للحساب كما هي.'}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(banTarget)}
        onClose={() => setBanTarget(null)}
        title="حظر عنوان الوصول"
        size="sm"
      >
        <form onSubmit={submitBan} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <RouterIcon className="size-4" />
              العنوان المستهدف
            </p>
            <p dir="ltr" className="mt-2 text-start text-sm font-extrabold text-slate-900">
              {banTarget?.ip}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {banTarget?.name ?? 'زائر غير مسجّل'} • {banTarget?.device}
            </p>
          </div>

          <label className="block">
            <span className="label">سبب الحظر</span>
            <input
              required
              minLength={3}
              maxLength={200}
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              className="input"
              placeholder="مثال: إنشاء حسابات وهمية وتوزيع روابط احتيالية"
            />
          </label>

          <label className="block">
            <span className="label">مدة الحظر</span>
            <select
              value={banHours}
              onChange={(event) => setBanHours(event.target.value)}
              className="input"
            >
              {HOUR_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          {banTargetIsLocal ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold leading-6 text-rose-700">
              هذا عنوان محلي أو من شبكة خاصة، ولا يمكن حظره لأن ذلك سيمنع وصولك أنت للوحة.
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-6 text-amber-800">
              العناوين المحلية والشبكة الخاصة لا يمكن حظرها لحماية وصولك للوحة.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => setBanTarget(null)} className="btn btn-secondary">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={banMutation.isPending || banTargetIsLocal}
              className="btn btn-danger"
            >
              {banMutation.isPending ? <Spinner className="size-4" /> : <Ban className="size-4" />}
              تنفيذ الحظر
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
