import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Bell,
  Copy,
  Eye,
  Flag,
  Headset,
  Layers,
  LayoutDashboard,
  MessagesSquare,
  MessageSquareText,
  Newspaper,
  Search,
  MonitorSmartphone,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Waves,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { CommunityDashboardPanel } from '@/components/dashboard/CommunityDashboardPanel';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { formatNumber } from '@/lib/utils';
import { adminApi } from '@/services/admin.service';
import { systemApi } from '@/services/system.service';
import { parentApi } from '@/services/parent.service';
import { supportApi } from '@/services/support.service';

const AdminModerationPanel = lazy(() => import('@/components/dashboard/AdminModerationPanel').then((module) => ({ default: module.AdminModerationPanel })));
const AdminNotificationsPanel = lazy(() => import('@/components/dashboard/AdminNotificationsPanel').then((module) => ({ default: module.AdminNotificationsPanel })));
const AdminReportsPanel = lazy(() => import('@/components/dashboard/AdminReportsPanel').then((module) => ({ default: module.AdminReportsPanel })));
const AdminReviewsPanel = lazy(() => import('@/components/dashboard/AdminReviewsPanel').then((module) => ({ default: module.AdminReviewsPanel })));
const AdminSessionsPanel = lazy(() => import('@/components/dashboard/AdminSessionsPanel').then((module) => ({ default: module.AdminSessionsPanel })));
const AdminSystemPanel = lazy(() => import('@/components/dashboard/AdminSystemPanel').then((module) => ({ default: module.AdminSystemPanel })));
const AdminUsersPanel = lazy(() => import('@/components/dashboard/AdminUsersPanel').then((module) => ({ default: module.AdminUsersPanel })));
const AdminParentVerificationsPanel = lazy(() => import('@/components/dashboard/AdminParentVerificationsPanel').then((module) => ({ default: module.AdminParentVerificationsPanel })));
const AdminSupportPanel = lazy(() => import('@/components/dashboard/AdminSupportPanel').then((module) => ({ default: module.AdminSupportPanel })));
const AdminOrdersPanel = lazy(() => import('@/components/dashboard/AdminOrdersPanel').then((module) => ({ default: module.AdminOrdersPanel })));
const AdminConversationsPanel = lazy(() => import('@/components/dashboard/AdminConversationsPanel').then((module) => ({ default: module.AdminConversationsPanel })));
const AdminContentPanel = lazy(() => import('@/components/dashboard/AdminContentPanel').then((module) => ({ default: module.AdminContentPanel })));
const AdminAuditPanel = lazy(() => import('@/components/dashboard/AdminAuditPanel').then((module) => ({ default: module.AdminAuditPanel })));

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'orders', label: 'الطلبات والنزاعات', icon: ShoppingBag },
  { id: 'content', label: 'المحتوى والخدمات', icon: Layers },
  { id: 'system', label: 'النظام والطوارئ', icon: Activity },
  { id: 'sessions', label: 'الجلسات والحظر', icon: MonitorSmartphone },
  { id: 'moderation', label: 'فاحص المحتوى', icon: ShieldAlert },
  { id: 'reports', label: 'البلاغات', icon: Flag },
  { id: 'audit', label: 'سجل التدقيق', icon: ScrollText },
  { id: 'reviews', label: 'التقييمات', icon: MessageSquareText },
  { id: 'conversations', label: 'سجل المحادثات', icon: MessagesSquare },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'community', label: 'المجتمع', icon: Newspaper },
  { id: 'parent-verifications', label: 'توثيق أولياء الأمور', icon: UserCheck },
  { id: 'support', label: 'الدعم الفني والرسائل', icon: Headset },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const AdminDashboardPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  useDocumentTitle('لوحة الإدارة');

  const [tab, setTab] = useState<TabId>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (window.location.pathname === '/admin/reports') return 'reports';
    return TABS.some((item) => item.id === requested) ? requested as TabId : 'overview';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [savedSearches, setSavedSearches] = useState<string[]>(() => {
    try { const value = JSON.parse(localStorage.getItem('mabdeen_admin_saved_searches') ?? '[]') as unknown; return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 8) : []; } catch { return []; }
  });

  useEffect(() => {
    if (location.pathname === '/admin/reports') { setTab('reports'); return; }
    const requested = searchParams.get('tab');
    if (TABS.some((item) => item.id === requested)) setTab(requested as TabId);
  }, [searchParams, location.pathname]);

  const selectTab = (next: TabId, searchText?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', next);
    if (searchText?.trim()) params.set('q', searchText.trim());
    else params.delete('q');
    setTab(next);
    setPaletteOpen(false);
    setPaletteQuery('');
    navigate({ pathname: '/admin', search: `?${params.toString()}` });
  };

  const copyAdminLink = async (next: TabId, searchText: string) => {
    const url = new URL('/admin', window.location.origin);
    url.searchParams.set('tab', next);
    url.searchParams.set('q', searchText);
    try { await navigator.clipboard.writeText(url.toString()); toast.success('تم نسخ رابط مباشر إلى النتيجة.'); }
    catch { toast.error('تعذر نسخ الرابط من المتصفح.'); }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const matchingTabs = TABS.filter((item) => item.label.toLocaleLowerCase().includes(paletteQuery.trim().toLocaleLowerCase()));
  const globalSearch = useDebounce(paletteQuery.trim(), 250);
  const canSearchEntities = paletteOpen && globalSearch.length >= 2;
  const usersSearch = useQuery({ queryKey: ['admin-global-search-users', globalSearch], queryFn: () => adminApi.users({ q: globalSearch, limit: 5 }), enabled: canSearchEntities });
  const ordersSearch = useQuery({ queryKey: ['admin-global-search-orders', globalSearch], queryFn: () => adminApi.orders({ q: globalSearch, limit: 5 }), enabled: canSearchEntities });
  const conversationsSearch = useQuery({ queryKey: ['admin-global-search-conversations', globalSearch], queryFn: () => adminApi.allConversations({ q: globalSearch, page: 1, limit: 5 }), enabled: canSearchEntities });

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
    refetchInterval: 30_000,
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: () => systemApi.settings(),
    staleTime: 15_000,
  });
  const parentQueueQuery = useQuery({ queryKey: ['admin-parent-queue-count'], queryFn: () => parentApi.adminQueue({ page: 1, limit: 1 }), refetchInterval: 30_000 });
  const supportQueueQuery = useQuery({ queryKey: ['admin-support-queue-count'], queryFn: () => supportApi.all({ page: 1, limit: 1, status: 'OPEN' }), refetchInterval: 30_000 });
  const queueTotal = (statsQuery.data?.pendingReports ?? 0) + (statsQuery.data?.pendingFlags ?? 0) + (parentQueueQuery.data?.pagination.total ?? 0) + (supportQueueQuery.data?.pagination.total ?? 0);
  const queueLoaded = statsQuery.isSuccess && parentQueueQuery.isSuccess && supportQueueQuery.isSuccess;
  const previousQueueTotal = useRef<number | null>(null);
  useEffect(() => {
    if (!queueLoaded) return;
    if (previousQueueTotal.current !== null && queueTotal > previousQueueTotal.current) toast.info('وصلت عناصر جديدة إلى طابور عمل الإدارة.');
    previousQueueTotal.current = queueTotal;
  }, [queueLoaded, queueTotal, toast]);

  if (statsQuery.isPending) {
    return <PageLoader label="جارٍ تحميل لوحة الإدارة..." />;
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="container-page py-16">
        <ErrorState
          message="تعذر تحميل إحصائيات الإدارة. تأكد من الصلاحيات واتصال الخادم."
          onRetry={() => void statsQuery.refetch()}
        />
      </div>
    );
  }

  const stats = statsQuery.data;
  const maintenanceActive = settingsQuery.data?.system.maintenanceEnabled ?? false;
  const maxSkillCount = Math.max(
    1,
    ...stats.topSkills.map((skill) => skill.freelancers),
  );

  const quickCards = [
    {
      id: 'system' as const,
      icon: Activity,
      title: 'أزرار الطوارئ',
      description: 'وضع الصيانة العام، إغلاق التسجيل، وفحص صحة الخادم لحظة بلحظة.',
      value: maintenanceActive ? 'الصيانة مفعّلة' : 'المنصة تعمل',
      tone: maintenanceActive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'sessions' as const,
      icon: MonitorSmartphone,
      title: 'الجلسات وحظر العناوين',
      description: 'انظر عناوين IP ومتصفحات المستخدمين، أنهِ جلسته أو احظر عنوانه.',
      value: `${formatNumber(stats.liveSessions)} جلسة نشطة`,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      id: 'moderation' as const,
      icon: ShieldAlert,
      title: 'فاحص المحتوى الآلي',
      description: 'بلاغات الروابط والأرقام والمصطلحات المحظورة داخل البروفايلات.',
      value: `${formatNumber(stats.pendingFlags)} بلاغ محتوى`,
      tone: 'bg-rose-50 text-rose-700',
    },
    {
      id: 'users' as const,
      icon: Users,
      title: 'إدارة المستخدمين',
      description: 'توثيق، تمييز، تعديل أي حقل، تعيين كلمة مرور أو حذف الحساب.',
      value: `${formatNumber(stats.freelancers)} مستقل`,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      id: 'reports' as const,
      icon: Flag,
      title: 'البلاغات الواردة',
      description: 'مراجعة بلاغات المستخدمين واتخاذ الإجراء المناسب.',
      value: `${formatNumber(stats.pendingReports)} قيد الانتظار`,
      tone: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <>
    {paletteOpen ? (
      <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/55 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label="الانتقال السريع" className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <Search className="size-5 text-brand-600" />
            <input autoFocus value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && matchingTabs[0]) selectTab(matchingTabs[0].id); }} placeholder="ابحث عن قسم وافتحه فوراً..." className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" />
            <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">ESC</kbd>
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {savedSearches.length > 0 ? <div className="mb-2 flex flex-wrap gap-1.5 border-b border-slate-100 px-2 pb-3">{savedSearches.map((item) => <button key={item} type="button" onClick={() => setPaletteQuery(item)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-700">{item}</button>)}</div> : null}
            {paletteQuery.trim().length >= 2 ? <div className="mb-2 flex items-center justify-between border-b border-slate-100 px-3 py-2"><span className="text-[11px] font-bold text-slate-400">نتائج بحث موحّد</span><button type="button" disabled={savedSearches.includes(paletteQuery.trim())} onClick={() => { const next = [paletteQuery.trim(), ...savedSearches.filter((item) => item !== paletteQuery.trim())].slice(0, 8); setSavedSearches(next); localStorage.setItem('mabdeen_admin_saved_searches', JSON.stringify(next)); }} className="text-[11px] font-bold text-brand-700 disabled:opacity-40">حفظ البحث</button></div> : null}
            {canSearchEntities ? <div className="space-y-1 border-b border-slate-100 px-1 pb-3">
              {(usersSearch.data?.items ?? []).map((user) => <div key={`user-${user.id}`} className="flex items-center gap-1"><button type="button" onClick={() => selectTab('users', user.email || user.name)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-sky-50"><Users className="size-4 shrink-0 text-sky-600" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{user.name}</span><span className="block truncate text-[11px] text-slate-500">{user.email} · {user.role}</span></span><span className="text-[10px] font-bold text-slate-400">مستخدم</span></button><button type="button" onClick={() => void copyAdminLink('users', user.email || user.name)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700" aria-label="نسخ رابط المستخدم"><Copy className="size-4"/></button></div>)}
              {(ordersSearch.data?.items ?? []).map((order) => <div key={`order-${order.id}`} className="flex items-center gap-1"><button type="button" onClick={() => selectTab('orders', order.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-amber-50"><ShoppingBag className="size-4 shrink-0 text-amber-600" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{order.serviceTitle}</span><span className="block truncate text-[11px] text-slate-500">{order.buyerName} · {order.status}</span></span><span className="text-[10px] font-bold text-slate-400">طلب</span></button><button type="button" onClick={() => void copyAdminLink('orders', order.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700" aria-label="نسخ رابط الطلب"><Copy className="size-4"/></button></div>)}
              {(conversationsSearch.data?.items ?? []).map((conversation) => <div key={`conversation-${conversation.id}`} className="flex items-center gap-1"><button type="button" onClick={() => selectTab('conversations', globalSearch)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-violet-50"><MessagesSquare className="size-4 shrink-0 text-violet-600" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{conversation.participantA.name} · {conversation.participantB.name}</span><span className="block truncate text-[11px] text-slate-500">{conversation.serviceTitle || 'محادثة مباشرة'} · {conversation.messageCount} رسالة</span></span><span className="text-[10px] font-bold text-slate-400">محادثة</span></button><button type="button" onClick={() => void copyAdminLink('conversations', globalSearch)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700" aria-label="نسخ رابط المحادثة"><Copy className="size-4"/></button></div>)}
              {usersSearch.isFetching || ordersSearch.isFetching || conversationsSearch.isFetching ? <p className="px-3 py-2 text-xs font-semibold text-slate-400">جارٍ البحث في بيانات الإدارة…</p> : null}
              {!usersSearch.isFetching && !ordersSearch.isFetching && !conversationsSearch.isFetching && !(usersSearch.data?.items.length || ordersSearch.data?.items.length || conversationsSearch.data?.items.length) ? <p className="px-3 py-3 text-xs font-semibold text-slate-500">لا توجد نتائج مستخدمين أو طلبات أو محادثات.</p> : null}
            </div> : null}
            {matchingTabs.map((item) => <button key={item.id} type="button" onClick={() => selectTab(item.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start text-sm font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-800"><item.icon className="size-4" />{item.label}<span className="ms-auto text-[10px] font-semibold text-slate-400">فتح القسم</span></button>)}
            {matchingTabs.length === 0 && !canSearchEntities ? <p className="px-4 py-8 text-center text-sm font-semibold text-slate-500">لا توجد أقسام مطابقة.</p> : null}
          </div>
        </section>
      </div>
    ) : null}
    <div className="container-page py-8 sm:py-10">
      <section className="relative overflow-hidden rounded-4xl border border-slate-100 bg-linear-to-br from-cyan-50 via-white to-sky-50 p-6 text-slate-900 shadow-xl shadow-slate-200/40 sm:p-8">
        <div className="pointer-events-none absolute -inset-e-16 -top-20 size-64 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
              <ShieldCheck className="size-4 text-orange-500" />
              صلاحيات إدارية
            </span>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">لوحة إدارة الدليل</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              تحكم كامل: أزرار طوارئ للنظام، جلسات وعناوين IP، فاحص محتوى آلي،
              وتوثيق أو تعديل أي حساب مباشرة من الجدول.
            </p>
          </div>
          {stats.pendingReports > 0 ? (
            <button
              type="button"
              onClick={() => selectTab('reports')}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
            >
              <AlertTriangle className="size-5 text-amber-600" />
              {formatNumber(stats.pendingReports)} بلاغ بحاجة للمراجعة
            </button>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              <UserCheck className="size-5" />
              لا توجد بلاغات معلقة
            </span>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="إجمالي المستقلين"
          value={formatNumber(stats.freelancers)}
          hint={`${formatNumber(stats.activeFreelancers)} حساب نشط`}
          tone="brand"
        />
        <StatCard
          icon={Star}
          label="التقييمات"
          value={formatNumber(stats.reviews)}
          hint="إجمالي تقييمات العملاء"
          tone="amber"
        />
        <StatCard
          icon={Flag}
          label="بلاغات معلقة"
          value={formatNumber(stats.pendingReports)}
          hint="تحتاج إلى مراجعة"
          tone={stats.pendingReports > 0 ? 'rose' : 'emerald'}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          label="حسابات موثّقة"
          value={formatNumber(stats.verifiedFreelancers)}
          hint="العلامة الزرقاء من الإدارة"
          tone="sky"
        />
        <StatCard
          icon={ShieldAlert}
          label="بلاغات محتوى"
          value={formatNumber(stats.pendingFlags)}
          hint="كشفها الفاحص الآلي"
          tone={stats.pendingFlags > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          icon={MonitorSmartphone}
          label="جلسات نشطة"
          value={formatNumber(stats.liveSessions)}
          hint="متصلة خلال 30 دقيقة"
          tone="brand"
        />
        <StatCard
          icon={Waves}
          label="عناوين محظورة"
          value={formatNumber(stats.blockedIps)}
          hint={maintenanceActive ? 'وضع الصيانة العام مفعّل' : 'الوصول مفتوح للمستخدمين'}
          tone={maintenanceActive ? 'rose' : 'slate'}
        />
      </div>

      {maintenanceActive ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
            <AlertTriangle className="size-5 shrink-0 text-rose-600" />
            وضع الصيانة العام مفعّل: جميع غير الأدمن يرون صفحة الصيانة الآن.
          </p>
          <button type="button" onClick={() => selectTab('system')} className="btn btn-danger btn-sm">
            فتح أزرار الطوارئ
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={
                active
                  ? 'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm'
                  : 'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-800'
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => setPaletteOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700"><Search className="size-3.5" />بحث شامل وانتقال سريع <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></button><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><span className={`size-1.5 rounded-full ${statsQuery.isFetching ? 'animate-pulse bg-amber-400' : 'bg-emerald-500'}`} />تحديث مؤشرات اللوحة تلقائيًا كل 30 ثانية</span></div>

      <div className="mt-6">
        {tab === 'overview' ? (
          <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-extrabold text-slate-900">طابور العمل</h2><p className="mt-1 text-xs font-semibold text-slate-500">افتح الأولويات المعلّقة مباشرةً، وتتجدد الأعداد تلقائيًا.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">تحديث مباشر</span></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { id: 'reports' as const, label: 'بلاغات تنتظر المراجعة', count: stats.pendingReports, icon: Flag, tone: 'bg-amber-50 text-amber-700' },
                { id: 'moderation' as const, label: 'إشارات المحتوى', count: stats.pendingFlags, icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700' },
                { id: 'parent-verifications' as const, label: 'توثيقات أولياء الأمور', count: parentQueueQuery.data?.pagination.total ?? 0, icon: UserCheck, tone: 'bg-violet-50 text-violet-700' },
                { id: 'support' as const, label: 'تذاكر دعم مفتوحة', count: supportQueueQuery.data?.pagination.total ?? 0, icon: Headset, tone: 'bg-cyan-50 text-cyan-700' },
              ].map((item) => <button key={item.id} type="button" onClick={() => selectTab(item.id)} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-start transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="size-5"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-600">{item.label}</span><span className="mt-1 block text-xl font-black text-slate-900">{formatNumber(item.count)}</span></span></button>)}
            </div>
          </section>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">أكثر المهارات طلباً</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    توزيع المستقلين النشطين حسب المهارات.
                  </p>
                </div>
                <TrendingUp className="size-5 text-brand-600" />
              </div>

              {stats.topSkills.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {stats.topSkills.map((skill) => (
                    <div key={skill.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {skill.name}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {formatNumber(skill.freelancers)} مستقل
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-linear-to-l from-brand-400 to-brand-700"
                          style={{
                            width: `${Math.max(
                              6,
                              (skill.freelancers / maxSkillCount) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                  لا توجد مهارات مرتبطة بمستقلين بعد.
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Eye className="size-3.5" />
                    زيارات البروفايلات
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {formatNumber(stats.profileViews)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Sparkles className="size-3.5" />
                    بروفايلات مميزة
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {formatNumber(stats.featuredFreelancers)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              {quickCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => selectTab(card.id)}
                  className="card flex w-full items-start gap-4 p-5 text-start transition hover:-translate-y-0.5 hover:border-brand-200"
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}
                  >
                    <card.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-900">
                        {card.title}
                      </p>
                      <Badge tone="slate">{card.value}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {card.description}
                    </p>
                  </div>
                </button>
              ))}

              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-xs font-semibold leading-6 text-brand-900 sm:col-span-2">
                المنصة تعمل كدليل مباشر فقط: لا مدفوعات ولا وساطة مالية. دور
                الإدارة هو ضبط جودة المحتوى ومراجعة البلاغات.
              </div>
            </section>
          </div>
          </div>
        ) : null}

        <Suspense fallback={<PageLoader label="جارٍ تحميل القسم..." />}>
          {tab === 'users' ? <AdminUsersPanel /> : null}
          {tab === 'orders' ? <AdminOrdersPanel /> : null}
          {tab === 'content' ? <AdminContentPanel /> : null}
          {tab === 'system' ? <AdminSystemPanel /> : null}
          {tab === 'sessions' ? <AdminSessionsPanel /> : null}
          {tab === 'moderation' ? <AdminModerationPanel /> : null}
          {tab === 'reports' ? <AdminReportsPanel /> : null}
          {tab === 'audit' ? <AdminAuditPanel /> : null}
          {tab === 'reviews' ? <AdminReviewsPanel /> : null}
          {tab === 'conversations' ? <AdminConversationsPanel /> : null}
          {tab === 'notifications' ? <AdminNotificationsPanel /> : null}
          {tab === 'community' ? <CommunityDashboardPanel /> : null}
          {tab === 'parent-verifications' ? <AdminParentVerificationsPanel /> : null}
          {tab === 'support' ? <AdminSupportPanel /> : null}
        </Suspense>
      </div>
    </div>
    </>
  );
};
