import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Compass,
  Heart,
  History,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FavoriteProfileCard } from '@/components/freelancers/FavoriteProfileCard';
import { BuyerProfileSettings } from '@/components/dashboard/BuyerProfileSettings';
import { CommunityDashboardPanel } from '@/components/dashboard/CommunityDashboardPanel';
import {
  FreelancerCard,
  FreelancerCardSkeleton,
} from '@/components/freelancers/FreelancerCard';
import { RecentProfileCard } from '@/components/freelancers/RecentProfileCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { formatDate, formatNumber } from '@/lib/utils';
import { freelancersApi } from '@/services/freelancers.service';

const TIPS = [
  {
    title: 'اكتب متطلباتك بوضوح',
    description: 'حدد نطاق العمل وموعد التسليم قبل التواصل مع المستقل.',
  },
  {
    title: 'راجع معرض الأعمال',
    description: 'اطلع على نماذج سابقة والتقييمات، ثم اسأل عن مشروع مشابه لمشروعك.',
  },
  {
    title: 'احفظ وقارن قبل القرار',
    description: 'احفظ أكثر من مرشح في المفضلة، وقارن الخبرة والتقييمات بهدوء.',
  },
  {
    title: 'اتفق مباشرة',
    description: 'ناقش تفاصيل العمل والمراحل قبل البدء.',
  },
];

const TONES = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

const QUICK_ACTIONS = [
  { title: 'استكشف الدليل', description: 'تصفح المستقلين وفلتر حسب مهارتك.', to: '/#freelancers', icon: Compass, tone: 'brand' },
  { title: 'متاحون الآن', description: 'أشخاص جاهزون لبدء مشروعك فوراً.', to: '/?available=1#freelancers', icon: BadgeCheck, tone: 'emerald' },
  { title: 'الأعلى تقييماً', description: 'ابدأ بمن حصلوا على أفضل تقييمات العملاء.', to: '/?sort=rating#freelancers', icon: Star, tone: 'amber' },
  { title: 'المميزون', description: 'بروفايلات مختارة تستحق نظرة سريعة.', to: '/?featured=1#freelancers', icon: Sparkles, tone: 'violet' },
  { title: 'أحدث الإضافات', description: 'اكتشف المواهب التي انضمت مؤخراً.', to: '/?sort=newest#freelancers', icon: Clock3, tone: 'rose' },
  { title: 'قائمة المفضلة', description: 'ارجع سريعاً إلى المستقلين المحفوظين.', to: '/favorites', icon: Heart, tone: 'rose' },
  { title: 'شروط الاستخدام', description: 'اقرأ قواعد التواصل والاستخدام بأمان.', to: '/terms', icon: ShieldCheck, tone: 'slate' },
] as const;

const SUGGESTION_TABS = [
  { value: 'available', label: 'متاحون الآن', icon: BadgeCheck },
  { value: 'top', label: 'الأعلى تقييمًا', icon: Star },
  { value: 'newest', label: 'أحدث الإضافات', icon: Clock3 },
] as const;

type SuggestionMode = (typeof SUGGESTION_TABS)[number]['value'];

const getSuggestionSort = (mode: SuggestionMode) => {
  if (mode === 'top') {
    return 'rating';
  }

  if (mode === 'newest') {
    return 'newest';
  }

  return 'featured';
};

