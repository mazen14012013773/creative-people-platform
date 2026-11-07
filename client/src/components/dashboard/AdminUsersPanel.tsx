import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FolderSearch,
  KeyRound,
  MonitorSmartphone,
  Pencil,
  Search,
  ShieldCheck,
  ShieldOff,
  Star,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate, formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminUsersParams } from '@/services/admin.service';
import { parentApi } from '@/services/parent.service';
import { systemApi } from '@/services/system.service';
import type { AdminUser, AdminUserPatch, Role } from '@/types';

type Dialog =
  | { kind: 'feature'; user: AdminUser }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | { kind: 'status'; user: AdminUser }
  | { kind: 'verified'; user: AdminUser }
  | { kind: 'role'; user: AdminUser }
  | { kind: 'dossier'; user: AdminUser }
  | { kind: 'impersonate'; user: AdminUser }
  | null;

const FAMILY_STATUS_LABELS: Record<'PENDING' | 'APPROVED' | 'REJECTED', string> = {
  PENDING: 'بانتظار الموافقة',
  APPROVED: 'موثّق',
  REJECTED: 'مرفوض',
};

interface EditForm {
  name: string;
  title: string;
  bio: string;
  location: string;
  avgResponseHours: string;
  isAvailable: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  Freelancer: 'مستقل',
  Buyer: 'مشتري',
  Parent: 'ولي أمر',
  Admin: 'أدمن',
};

const ACCOUNT_STATUS_LABELS: Record<AdminUser['accountStatus'], string> = {
  ACTIVE: 'نشط',
  PENDING_PARENT_APPROVAL: 'بانتظار ولي الأمر',
  PENDING_ADMIN_REVIEW: 'بانتظار مراجعة الإدارة',
  REJECTED: 'مرفوض',
};

const FEATURE_OPTIONS = [
  { value: '0', label: 'بدون انتهاء' },
  { value: '7', label: 'أسبوع' },
  { value: '30', label: 'شهر' },
  { value: '90', label: '3 أشهر' },
];

const MIN_REASON = 0;

const textOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const numOrNull = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
};

const fromUser = (user: AdminUser): EditForm => ({
  name: user.name,
  title: user.title ?? '',
  bio: user.bio ?? '',
  location: user.location ?? '',
  avgResponseHours: user.avgResponseHours === null ? '' : String(user.avgResponseHours),
  isAvailable: user.isAvailable,
});

const buildPatch = (user: AdminUser, form: EditForm): AdminUserPatch => {
  const patch: AdminUserPatch = {};
  const name = form.name.trim();

  if (name.length >= 2 && name !== user.name) {
    patch.name = name;
  }

  const title = textOrNull(form.title);

  if (title !== (user.title ?? null)) {
    patch.title = title;
  }

  const bio = textOrNull(form.bio);

  if (bio !== (user.bio ?? null)) {
    patch.bio = bio;
  }

  const location = textOrNull(form.location);

  if (location !== (user.location ?? null)) {
    patch.location = location;
  }

  const avgResponseHours = numOrNull(form.avgResponseHours);

  if (avgResponseHours !== (user.avgResponseHours ?? null)) {
    patch.avgResponseHours = avgResponseHours;
  }

  if (user.role === 'Freelancer' && form.isAvailable !== user.isAvailable) {
    patch.isAvailable = form.isAvailable;
  }

  return patch;
};

const ReasonField = (_props: { value: string; onChange: (value: string) => void }) => null;

const actionButtonClass =
  'rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-50';

