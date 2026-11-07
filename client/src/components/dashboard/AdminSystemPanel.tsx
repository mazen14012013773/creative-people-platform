import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  FileJson,
  RefreshCw,
  RotateCcw,
  Save,
  ServerCog,
  ShieldAlert,
  Siren,
  Timer,
  UploadCloud,
  Users2,
} from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/context/ToastContext';
import { formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { systemApi } from '@/services/system.service';

const REFRESH_MS = 5_000;
const MIN_REASON = 0;
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const RESET_CODE = 'RESET_ALL_DATA';

const formatUptime = (seconds: number): string => {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} س ${minutes} د`;
  }

  return `${minutes} د ${seconds % 60} ث`;
};

const toLocalInputValue = (iso: string | null): string => {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

export const AdminSystemPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const healthQuery = useQuery({
    queryKey: ['admin-health'],
    queryFn: systemApi.health,
    refetchInterval: autoRefresh ? REFRESH_MS : false,
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: systemApi.settings,
  });

  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [returnsAt, setReturnsAt] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [blockedTerms, setBlockedTerms] = useState('');
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [settingsReason, setSettingsReason] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreReason, setRestoreReason] = useState('');
  const [dragging, setDragging] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetReason, setResetReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formDirtyRef = useRef(false);

  const markDirty = () => {
    formDirtyRef.current = true;
  };

  useEffect(() => {
    const settings = settingsQuery.data;

    if (!settings || formDirtyRef.current) {
      return;
    }

    setMaintenance(settings.system.maintenanceEnabled);
    setMessage(settings.system.maintenanceMessage);
    setReturnsAt(toLocalInputValue(settings.system.maintenanceReturnsAt));
    setRegistrationOpen(settings.system.registrationOpen);
    setBlockedTerms(settings.blockedTerms.join('، '));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: systemApi.saveSettings,
    onSuccess: async (system) => {
      toast.success(
        system.maintenanceEnabled
          ? 'وضع الصيانة مفعّل، الزوار سيرون صفحة الصيانة'
          : 'تم حفظ إعدادات النظام',
      );
      formDirtyRef.current = false;
      setSettingsDialog(false);
      setSettingsReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-health'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حفظ إعدادات النظام')),
  });

  const backupMutation = useMutation({
    mutationFn: systemApi.downloadBackup,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `mabdeen-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('تم تنزيل النسخة الاحتياطية الكاملة');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تنزيل النسخة الاحتياطية')),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ file, reason }: { file: File; reason: string }) =>
      systemApi.restoreBackup(file, reason),
    onSuccess: async (result) => {
      const tables = Object.keys(result.restored).length;

      toast.success(
        result.skippedTables.length > 0
          ? `تمت استعادة ${tables} جدول، وتخطّي ${result.skippedTables.length} جدول غير معروف`
          : `تمت استعادة ${tables} جدول بنجاح`,
      );
      setRestoreFile(null);
      setRestoreReason('');
      await queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر استعادة النسخة الاحتياطية')),
  });

  const resetMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => systemApi.resetData(reason),
    onSuccess: async (result) => {
      if (result.files.errors.length) toast.error(`تم مسح بيانات المنصة، لكن تعذر تنظيف ${result.files.errors.length} مجلد ملفات`);
      else toast.success(`تم مسح بيانات المنصة وملفاتها مع الاحتفاظ بـ ${result.keptAdmins} حساب إدارة`);
      setResetDialog(false);
      setResetCode('');
      setResetReason('');
      await queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر مسح البيانات التشغيلية')),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsReason('');
    setSettingsDialog(true);
  };

  const confirmSettings = () => {
    const terms = blockedTerms
      .split(/[,،]/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    const payload = {
      maintenanceEnabled: maintenance,
      maintenanceMessage: message.trim(),
      maintenanceReturnsAt: returnsAt || null,
      registrationOpen,
      blockedTerms: terms,
      reason: settingsReason.trim(),
    };
    saveMutation.mutate(payload);
  };

  const acceptRestoreFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('ملف النسخة الاحتياطية يجب أن يكون بصيغة JSON');
      return;
    }

    if (file.size > MAX_BACKUP_BYTES) {
      toast.error('حجم الملف يتجاوز الحد الأقصى 50 ميجابايت');
      return;
    }

    setRestoreReason('');
    setRestoreFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptRestoreFile(event.dataTransfer.files?.[0]);
  };

  if (settingsQuery.isPending || healthQuery.isPending) {
    return <PageLoader label="جارٍ قراءة حالة النظام..." />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <ErrorState
        message="تعذر تحميل إعدادات النظام."
        onRetry={() => void settingsQuery.refetch()}
      />
    );
  }

  const metrics = healthQuery.data;
  const degraded = metrics?.status === 'degraded';
  const settingsReasonReady = settingsReason.trim().length >= MIN_REASON;
  const restoreReasonReady = restoreReason.trim().length >= MIN_REASON;
  const resetReady = resetCode.trim() === RESET_CODE && resetReason.trim().length >= MIN_REASON;

  return (
    <section className="space-y-5">
      <form onSubmit={submit} className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-linear-to-l from-rose-50 via-white to-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Siren className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">أدوات الطوارئ</h2>
              <p className="text-xs font-semibold text-slate-500">
                إيقاف المنصة للجميع، أو تجميد التسجيل، أو توسيع قائمة المحتوى المحظور.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={maintenance ? 'rose' : 'emerald'}>
              {maintenance ? 'وضع الصيانة مفعّل' : 'المنصة تعمل'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Switch
              checked={maintenance}
              onChange={(value) => {
                markDirty();
                setMaintenance(value);
              }}
              tone="rose"
              label="وضع الصيانة الشامل"
              description="كل الزوار والمستقلون يوجّهون لصفحة الصيانة. الإدارة فقط تستطيع الدخول."
            />
            <Switch
              checked={registrationOpen}
              onChange={(value) => {
                markDirty();
                setRegistrationOpen(value);
              }}
              label="فتح باب التسجيل"
              description="أوقف التسجيل مؤقتاً إذا لاحظت موجة حسابات وهمية."
            />
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="label">رسالة الصيانة</span>
              <textarea
                rows={3}
                maxLength={300}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="input resize-y"
                placeholder="المنصة قيد الصيانة الدورية، سنعود قريباً."
              />
            </label>
            <label className="block">
              <span className="label">موعد العودة المتوقع</span>
              <input
                type="datetime-local"
                value={returnsAt}
                onChange={(event) => setReturnsAt(event.target.value)}
                className="input"
              />
            </label>
          </div>

          <div className="lg:col-span-2">
            <label className="block">
              <span className="label">كلمات محظورة إضافية (افصل بينها بفاصلة)</span>
              <input
                value={blockedTerms}
                onChange={(event) => setBlockedTerms(event.target.value)}
                className="input"
                placeholder="احتيال, بيع حساب, قرصنة"
              />
              <span className="mt-1.5 block text-xs font-semibold text-slate-500">
                تُضاف للكلمات المحظورة الافتراضية، وأي بروفايل يحتوي عليها يوقف فوراً ويُسجَّل بلاغ.
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold text-slate-500">
            كل تعديل يتطلب مطابقة الوجه، ويُسجّل تلقائياً في سجل التدقيق.
          </p>
          <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
            {saveMutation.isPending ? <Spinner className="size-4" /> : <Save className="size-4" />}
            حفظ إعدادات النظام
          </button>
        </div>
      </form>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Database className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">النسخ الاحتياطي والاستعادة</h2>
              <p className="text-xs font-semibold text-slate-500">
                نسخة JSON كاملة من كل الجداول، وتُستعاد داخل معاملة واحدة دون كسر العلاقات.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Download className="size-4 text-brand-700" />
              تنزيل نسخة احتياطية
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              تنزيل ملف <code dir="ltr">mabdeen-backup-YYYY-MM-DD.json</code> يحتوي كل الجداول
              وعدد سجلاتها ووقت الإنشاء. احتفظ بالملف في مكان آمن خارج الخادم.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4"
              disabled={backupMutation.isPending}
              onClick={() => backupMutation.mutate()}
            >
              {backupMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <FileJson className="size-4" />
              )}
              تنزيل النسخة الاحتياطية
            </button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <UploadCloud className="size-4 text-amber-700" />
              استعادة نسخة احتياطية
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              استبدال بيانات الجداول ببيانات الملف. العملية ذرّية: إن فشل أي جدول يُلغى كل شيء.
            </p>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={
                dragging
                  ? 'mt-3 cursor-pointer rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-5 text-center'
                  : 'mt-3 cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center transition hover:border-amber-300'
              }
            >
              <UploadCloud className="mx-auto size-6 text-slate-400" />
              <p className="mt-2 text-xs font-bold text-slate-700">
                اسحب ملف JSON هنا أو اضغط للاختيار
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                الحد الأقصى 50 ميجابايت
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) => {
                  acceptRestoreFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card border-rose-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-rose-900">منطقة الخطر</h2>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-rose-700">
                حذف بيانات المنصة بالكامل، بما فيها الحسابات غير الإدارية والمحتوى والمحادثات وسجل التدقيق
                والملفات المرفوعة. تُحفظ حسابات الأدمن فقط لتظل إمكانية الدخول متاحة.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setResetCode('');
              setResetReason('');
              setResetDialog(true);
            }}
          >
            <RotateCcw className="size-4" />
            مسح البيانات التشغيلية
          </button>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Activity className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">مراقب صحة الخادم</h2>
              <p className="text-xs font-semibold text-slate-500">
                {metrics
                  ? `${metrics.environment} • Node ${metrics.nodeVersion} • مدة التشغيل ${formatUptime(metrics.uptimeSeconds)}`
                  : 'قراءة مباشرة من الخادم'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              label="تحديث تلقائي"
            />
            <button
              type="button"
              onClick={() => void healthQuery.refetch()}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className={healthQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} />
              تحديث
            </button>
          </div>
        </div>

        {healthQuery.isError || !metrics ? (
          <div className="mt-5">
            <ErrorState
              message="تعذر قراءة مؤشرات الخادم."
              onRetry={() => void healthQuery.refetch()}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={degraded ? 'amber' : 'emerald'}>
                {degraded ? 'الأداء متدهور' : 'كل الأنظمة تعمل'}
              </Badge>
              <Badge tone="slate">آخر قراءة: {new Date(metrics.now).toLocaleTimeString('ar-EG')}</Badge>
              {metrics.database.latencyMs < 0 ? <Badge tone="rose">قاعدة البيانات متوقفة</Badge> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Timer}
                label="زمن الاستجابة p95"
                value={`${metrics.latency.p95Ms} م.ث`}
                hint={`متوسط ${metrics.latency.avgMs} • أعلى ${metrics.latency.maxMs}`}
                tone={metrics.latency.p95Ms > 1500 ? 'rose' : 'brand'}
              />
              <StatCard
                icon={ServerCog}
                label="استهلاك الذاكرة RSS"
                value={`${metrics.memory.rssMb} م.ب`}
                hint={`قمة ${metrics.memory.peakRssMb} • كومة ${metrics.memory.heapUsedMb}`}
                tone={metrics.memory.rssMb > 800 ? 'amber' : 'emerald'}
              />
              <StatCard
                icon={ShieldAlert}
                label="الأخطاء خلال النافذة"
                value={formatNumber(metrics.traffic.errors)}
                hint={`5xx ${metrics.traffic.statusCounts.fiveXx} • 4xx ${metrics.traffic.statusCounts.fourXx}`}
                tone={metrics.traffic.errors > 0 ? 'rose' : 'emerald'}
              />
              <StatCard
                icon={Users2}
                label="طلبات النافذة"
                value={formatNumber(metrics.traffic.requests)}
                hint={`${formatNumber(metrics.latency.samples)} عيّنة سرعة`}
                tone="brand"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  <Timer className="size-4" />
                  توزيع زمن الاستجابة
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'الوسطي p50', value: metrics.latency.p50Ms },
                    { label: 'p95', value: metrics.latency.p95Ms },
                    { label: 'الأقصى', value: metrics.latency.maxMs },
                    { label: 'تأخير حلقة الأحداث', value: metrics.eventLoop.meanLagMs },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{row.label}</dt>
                      <dd className="font-extrabold text-slate-900">{row.value} م.ث</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  <Database className="size-4" />
                  قاعدة البيانات
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'حجم الملف', value: `${metrics.database.sizeMb} م.ب` },
                    { label: 'زمن الاستعلام', value: `${metrics.database.latencyMs} م.ث` },
                    { label: 'المستخدمون', value: formatNumber(metrics.database.users) },
                    { label: 'الجلسات المخزّنة', value: formatNumber(metrics.database.sessions) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{row.label}</dt>
                      <dd className="font-extrabold text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  <ShieldAlert className="size-4" />
                  الحماية والجلسات النشطة
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'عناوين IP المحظورة', value: formatNumber(metrics.security.blockedIps) },
                    { label: 'الجلسات النشطة', value: formatNumber(metrics.security.liveSessions) },
                    { label: 'بلاغات الإشراف المعلّقة', value: formatNumber(metrics.security.pendingFlags) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{row.label}</dt>
                      <dd className="font-extrabold text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-175 text-start">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-start">المسار</th>
                    <th className="px-4 py-3 text-start">الطلبات</th>
                    <th className="px-4 py-3 text-start">متوسط الزمن</th>
                    <th className="px-4 py-3 text-start">أقصى زمن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.routes.length > 0 ? (
                    metrics.routes.map((route) => (
                      <tr key={`${route.method} ${route.path}`}>
                        <td className="px-4 py-3" dir="ltr">
                          <span className="text-xs font-extrabold text-slate-900">
                            {route.method} {route.path}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          {formatNumber(route.count)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          {route.avgMs} م.ث
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-500">
                          {route.maxMs} م.ث
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
                        لا توجد طلبات مسجّلة بعد في هذه النافذة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Modal
        open={settingsDialog}
        onClose={() => setSettingsDialog(false)}
        title="تأكيد حفظ إعدادات النظام"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setSettingsDialog(false)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!settingsReasonReady || saveMutation.isPending}
              onClick={confirmSettings}
            >
              {saveMutation.isPending ? <Spinner className="size-4" /> : <Save className="size-4" />}
              حفظ الإعدادات
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            سيتم تطبيق:{' '}
            <strong className="text-slate-900">
              {maintenance ? 'تفعيل وضع الصيانة' : 'إيقاف وضع الصيانة'}
            </strong>
            {' · '}
            {registrationOpen ? 'التسجيل مفتوح' : 'التسجيل مغلق'}
            {' · '}
            {blockedTerms.trim() ? 'تحديث الكلمات المحظورة' : 'بدون كلمات إضافية'}.
          </p>
          {maintenance ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-6 text-rose-700">
              تفعيل الصيانة يمنع كل المستخدمين غير الإداريين من دخول المنصة فوراً.
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(restoreFile)}
        onClose={() => setRestoreFile(null)}
        title="تأكيد استعادة النسخة الاحتياطية"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setRestoreFile(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!restoreFile || !restoreReasonReady || restoreMutation.isPending}
              onClick={() => {
                if (restoreFile) {
                  restoreMutation.mutate({ file: restoreFile!, reason: restoreReason.trim() });
                }
              }}
            >
              {restoreMutation.isPending ? <Spinner className="size-4" /> : <UploadCloud className="size-4" />}
              تأكيد الاستعادة
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-6 text-amber-800">
            سيتم استبدال بيانات الجداول الحالية ببيانات الملف:{' '}
            <strong dir="ltr">{restoreFile?.name}</strong> (
            {restoreFile ? `${Math.max(1, Math.round(restoreFile.size / 1024))} ك.ب` : ''}). العملية
            لا يمكن التراجع عنها.
          </p>
        </div>
      </Modal>

      <Modal
        open={resetDialog}
        onClose={() => setResetDialog(false)}
        title="مسح البيانات التشغيلية نهائياً"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setResetDialog(false)}>
              تراجع
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!resetReady || resetMutation.isPending}
              onClick={() => resetMutation.mutate({ reason: resetReason.trim() })}
            >
              {resetMutation.isPending ? <Spinner className="size-4" /> : <RotateCcw className="size-4" />}
              تنفيذ المسح النهائي
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-rose-700">
            سيتم حذف كل بيانات المنصة والحسابات غير الإدارية والملفات المرفوعة نهائياً. ستبقى حسابات
            ستبقى حسابات الأدمن فقط. لا يمكن التراجع عن هذه العملية.
          </p>
          <label className="label">
            اكتب <code dir="ltr">{RESET_CODE}</code> للتأكيد
            <input
              dir="ltr"
              value={resetCode}
              onChange={(event) => setResetCode(event.target.value)}
              className="input mt-1.5 font-mono"
              placeholder={RESET_CODE}
              autoComplete="off"
            />
          </label>
          <p className="text-[11px] font-semibold text-slate-500">
            تُحفظ حسابات الأدمن. يسجل النظام حدث تنفيذ المسح الجديد في سجل التدقيق.
          </p>
        </div>
      </Modal>

    </section>
  );
};