export const BuyerDashboardPage = () => {
  useDocumentTitle('لوحة المشتري');

  const { user } = useAuth();
  const { favoriteIds, favoriteCount } = useFavorites();
  const { recentProfiles, recentCount, clearRecentlyViewed } = useRecentlyViewed();
  const [suggestionMode, setSuggestionMode] =
    useState<SuggestionMode>('available');

  const suggestionsQuery = useQuery({
    queryKey: ['buyer-suggestions', suggestionMode],
    queryFn: () =>
      freelancersApi.list({
        available: suggestionMode === 'available' ? true : undefined,
        sort: getSuggestionSort(suggestionMode),
        page: 1,
        limit: 3,
      }),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  if (!user) {
    return null;
  }

  const firstName = user.name.trim().split(/\s+/)[0];
  const suggestions = suggestionsQuery.data?.items ?? [];

  return (
    <div className="container-page py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-4xl border border-slate-100 bg-linear-to-br from-cyan-50 via-white to-sky-50 p-6 text-slate-900 shadow-xl shadow-slate-200/40 sm:p-9">
        <div className="pointer-events-none absolute -inset-e-16 -top-20 size-64 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 inset-s-1/3 size-64 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1.5 text-xs font-extrabold text-sky-800 backdrop-blur">
              <UserRound className="size-4" />
              حساب مشتري
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">
              أهلاً {firstName}،
              <br />
              <span className="text-sky-700">ابحث عن المهارة المناسبة بثقة.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
              لديك {formatNumber(favoriteCount)} مستقل محفوظ في المفضلة، و
              {formatNumber(recentCount)} بروفايل في سجل المشاهدة. استخدم
              الاختصارات السريعة، قارن الأعمال والتقييمات، وتواصل مباشرة مع
              المستقل الذي يناسب مشروعك.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/#freelancers"
                className="btn btn-primary"
              >
                <Compass className="size-4" />
                استكشف المستقلين
              </Link>
              <Link
                to="/favorites"
                className="btn btn-secondary"
              >
                <Heart className="size-4" />
                المفضلة
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'مستقلون محفوظون',
                value: formatNumber(favoriteCount),
                icon: Heart,
              },
              {
                label: 'آخر مشاهدة',
                value: formatNumber(recentCount),
                icon: History,
              },
              {
                label: 'نوع الحساب',
                value: 'مشتري',
                icon: UserRound,
              },
              {
                label: 'عضو منذ',
                value: formatDate(user.createdAt),
                icon: CalendarDays,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-100 bg-white/85 p-4 shadow-sm"
              >
                <stat.icon className="size-5 text-sky-600" />
                <p className="mt-3 text-lg font-extrabold leading-tight text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BuyerProfileSettings />

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              اختصارات المشتري
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              ابدأ من الطريق الذي يناسبك بدل البحث من الصفر.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-extrabold text-brand-700 dark:border-brand-400/20 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="size-3.5" />
            8 أدوات سريعة
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="card group flex items-start gap-3 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${TONES[action.tone]}`}
              >
                <action.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-slate-950">
                    {action.title}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
                </span>
                <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-500">
                  {action.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8"><CommunityDashboardPanel /></section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">
                    مقترح لك
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    اختر طريقة العرض التي تهمك، ثم افتح البروفايل أو تواصل مباشرة.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                  {SUGGESTION_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setSuggestionMode(tab.value)}
                      className={
                        suggestionMode === tab.value
                          ? 'inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-extrabold text-brand-800 shadow-sm'
                          : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-500 transition hover:text-slate-800'
                      }
                    >
                      <tab.icon className="size-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5">
              {suggestionsQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300">
                  تعذر تحميل الاقتراحات الآن.
                  <button
                    type="button"
                    onClick={() => void suggestionsQuery.refetch()}
                    className="ms-2 font-extrabold underline"
                  >
                    حاول مرة أخرى
                  </button>
                </div>
              ) : suggestionsQuery.isPending ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <FreelancerCardSkeleton key={index} />
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {suggestions.map((freelancer) => (
                    <FreelancerCard key={freelancer.id} freelancer={freelancer} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm font-bold text-slate-600">
                    لا توجد نتائج في هذا التصنيف حاليًا.
                  </p>
                  <Link
                    to="/#freelancers"
                    className="mt-2 inline-flex text-xs font-extrabold text-brand-700 hover:text-brand-900"
                  >
                    تصفح كل المستقلين
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">
                  المستقلون المفضلون
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  قائمة سريعة بالأشخاص الذين تريد الرجوع إليهم.
                </p>
              </div>
              {favoriteCount > 0 ? (
                <Link
                  to="/favorites"
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-700 hover:text-brand-900"
                >
                  عرض الكل
                  <ArrowLeft className="size-4" />
                </Link>
              ) : null}
            </div>

            <div className="mt-5">
              {favoriteCount === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="لم تحفظ أي مستقل بعد"
                  description="ابدأ بتصفح الدليل، واضغط على أيقونة القلب في أي بروفايل لحفظه هنا."
                  action={
                    <Link to="/#freelancers" className="btn btn-primary">
                      <Compass className="size-4" />
                      ابدأ الاستكشاف
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {favoriteIds.slice(0, 4).map((id) => (
                    <FavoriteProfileCard key={id} freelancerId={id} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {recentCount > 0 ? (
            <section id="recently-viewed" className="mt-8 scroll-mt-24">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">
                    آخر ما شاهدته
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    ارجع سريعًا إلى البروفايلات التي فتحتها مؤخرًا.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearRecentlyViewed}
                  className="text-xs font-extrabold text-slate-400 transition hover:text-rose-600"
                >
                  مسح السجل
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recentProfiles.slice(0, 4).map((profile) => (
                  <RecentProfileCard
                    key={profile.id}
                    freelancerId={profile.id}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <UserRound className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-950">
                  بيانات الحساب
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  معلوماتك المسجلة
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-bold text-slate-400">الاسم</dt>
                  <dd className="truncate font-extrabold text-slate-800">
                    {user.name}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-bold text-slate-400">
                    البريد الإلكتروني
                  </dt>
                  <dd
                    dir="ltr"
                    className="truncate text-start font-semibold text-slate-700"
                  >
                    {user.email}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div id="buyer-tips" className="card scroll-mt-24 overflow-hidden">
            <div className="bg-linear-to-br from-amber-50 to-brand-50 p-5 dark:from-amber-950/30 dark:to-brand-950/40">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                <Sparkles className="size-5" />
              </span>
              <h2 className="mt-3 text-sm font-extrabold text-slate-950">
                نصائح لاختيار أفضل مستقل
              </h2>
            </div>
            <div className="divide-y divide-slate-100 px-5">
              {TIPS.map((tip) => (
                <div key={tip.title} className="py-4">
                  <h3 className="text-xs font-extrabold text-slate-800">
                    {tip.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold leading-6 text-slate-500">
                    {tip.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