export const AdminUsersPanel = () => {
  const { beginImpersonation } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const debouncedQ = useDebounce(q, 400);
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [role, setRole] = useState<'' | 'Freelancer' | 'Buyer' | 'Parent' | 'Admin'>('');
  const [verified, setVerified] = useState<'' | 'yes' | 'no'>('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [featureDays, setFeatureDays] = useState('30');
  const [newPassword, setNewPassword] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [roleDraft, setRoleDraft] = useState<Role>('Buyer');
  const [sessionReason, setSessionReason] = useState('');
  const [familyReason, setFamilyReason] = useState('');
  const [verificationPhoto, setVerificationPhoto] = useState<{ id: string; url: string } | null>(null);
  const [photoLoadingId, setPhotoLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, role, verified]);

  useEffect(() => {
    setActionReason('');
    setSessionReason('');
    setFamilyReason('');
    setVerificationPhoto((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });

    if (dialog?.kind === 'edit') {
      setForm(fromUser(dialog.user));
    }

    if (dialog?.kind === 'feature') {
      setFeatureDays(dialog.user.featuredUntil ? '30' : '0');
    }

    if (dialog?.kind === 'password') {
      setNewPassword('');
    }

    if (dialog?.kind === 'role') {
      setRoleDraft(dialog.user.role);
    }
  }, [dialog]);

  const params: AdminUsersParams = useMemo(
    () => ({
      q: debouncedQ.trim() || undefined,
      status: status || undefined,
      role: role || undefined,
      verified: verified === '' ? undefined : verified === 'yes',
      page,
      limit: 20,
    }),
    [debouncedQ, status, role, verified, page],
  );

  const usersQuery = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminApi.users(params),
  });

  const dossierQuery = useQuery({
    queryKey: ['admin-user-dossier', dialog?.kind === 'dossier' ? dialog.user.id : null],
    queryFn: () => adminApi.userDossier(dialog && dialog.kind === 'dossier' ? dialog.user.id : ''),
    enabled: dialog?.kind === 'dossier',
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    await queryClient.invalidateQueries({ queryKey: ['featured-freelancers'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive, reason, expectedIsActive }: { id: string; isActive: boolean; reason: string; expectedIsActive?: boolean }) =>
      adminApi.setUserStatus(id, isActive, reason, expectedIsActive),
    onSuccess: async (updated, variables) => {
      toast.success(updated.isActive ? 'تم تفعيل الحساب' : 'تم تجميد الحساب', {
        label: 'تراجع',
        onClick: () => statusMutation.mutate({ id: updated.id, isActive: !variables.isActive, expectedIsActive: updated.isActive, reason: 'تراجع آمن عن تغيير حالة الحساب' }),
      });
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث حالة الحساب')),
  });

  const verifiedMutation = useMutation({
    mutationFn: ({ id, isVerified, reason }: { id: string; isVerified: boolean; reason: string }) =>
      adminApi.setUserVerified(id, isVerified, reason),
    onSuccess: async (updated) => {
      toast.success(updated.isVerified ? 'تم توثيق الحساب بالعلامة الزرقاء' : 'تم سحب التوثيق');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث التوثيق')),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, nextRole, reason }: { id: string; nextRole: Role; reason: string }) =>
      adminApi.setUserRole(id, nextRole, reason),
    onSuccess: async (updated) => {
      toast.success(`تم تغيير دور الحساب إلى «${ROLE_LABELS[updated.role]}»`);
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تغيير دور الحساب')),
  });

  const featuredMutation = useMutation({
    mutationFn: ({
      id,
      isFeatured,
      featuredUntil,
      reason,
    }: {
      id: string;
      isFeatured: boolean;
      featuredUntil: string | null;
      reason: string;
    }) => adminApi.setUserFeatured(id, isFeatured, reason, featuredUntil),
    onSuccess: async (updated) => {
      toast.success(updated.isFeatured ? 'تم تمييز البروفايل في الصفحة الرئيسية' : 'تمت إزالة التمييز');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث التمييز')),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload, reason }: { id: string; payload: AdminUserPatch; reason: string }) =>
      adminApi.manageUser(id, payload, reason),
    onSuccess: async () => {
      toast.success('تم حفظ تعديلات البروفايل');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حفظ التعديلات')),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password, reason }: { id: string; password: string; reason: string }) =>
      adminApi.setUserPassword(id, password, reason),
    onSuccess: async () => {
      toast.success('تم تعيين كلمة مرور جديدة، والدخول الحالي أصبح غير صالح');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تغيير كلمة المرور')),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.deleteUser(id, reason),
    onSuccess: async (result) => {
      toast.success(
        result.archived
          ? 'تم أرشفة الحساب وتعطيل الوصول إليه مع الحفاظ على سجل الطلبات'
          : 'تم حذف الحساب نهائيًا',
      );
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حذف الحساب')),
  });

  const impersonateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => adminApi.impersonateUser(id),
    onSuccess: async (result) => {
      await beginImpersonation(result.token, result.user.name);
      navigate(result.user.role === 'Buyer' ? '/buyer' : result.user.role === 'Parent' ? '/parent' : '/dashboard');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر بدء جلسة الإدارة')),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: number; reason: string }) =>
      systemApi.revokeSession(sessionId, reason),
    onSuccess: async () => {
      toast.success('تم إبطال الجلسة ومنع استخدامها فوراً');
      setSessionReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-dossier'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-health'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إبطال الجلسة')),
  });

  const removeFamilyLinkMutation = useMutation({
    mutationFn: ({ linkId, reason }: { linkId: string; reason: string }) => adminApi.removeFamilyLink(linkId, reason),
    onSuccess: async () => {
      toast.success('تم فصل رابط الأسرة وتسجيل السبب');
      setFamilyReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-dossier'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر فصل رابط الأسرة')),
  });

  const viewVerificationPhoto = async (verificationId: string) => {
    setPhotoLoadingId(verificationId);
    setVerificationPhoto((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });

    try {
      const blob = await parentApi.adminVerificationPhoto(verificationId);
      setVerificationPhoto({ id: verificationId, url: URL.createObjectURL(blob) });
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر تحميل صورة التوثيق'));
    } finally {
      setPhotoLoadingId(null);
    }
  };

  const submitEdit = () => {
    if (!dialog || dialog.kind !== 'edit' || !form) {
      return;
    }

    const patch = buildPatch(dialog.user, form);

    if (Object.keys(patch).length === 0) {
      toast.error('لم يتغير أي حقل لحفظه');
      return;
    }

    editMutation.mutate({ id: dialog.user.id, payload: patch, reason: actionReason.trim() });
  };

  const commitFeature = () => {
    if (dialog?.kind !== 'feature') {
      return;
    }

    const isFeaturing = !dialog.user.isFeatured;
    const days = Number(featureDays);
    const featuredUntil =
      days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

    featuredMutation.mutate({
      id: dialog.user.id,
      isFeatured: isFeaturing,
      featuredUntil: isFeaturing ? featuredUntil : null,
      reason: actionReason.trim(),
    });
  };

  const exportCsv = () => {
    const items = usersQuery.data?.items ?? [];

    if (items.length === 0) {
      return;
    }

    downloadCsv(csvFilename('users'), [
      [
        'الاسم',
        'البريد الإلكتروني',
        'الهاتف',
        'واتساب',
        'الدور',
        'حالة الحساب',
        'حالة التفعيل',
        'التوثيق',
        'التمييز',
        'متوسط التقييم',
        'عدد التقييمات',
        'تاريخ الانضمام',
      ],
      ...items.map((user) => [
        user.name,
        user.email,
        user.phone ?? '',
        user.whatsappNumber ?? '',
        ROLE_LABELS[user.role],
        ACCOUNT_STATUS_LABELS[user.accountStatus],
        user.isActive ? 'نشط' : 'مجمّد',
        user.isVerified ? 'موثّق' : 'غير موثّق',
        user.isFeatured ? 'مميز' : 'غير مميز',
        user.avgRating.toFixed(1),
        user.reviewCount,
        formatDate(user.createdAt),
      ]),
    ]);
  };

  const isBusy =
    statusMutation.isPending ||
    verifiedMutation.isPending ||
    roleMutation.isPending ||
    featuredMutation.isPending ||
    editMutation.isPending ||
    passwordMutation.isPending ||
    deleteMutation.isPending;

  const reasonReady = actionReason.trim().length >= MIN_REASON;

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">إدارة المستخدمين (وضع كامل)</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            وثّق الحسابات، غيّر الأدوار، ميّز البروفايلات، أو عدّل أي حقل — وكل إجراء حساس يتطلب
            سبباً ويُسجَّل في سجل التدقيق.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {usersQuery.isFetching ? <Spinner className="size-5" /> : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!usersQuery.data || usersQuery.data.items.length === 0}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="input ps-9"
            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
            aria-label="البحث في المستخدمين"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as '' | 'active' | 'inactive')}
          className="input"
          aria-label="فلترة بالحالة"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">مجمّد</option>
        </select>

        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as '' | 'Freelancer' | 'Buyer' | 'Parent' | 'Admin')
          }
          className="input"
          aria-label="فلترة بالدور"
        >
          <option value="">كل الأدوار</option>
          <option value="Freelancer">مستقل</option>
          <option value="Buyer">مشتري</option>
          <option value="Parent">ولي أمر</option>
          <option value="Admin">أدمن</option>
        </select>

        <select
          value={verified}
          onChange={(event) => setVerified(event.target.value as '' | 'yes' | 'no')}
          className="input"
          aria-label="فلترة بالتوثيق"
        >
          <option value="">التوثيق: الكل</option>
          <option value="yes">موثّق فقط</option>
          <option value="no">غير موثّق</option>
        </select>
      </div>

      <div className="mt-5">
        {usersQuery.isError ? (
          <ErrorState message="تعذر تحميل المستخدمين." onRetry={() => void usersQuery.refetch()} />
        ) : usersQuery.isPending ? (
          <PageLoader label="جارٍ تحميل المستخدمين..." />
        ) : usersQuery.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-260 border-collapse text-start">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-start">المستخدم</th>
                    <th className="px-4 py-3 text-start">الحالة</th>
                    <th className="px-4 py-3 text-start">التقييم</th>
                    <th className="px-4 py-3 text-start">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersQuery.data.items.map((user) => {
                    const isFreelancer = user.role === 'Freelancer';
                    const canModerate = user.role !== 'Admin';

                    return (
                      <tr key={user.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={user.name}
                              src={user.avatarUrl}
                              className="size-10 rounded-xl"
                              textClassName="text-xs"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-extrabold text-slate-900">
                                  {user.name}
                                </p>
                                {user.isVerified ? <VerifiedBadge /> : null}
                                {user.isFeatured ? (
                                  <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                                ) : null}
                              </div>
                              <p className="truncate text-[11px] font-semibold text-slate-400" dir="ltr">
                                {user.email}
                              </p>
                              {user.phone || user.whatsappNumber ? (
                                <p className="truncate text-[11px] font-semibold text-slate-400" dir="ltr">
                                  {[user.phone, user.whatsappNumber ? `WA ${user.whatsappNumber}` : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              ) : null}
                              <p className="truncate text-[11px] font-semibold text-slate-400">
                                {user.title || 'بدون مسمى'} — انضم {formatDate(user.createdAt)}
                              </p>
                              {user.pendingFlags > 0 ? (
                                <p className="mt-0.5 text-[11px] font-bold text-rose-600">
                                  {formatNumber(user.pendingFlags)} بلاغ محتوى مفتوح
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge tone={user.isActive ? 'emerald' : 'rose'}>
                              {user.isActive ? 'نشط' : 'مجمّد'}
                            </Badge>
                            <Badge tone={user.role === 'Admin' ? 'sky' : 'slate'}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                            {user.accountStatus !== 'ACTIVE' ? (
                              <Badge tone="amber">{ACCOUNT_STATUS_LABELS[user.accountStatus]}</Badge>
                            ) : null}
                            {isFreelancer ? (
                              <Badge tone={user.isAvailable ? 'brand' : 'slate'}>
                                {user.isAvailable ? 'متاح للعمل' : 'غير متاح'}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-slate-800">
                              {user.avgRating.toFixed(1)}
                              <span className="text-[11px] font-semibold text-slate-400">
                                {' '}
                                ({formatNumber(user.reviewCount)} تقييم)
                              </span>
                            </p>
                            {isFreelancer ? (
                              <p className="text-[11px] text-slate-400">
                                يرد خلال{' '}
                                {user.avgResponseHours === null
                                  ? 'غير محدد'
                                  : `${formatNumber(user.avgResponseHours)} ساعة`}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isFreelancer ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setDialog({ kind: 'verified', user })}
                                  className={
                                    user.isVerified
                                      ? 'rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-600 transition hover:bg-sky-100'
                                      : actionButtonClass
                                  }
                                  title={user.isVerified ? 'سحب التوثيق' : 'منح العلامة الزرقاء'}
                                >
                                  {user.isVerified ? (
                                    <ShieldOff className="size-4" />
                                  ) : (
                                    <ShieldCheck className="size-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setDialog({ kind: 'feature', user })}
                                  className={
                                    user.isFeatured
                                      ? 'rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600 transition hover:bg-amber-100'
                                      : actionButtonClass
                                  }
                                  title={user.isFeatured ? 'إزالة التمييز' : 'تمييز البروفايل'}
                                >
                                  <Star
                                    className={
                                      user.isFeatured
                                        ? 'size-4 fill-amber-400 text-amber-400'
                                        : 'size-4'
                                    }
                                  />
                                </button>
                              </>
                            ) : null}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ kind: 'dossier', user })}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-700 transition hover:bg-brand-100 disabled:pointer-events-none disabled:opacity-50"
                              title="عرض الملف الشامل للعميل"
                            >
                              <FolderSearch className="size-4" />
                              الملف الشامل
                            </button>
                            {user.role !== 'Admin' ? <button type="button" disabled={isBusy || user.accountStatus !== 'ACTIVE'} className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: 'impersonate', user })} title={user.accountStatus !== 'ACTIVE' ? 'يمكن معاينة الحسابات النشطة والمكتملة فقط' : 'جلسة معاينة مؤقتة مع تسجيلها في سجل التدقيق'}>معاينة الحساب</button> : null}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ kind: 'edit', user })}
                              className={actionButtonClass}
                              title="تعديل البيانات يدوياً"
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ kind: 'password', user })}
                              className={actionButtonClass}
                              title="تعيين كلمة مرور جديدة"
                            >
                              <KeyRound className="size-4" />
                            </button>

                            {canModerate ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setDialog({ kind: 'role', user })}
                                  className={actionButtonClass}
                                  title="تغيير دور الحساب"
                                >
                                  <UserCog className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setDialog({ kind: 'status', user })}
                                  className={
                                    user.isActive
                                      ? 'rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50'
                                      : 'rounded-lg border border-emerald-200 p-2 text-emerald-600 transition hover:bg-emerald-50'
                                  }
                                  title={user.isActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
                                >
                                  {user.isActive ? (
                                    <UserX className="size-4" />
                                  ) : (
                                    <UserCheck className="size-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setDialog({ kind: 'delete', user })}
                                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-50"
                                  title="حذف أو أرشفة الحساب"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <Pagination pagination={usersQuery.data.pagination} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="لا يوجد مستخدمون مطابقون"
            description="جرّب تغيير كلمة البحث أو إزالة الفلاتر."
          />
        )}
      </div>

      <Modal
        open={dialog?.kind === 'feature'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'feature' && dialog.user.isFeatured ? 'إزالة تمييز البروفايل' : 'تمييز البروفايل'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className={
                dialog?.kind === 'feature' && dialog.user.isFeatured ? 'btn btn-danger' : 'btn btn-primary'
              }
              disabled={featuredMutation.isPending || !reasonReady || dialog?.kind !== 'feature'}
              onClick={commitFeature}
            >
              {featuredMutation.isPending ? <Spinner className="size-4" /> : <Star className="size-4" />}
              {dialog?.kind === 'feature' && dialog.user.isFeatured ? 'إزالة التمييز' : 'تمييز في الرئيسية'}
            </button>
          </div>
        }
      >
        {dialog?.kind === 'feature' ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {dialog.user.isFeatured
                ? 'سيزال ملف'
                : 'سيظهر'}{' '}
              <strong className="text-slate-900">{dialog.user.name}</strong>{' '}
              {dialog.user.isFeatured
                ? 'من شريط «مستقلون مميزون» أعلى الصفحة الرئيسية.'
                : 'في شريط «مستقلون مميزون» أعلى الصفحة الرئيسية حتى انتهاء المدة.'}
            </p>
            {dialog.user.isFeatured ? null : (
              <label className="label">
                مدة التمييز
                <select
                  value={featureDays}
                  onChange={(event) => setFeatureDays(event.target.value)}
                  className="input mt-1.5"
                >
                  {FEATURE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <ReasonField value={actionReason} onChange={setActionReason} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'edit'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'edit' ? `تعديل ${dialog.user.name}` : 'تعديل'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={editMutation.isPending || !form || !reasonReady}
              onClick={submitEdit}
            >
              {editMutation.isPending ? <Spinner className="size-4" /> : <Pencil className="size-4" />}
              حفظ التعديلات
            </button>
          </div>
        }
      >
        {form && dialog?.kind === 'edit' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              الاسم
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="input mt-1.5"
                minLength={2}
                maxLength={100}
              />
            </label>
            <label className="label">
              المسمى الوظيفي
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="input mt-1.5"
                maxLength={120}
                placeholder="مثال: مصمم واجهات"
              />
            </label>
            <label className="label">
              الموقع
              <input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                className="input mt-1.5"
                maxLength={120}
                placeholder="القاهرة، مصر"
              />
            </label>
            {dialog.user.role === 'Freelancer' ? (
              <label className="label">
                متوسط الرد (ساعات)
                <input
                  type="number"
                  min={0}
                  max={168}
                  step="0.5"
                  value={form.avgResponseHours}
                  onChange={(event) => setForm({ ...form, avgResponseHours: event.target.value })}
                  className="input mt-1.5"
                  placeholder="غير محدد"
                />
              </label>
            ) : null}
            <label className="label sm:col-span-2">
              نبذة التعريف
              <textarea
                rows={4}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                className="input mt-1.5 resize-y"
                maxLength={2000}
              />
            </label>
            {dialog.user.role === 'Freelancer' ? (
              <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <Switch
                  checked={form.isAvailable}
                  onChange={(checked) => setForm({ ...form, isAvailable: checked })}
                  label="متاح لاستقبال المشاريع"
                  description="يظهر شارة «متاح» في البروفايل ونتائج البحث."
                />
              </div>
            ) : null}
            <p className="text-xs leading-6 text-slate-500 sm:col-span-2">
              تعديل النبذة أو المسمى يمر تلقائياً على فاحص المحتوى؛ الروابط والأرقام المخالفة تُبلّغ
              في لوحة «فاحص المحتوى».
            </p>
            <div className="sm:col-span-2">
              <ReasonField value={actionReason} onChange={setActionReason} />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'password'}
        onClose={() => setDialog(null)}
        title="تعيين كلمة مرور جديدة"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={passwordMutation.isPending || newPassword.trim().length < 12 || !reasonReady}
              onClick={() => {
                if (dialog?.kind === 'password') {
                  passwordMutation.mutate({
                    id: dialog.user.id,
                    password: newPassword.trim(),
                    reason: actionReason.trim(),
                  });
                }
              }}
            >
              {passwordMutation.isPending ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
              تعيين كلمة المرور
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            {dialog?.kind === 'password' ? dialog.user.email : ''} ستحتاج هذه الكلمة للدخول، وتنتهي
            كل جلساته الحالية فوراً.
          </p>
          <label className="label">
            كلمة المرور الجديدة
            <input
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="input mt-1.5"
              minLength={12}
              maxLength={120}
              placeholder="12 حرفاً على الأقل"
            />
          </label>
          <ReasonField value={actionReason} onChange={setActionReason} />
        </div>
      </Modal>

      <Modal
        open={dialog?.kind === 'status'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'status' && dialog.user.isActive ? 'تأكيد تجميد الحساب' : 'تأكيد تفعيل الحساب'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className={dialog?.kind === 'status' && dialog.user.isActive ? 'btn btn-danger' : 'btn btn-primary'}
              disabled={statusMutation.isPending || !reasonReady || dialog?.kind !== 'status'}
              onClick={() => {
                if (dialog?.kind === 'status') {
                  const action = {
                    id: dialog.user.id,
                    isActive: !dialog.user.isActive,
                    reason: actionReason.trim(),
                  };
                  statusMutation.mutate(action);
                }
              }}
            >
              {statusMutation.isPending ? (
                <Spinner className="size-4" />
              ) : dialog?.kind === 'status' && dialog.user.isActive ? (
                <UserX className="size-4" />
              ) : (
                <UserCheck className="size-4" />
              )}
              {dialog?.kind === 'status' && dialog.user.isActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
            </button>
          </div>
        }
      >
        {dialog?.kind === 'status' ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              سيتم {dialog.user.isActive ? 'تجميد' : 'تفعيل'} حساب{' '}
              <strong className="text-slate-900">{dialog.user.name}</strong> ({dialog.user.email}).
            </p>
            {dialog.user.isActive ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-6 text-rose-700">
                التجميد يمنع الدخول فوراً ويُنهي جميع جلساته النشطة، لكنه يُبقي بياناته وسجل طلباته.
              </p>
            ) : null}
            <ReasonField value={actionReason} onChange={setActionReason} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'verified'}
        onClose={() => setDialog(null)}
        title={
          dialog?.kind === 'verified' && dialog.user.isVerified
            ? 'تأكيد سحب التوثيق'
            : 'تأكيد منح العلامة الزرقاء'
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className={
                dialog?.kind === 'verified' && dialog.user.isVerified ? 'btn btn-danger' : 'btn btn-primary'
              }
              disabled={verifiedMutation.isPending || !reasonReady || dialog?.kind !== 'verified'}
              onClick={() => {
                if (dialog?.kind === 'verified') {
                  verifiedMutation.mutate({
                    id: dialog.user.id,
                    isVerified: !dialog.user.isVerified,
                    reason: actionReason.trim(),
                  });
                }
              }}
            >
              {verifiedMutation.isPending ? (
                <Spinner className="size-4" />
              ) : dialog?.kind === 'verified' && dialog.user.isVerified ? (
                <ShieldOff className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {dialog?.kind === 'verified' && dialog.user.isVerified ? 'سحب التوثيق' : 'منح التوثيق'}
            </button>
          </div>
        }
      >
        {dialog?.kind === 'verified' ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {dialog.user.isVerified ? 'سيتم سحب العلامة الزرقاء من' : 'ستُمنح العلامة الزرقاء إلى'}{' '}
              <strong className="text-slate-900">{dialog.user.name}</strong>.
            </p>
            <ReasonField value={actionReason} onChange={setActionReason} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'role'}
        onClose={() => setDialog(null)}
        title="تغيير دور الحساب"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                roleMutation.isPending ||
                !reasonReady ||
                dialog?.kind !== 'role' ||
                roleDraft === dialog.user.role
              }
              onClick={() => {
                if (dialog?.kind === 'role') {
                  roleMutation.mutate({
                    id: dialog.user.id,
                    nextRole: roleDraft,
                    reason: actionReason.trim(),
                  });
                }
              }}
            >
              {roleMutation.isPending ? <Spinner className="size-4" /> : <UserCog className="size-4" />}
              حفظ الدور
            </button>
          </div>
        }
      >
        {dialog?.kind === 'role' ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              الحساب <strong className="text-slate-900">{dialog.user.name}</strong> ({dialog.user.email})
              دوره الحالي: <strong>{ROLE_LABELS[dialog.user.role]}</strong>.
            </p>
            <label className="label">
              الدور الجديد
              <select
                value={roleDraft}
                onChange={(event) => setRoleDraft(event.target.value as Role)}
                className="input mt-1.5"
              >
                {(['Freelancer', 'Buyer', 'Parent', 'Admin'] as Role[]).map((item) => (
                  <option key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            {roleDraft === 'Admin' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-6 text-amber-800">
                تحويل الحساب إلى «أدمن» يمنحه كل صلاحيات لوحة الإدارة، بما فيها إدارة المستخدمين
                والنسخ الاحتياطي.
              </p>
            ) : null}
            <ReasonField value={actionReason} onChange={setActionReason} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'dossier'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'dossier' ? `الملف الشامل: ${dialog.user.name}` : 'الملف الشامل'}
        size="xl"
        footer={
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إغلاق
            </button>
          </div>
        }
      >
        {dossierQuery.isPending ? (
          <PageLoader label="جارٍ تجميع الملف الشامل..." />
        ) : dossierQuery.isError || !dossierQuery.data ? (
          <ErrorState message="تعذر تحميل الملف الشامل." onRetry={() => void dossierQuery.refetch()} />
        ) : (
          (() => {
            const dossier = dossierQuery.data;
            const stats = [
              { label: 'طلبات كمشترٍ', value: dossier.stats.ordersAsBuyer },
              { label: 'طلبات كمستقل', value: dossier.stats.ordersAsFreelancer },
              { label: 'طلبات مكتملة', value: dossier.stats.completedOrders },
              { label: 'الخدمات', value: dossier.stats.services },
              { label: 'خدمات نشطة', value: dossier.stats.activeServices },
              { label: 'أعمال المعرض', value: dossier.stats.portfolio },
              { label: 'منشورات المجتمع', value: dossier.stats.posts },
              { label: 'تعليقات', value: dossier.stats.comments },
              { label: 'تقييمات مستلمة', value: dossier.stats.reviewsReceived },
              { label: 'رسائل مرسلة', value: dossier.stats.messagesSent },
              { label: 'رصيد النقاط', value: dossier.stats.pointsBalance },
              { label: 'بلاغات مفتوحة', value: dossier.stats.pendingFlags },
            ];

            return (
              <div className="space-y-5" dir="rtl">
                <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Avatar
                    name={dossier.user.name}
                    src={dossier.user.avatarUrl}
                    className="size-14 rounded-2xl"
                    textClassName="text-base"
                  />
                  <div className="min-w-0 flex-1 space-y-1 text-xs font-semibold text-slate-600">
                    <p className="text-base font-extrabold text-slate-900">{dossier.user.name}</p>
                    <p dir="ltr" className="font-bold text-slate-700">{dossier.user.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span dir="ltr">📞 {dossier.user.phone ?? 'لا يوجد هاتف'}</span>
                      <span dir="ltr">💬 واتساب: {dossier.user.whatsappNumber ?? 'غير متاح'}</span>
                      <span>📍 {dossier.user.location ?? 'غير محدد'}</span>
                      <span>🎂 انضم {formatDate(dossier.user.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Badge tone={dossier.user.isActive ? 'emerald' : 'rose'}>
                        {dossier.user.isActive ? 'نشط' : 'مجمّد'}
                      </Badge>
                      <Badge tone="slate">{ROLE_LABELS[dossier.user.role]}</Badge>
                      <Badge tone="amber">{ACCOUNT_STATUS_LABELS[dossier.user.accountStatus]}</Badge>
                      {dossier.user.isVerified ? <Badge tone="sky">موثّق</Badge> : null}
                      {dossier.user.isFeatured ? <Badge tone="amber">مميز</Badge> : null}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {stats.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
                      <p className="mt-1 text-lg font-extrabold text-slate-900">{formatNumber(item.value)}</p>
                    </div>
                  ))}
                </div>

                <section>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <MonitorSmartphone className="size-4 text-brand-700" />
                    سجل الأجهزة والجلسات ({dossier.sessions.length})
                  </h3>
                  {dossier.sessions.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {dossier.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900">{session.device}</p>
                            <p dir="ltr" className="text-[11px] font-semibold text-slate-500">
                              {session.ip} · {session.routeCount} طلب
                            </p>
                            <p className="text-[11px] text-slate-400">
                              أول ظهور {formatDate(session.firstSeen)} — آخر نشاط {formatDate(session.lastSeen)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={session.revokedAt ? 'rose' : 'emerald'}>
                              {session.revokedAt ? 'مبطلة' : 'نشطة'}
                            </Badge>
                            {session.revokedAt ? null : (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={sessionReason.trim().length < MIN_REASON || revokeSessionMutation.isPending}
                                onClick={() =>
                                  revokeSessionMutation.mutate({
                                    sessionId: session.id,
                                    reason: sessionReason.trim(),
                                  })
                                }
                              >
                                إبطال الجلسة
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                      لا توجد جلسات مسجلة لهذا الحساب.
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-extrabold text-slate-900">روابط الأسرة ({dossier.familyLinks.length})</h3>
                  {dossier.familyLinks.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {dossier.familyLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-extrabold text-slate-900">
                              {link.relation === 'parent' ? 'ولي أمر' : 'ابن/ابنة'}: {link.counterpartName}
                            </p>
                            <p dir="ltr" className="text-[11px] text-slate-500">{link.counterpartEmail}</p>
                            <p className="text-[11px] text-slate-400">
                              الرابط منذ {formatDate(link.createdAt)}
                              {link.chatAccessEnabled ? ' · وصول للمحادثات مفعّل' : ''}
                            </p>
                          </div>
                          <Badge tone={link.status === 'APPROVED' ? 'emerald' : link.status === 'PENDING' ? 'amber' : 'rose'}>
                            {FAMILY_STATUS_LABELS[link.status]}
                          </Badge>
                          <button type="button" className="btn btn-danger btn-sm" disabled={familyReason.trim().length < MIN_REASON || removeFamilyLinkMutation.isPending} onClick={() => removeFamilyLinkMutation.mutate({ linkId: link.id, reason: familyReason.trim() })}>إلغاء الربط قسرياً</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                      لا توجد روابط ولي أمر أو أبناء.
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-extrabold text-slate-900">توثيق القاصرين ({dossier.verifications.length})</h3>
                  {dossier.verifications.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {dossier.verifications.map((verification) => (
                        <div key={verification.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-extrabold text-slate-900">{verification.childName}</p>
                              <p className="text-[11px] text-slate-500" dir="ltr">
                                {verification.parentEmail ?? verification.parentPhone}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {FAMILY_STATUS_LABELS[verification.status]} · أُنشئ{' '}
                                {formatDate(verification.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {verification.hasPhoto ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={photoLoadingId === verification.id}
                                  onClick={() => void viewVerificationPhoto(verification.id)}
                                >
                                  {photoLoadingId === verification.id ? <Spinner className="size-3.5" /> : null}
                                  عرض صورة التحقق
                                </button>
                              ) : (
                                <Badge tone="slate">بلا صورة</Badge>
                              )}
                            </div>
                          </div>
                          {verificationPhoto?.id === verification.id ? (
                            <img
                              src={verificationPhoto.url}
                              alt={`صورة تحقق ${verification.childName}`}
                              className="mt-2 max-h-64 rounded-xl border border-slate-200 object-contain"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                      لا توجد طلبات توثيق مرتبطة بهذا الحساب.
                    </p>
                  )}
                </section>
              </div>
            );
          })()
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'impersonate'}
        onClose={() => setDialog(null)}
        title="بدء جلسة إدارية بحساب المستخدم"
        size="sm"
        footer={<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>إلغاء</button><button type="button" className="btn btn-primary" disabled={dialog?.kind !== 'impersonate' || impersonateMutation.isPending} onClick={() => { if (dialog?.kind === 'impersonate') impersonateMutation.mutate({ id: dialog.user.id }); }}>{impersonateMutation.isPending ? <Spinner className="size-4" /> : null}معاينة الحساب</button></div>}
      >
        <div className="space-y-4"><p className="text-sm leading-6 text-amber-800">ستُطلب مطابقة وجهك قبل البدء. الجلسة مؤقتة لمدة 15 دقيقة ومسجلة في سجل التدقيق، وسيظهر شريط ثابت للعودة إلى الإدارة. تتاح المعاينة للحسابات النشطة المكتملة من كل الأدوار، عدا حسابات الإدارة.</p></div>
      </Modal>

      <Modal
        open={dialog?.kind === 'delete'}
        onClose={() => setDialog(null)}
        title="حذف أو أرشفة الحساب"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleteMutation.isPending || !reasonReady || dialog?.kind !== 'delete'}
              onClick={() => {
                if (dialog?.kind === 'delete') {
                  deleteMutation.mutate({ id: dialog.user.id, reason: actionReason.trim() });
                }
              }}
            >
              {deleteMutation.isPending ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
              تأكيد الحذف
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-rose-700">
            سيُحذف الحساب نهائيًا إن لم تكن له طلبات أو سجلات مرتبطة. وإذا كانت هناك طلبات أو محادثات
            سابقة، فسيُؤرشف الحساب ويُعطَّل الوصول إليه مع الاحتفاظ بتاريخ الطلبات حفاظًا على سلامة
            البيانات. إن كان الهدف إيقاف المستخدم مؤقتًا فقط، استخدم «تجميد الحساب» بدل الحذف.
          </p>
          <ReasonField value={actionReason} onChange={setActionReason} />
        </div>
      </Modal>
    </section>
  );
};
