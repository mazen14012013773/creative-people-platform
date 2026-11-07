import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  Eye,
  FileDown,
  FileText,
  Gift,
  Images,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  PackagePlus,
  Share2,
  Sparkles,
  Star,
  UserCog,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShareProfileModal } from '@/components/freelancers/ShareProfileModal';
import { CommunityDashboardPanel } from '@/components/dashboard/CommunityDashboardPanel';
import { ParentSafetyPanel } from '@/components/dashboard/ParentSafetyPanel';
import { ResumeExportModal } from '@/components/dashboard/ResumeExportModal';
import { StatCard } from '@/components/dashboard/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatNumber } from '@/lib/utils';
import { getFreelancerCompletionChecklist } from '@/lib/profile-completion';
import { getFreelancerLevel } from '@/lib/freelancer-level';
import { freelancersApi } from '@/services/freelancers.service';
import { portfolioApi } from '@/services/portfolio.service';
import { profileApi } from '@/services/profile.service';
import { servicesApi } from '@/services/services.service';

const FreelancerProfileForm = lazy(() => import('@/components/dashboard/FreelancerProfileForm').then((module) => ({ default: module.FreelancerProfileForm })));
const PortfolioManager = lazy(() => import('@/components/dashboard/PortfolioManager').then((module) => ({ default: module.PortfolioManager })));
const ServicesManager = lazy(() => import('@/components/dashboard/ServicesManager').then((module) => ({ default: module.ServicesManager })));

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'profile', label: 'الملف الشخصي', icon: UserCog },
  { id: 'portfolio', label: 'معرض الأعمال', icon: Images },
  { id: 'services', label: 'خدماتي', icon: PackagePlus },
  { id: 'community', label: 'منشوراتي', icon: FileText },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const FreelancerDashboardPage = () => {
  useDocumentTitle('لوحة تحكم المستقل');

  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('overview');
  const [shareOpen, setShareOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileApi.getMine(),
  });

  const portfolioQuery = useQuery({
    queryKey: ['my-portfolio'],
    queryFn: () => portfolioApi.listMine(),
  });

  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: () => freelancersApi.skills(),
    staleTime: 10 * 60 * 1000,
  });

  const servicesQuery = useQuery({
    queryKey: ['my-services'],
    queryFn: servicesApi.listMine,
  });

  const resumeQuery = useQuery({
    queryKey: ['freelancer', profileQuery.data?.user.id ?? ''],
    queryFn: async () => {
      const profileData = profileQuery.data;
      if (!profileData) {
        throw new Error('الملف الشخصي غير متاح بعد');
      }
      return freelancersApi.detail(profileData.user.id);
    },
    enabled: resumeOpen && Boolean(profileQuery.data),
    staleTime: 20_000,
  });

  const handleProfileChanged = async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    await refreshUser().catch(() => undefined);
  };

  if (profileQuery.isPending || portfolioQuery.isPending || skillsQuery.isPending || servicesQuery.isPending) {
    return <PageLoader label="جارٍ تحميل لوحة التحكم..." />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="container-page py-16">
        <ErrorState
          message="تعذر تحميل بيانات البروفايل. تأكد من تشغيل الخادم ثم حاول مرة أخرى."
          onRetry={() => void profileQuery.refetch()}
        />
      </div>
    );
  }

  if (portfolioQuery.isError || skillsQuery.isError) {
    return (
      <div className="container-page py-16">
        <ErrorState
          message="تعذر تحميل بعض بيانات لوحة التحكم."
          onRetry={() => {
            void portfolioQuery.refetch();
            void skillsQuery.refetch();
          }}
        />
      </div>
    );
  }

  const { user, skills, stats } = profileQuery.data;
  const portfolio = portfolioQuery.data;
  const allSkills = skillsQuery.data;

  const checklist = getFreelancerCompletionChecklist(
    user,
    skills.length,
    portfolio.length,
    servicesQuery.data?.length ?? 0,
  );

  const completedCount = checklist.filter((item) => item.done).length;
  const completion = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="container-page py-8 sm:py-10">
      <section className="relative overflow-hidden rounded-4xl border border-slate-100 bg-linear-to-br from-cyan-50 via-white to-sky-50 text-slate-900 shadow-xl shadow-slate-200/40">
        <div className="pointer-events-none absolute -inset-e-20 -top-20 size-64 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 inset-s-1/4 size-64 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="w-fit rounded-[1.75rem] border border-white bg-white p-1 shadow-xl shadow-slate-300/50">
                <Avatar
                  name={user.name}
                  src={user.avatarUrl}
                  className="size-[5.5rem] rounded-[1.25rem] text-2xl"
                />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-sky-700">
                  <Sparkles className="size-3.5 text-orange-500" />
                  مرحباً بعودتك
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {user.name}
                  </h1>
                  {user.isFeatured ? (
                    <Badge tone="amber">
                      <Sparkles className="size-3.5" />
                      مميز
                    </Badge>
                  ) : (
                    <Badge tone="brand">
                      <BadgeCheck className="size-3.5" />
                      مستقل
                    </Badge>
                  )}
                  {user.isAvailable ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      متاح للعمل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      غير متاح حاليًا
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                  <span>{user.title || 'أضف مسمىك الوظيفي'}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-sky-500" />
                    {user.location || 'أضف محافظتك'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-800">{getFreelancerLevel(user.level.points).title}</span>
                  <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{formatNumber(user.level.points)} نقطة</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/freelancer/rewards" className="btn btn-primary btn-sm">
                <Gift className="size-4" />
                الهدايا والمكافآت · {formatNumber(user.level.points)} نقطة
              </Link>
              <Link
                to={`/freelancers/${user.id}`}
                className="btn btn-secondary btn-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="size-4" />
                عرض بروفايلي
              </Link>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="btn btn-secondary btn-sm"
              >
                <Share2 className="size-4" />
                مشاركة البروفايل
              </button>
              <button
                type="button"
                onClick={() => setResumeOpen(true)}
                className="btn btn-sm theme-keep-light bg-white text-brand-900 hover:bg-brand-50"
              >
                <FileDown className="size-4" />
                حفظ السيرة الذاتية PDF
              </button>
              <button
                type="button"
                onClick={() => setTab('profile')}
                className="btn btn-sm theme-keep-light bg-white text-brand-900 hover:bg-brand-50"
              >
                <UserCog className="size-4" />
                تعديل البروفايل
              </button>
            </div>
          </div>
        </div>
      </section>

      <ParentSafetyPanel />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Eye}
          label="زيارات البروفايل"
          value={formatNumber(stats.viewCount)}
          hint="إجمالي الزيارات العامة"
          tone="sky"
        />
        <StatCard
          icon={PackagePlus}
          label="الخدمات المصغّرة"
          value={formatNumber(servicesQuery.data?.filter((service) => service.status === 'active').length ?? 0)}
          hint="الخدمات المنشورة على بروفايلك"
          tone="emerald"
        />
        <StatCard
          icon={Star}
          label="متوسط التقييم"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'جديد'}
          hint={`${formatNumber(stats.reviewCount)} تقييم`}
          tone="amber"
        />
        <StatCard
          icon={BriefcaseBusiness}
          label="أعمال المعرض"
          value={formatNumber(portfolio.length)}
          hint="بحد أقصى 24 مشروع"
          tone="brand"
        />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                active
                  ? 'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm'
                  : 'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-800'
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <section className="card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    اكتمال البروفايل
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    البروفايل المكتمل يظهر أفضل في نتائج البحث.
                  </p>
                </div>
                <span className="text-2xl font-extrabold text-brand-700">{completion}%</span>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-linear-to-l from-brand-500 to-brand-700 transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className={
                      item.done
                        ? 'flex items-center gap-2 text-sm font-bold text-slate-700'
                        : 'flex items-center gap-2 text-sm font-bold text-slate-400'
                    }
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-slate-300" />
                    )}
                    {item.label}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setTab('profile')}
                className="btn btn-primary mt-6 w-full"
              >
                <UserCog className="size-4" />
                استكمل بياناتك الآن
              </button>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-extrabold text-slate-900">نصائح سريعة</h2>
              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <MessageCircle className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      استخدم المحادثة الداخلية
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      ستصلك طلبات الخدمات والرسائل داخل المنصة دون مشاركة بياناتك الشخصية.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Images className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      أضف 3 أعمال على الأقل
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      معرض الأعمال هو أقوى إثبات لخبرتك. أضف صوراً حقيقية لمشاريعك.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-brand-900">
                  <BadgeCheck className="size-4" />
                  بروفايلك العام جاهز للمشاركة
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    to={`/freelancers/${user.id}`}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:text-brand-900"
                  >
                    فتح صفحة بروفايلك
                    <ArrowUpLeft className="size-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:text-brand-900"
                  >
                    مشاركة الرابط
                    <Share2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        <Suspense fallback={<PageLoader label="جارٍ تحميل القسم..." />}>
          {tab === 'profile' ? (
            <FreelancerProfileForm
              profile={user}
              allSkills={allSkills}
              profileSkills={skills}
              onChanged={handleProfileChanged}
            />
          ) : null}

          {tab === 'portfolio' ? <PortfolioManager items={portfolio} /> : null}

          {tab === 'services' ? <ServicesManager /> : null}
          {tab === 'community' ? <CommunityDashboardPanel /> : null}

        </Suspense>
      </div>

      <ShareProfileModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        profile={user}
      />

      <ResumeExportModal
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        profile={user}
        skills={skills}
        stats={stats}
        portfolio={portfolio}
        reviews={resumeQuery.data?.reviews ?? []}
        isLoading={resumeQuery.isPending}
      />
    </div>
  );
};
