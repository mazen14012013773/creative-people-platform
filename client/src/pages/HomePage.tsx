import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FeaturedRail } from '@/components/freelancers/FeaturedRail';
import { FeaturedServicesRail } from '@/components/services/FeaturedServicesRail';
import { FreelancerCard, FreelancerCardSkeleton } from '@/components/freelancers/FreelancerCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EGYPT_GOVERNORATES, SORT_OPTIONS, type FreelancerSort } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import { freelancersApi } from '@/services/freelancers.service';
import type { Pagination as PaginationType } from '@/types';

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: 'ابحث وفلتر',
    description: 'اختر التخصص أو المهارة أو المحافظة المناسبة لمشروعك.',
  },
  {
    icon: UserCheck,
    title: 'راجع البروفايل',
    description: 'اطّلع على معرض الأعمال والتقييمات وتفاصيل الخبرة قبل التواصل.',
  },
  {
    icon: MessageCircle,
    title: 'تواصل مباشرة',
    description: 'استعرض الخدمات وابدأ محادثة آمنة داخل المنصة دون مشاركة بيانات اتصال شخصية.',
  },
];

const QUICK_SKILL_ACCENTS = [
  'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
  'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100',
  'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  'border-lime-200 bg-lime-50 text-lime-700 hover:bg-lime-100',
];
const STEP_ACCENTS = [
  { border: 'hover:border-sky-200', bar: 'from-sky-500 to-cyan-300', icon: 'bg-sky-100 text-sky-700' },
  { border: 'hover:border-violet-200', bar: 'from-violet-500 to-fuchsia-300', icon: 'bg-violet-100 text-violet-700' },
  { border: 'hover:border-emerald-200', bar: 'from-emerald-500 to-lime-300', icon: 'bg-emerald-100 text-emerald-700' },
];

export const HomePage = () => {
  useDocumentTitle('اعثر على مستقل موثوق');

  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const debouncedQ = useDebounce(q, 400);
  const [skill, setSkill] = useState(() => searchParams.get('skill') ?? '');
  const [location, setLocation] = useState(() => searchParams.get('location') ?? '');
  const [sort, setSort] = useState<FreelancerSort>(() => {
    const sortParam = searchParams.get('sort');
    return SORT_OPTIONS.some((option) => option.value === sortParam)
      ? (sortParam as FreelancerSort)
      : 'featured';
  });
  const [featuredOnly, setFeaturedOnly] = useState(
    () => searchParams.get('featured') === '1' || searchParams.get('featured') === 'true',
  );
  const [availableOnly, setAvailableOnly] = useState(
    () => searchParams.get('available') === '1' || searchParams.get('available') === 'true',
  );
  const [verifiedOnly, setVerifiedOnly] = useState(
    () => searchParams.get('verified') === '1' || searchParams.get('verified') === 'true',
  );
  const [minRating, setMinRating] = useState(() => searchParams.get('minRating') ?? '');
  const [maxResponseHours, setMaxResponseHours] = useState(
    () => searchParams.get('maxResponseHours') ?? '',
  );
  const [page, setPage] = useState(() => {
    const parsed = Number(searchParams.get('page'));

    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });
  const [, setSearchParams] = useSearchParams();
  const routerLocation = useLocation();

  useEffect(() => {
    const query = searchParams.get('q') ?? '';
    setQ((current) => current === query ? current : query);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, skill, location, sort, featuredOnly, availableOnly, verifiedOnly, minRating, maxResponseHours]);

  useEffect(() => {
    const next = new URLSearchParams();

    if (debouncedQ.trim()) next.set('q', debouncedQ.trim());
    if (skill) next.set('skill', skill);
    if (location) next.set('location', location);
    if (sort !== 'featured') next.set('sort', sort);
    if (featuredOnly) next.set('featured', '1');
    if (availableOnly) next.set('available', '1');
    if (verifiedOnly) next.set('verified', '1');
    if (minRating) next.set('minRating', minRating);
    if (maxResponseHours) next.set('maxResponseHours', maxResponseHours);
    if (page > 1) next.set('page', String(page));

    setSearchParams(next, { replace: true });
  }, [
    debouncedQ,
    skill,
    location,
    sort,
    featuredOnly,
    availableOnly,
    verifiedOnly,
    minRating,
    maxResponseHours,
    page,
    setSearchParams,
  ]);

  useEffect(() => {
    if (routerLocation.hash === '#freelancers') {
      const section = document.getElementById('freelancers');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [routerLocation.hash]);

  const ratingValue = minRating.trim() === '' ? undefined : Number(minRating);
  const validRating =
    ratingValue !== undefined && Number.isFinite(ratingValue) ? ratingValue : undefined;

  const responseValue =
    maxResponseHours.trim() === '' ? undefined : Number(maxResponseHours);
  const validResponse =
    responseValue !== undefined && Number.isInteger(responseValue)
      ? responseValue
      : undefined;

  const params = {
    q: debouncedQ.trim() || undefined,
    skill: skill || undefined,
    location: location || undefined,
    featured: featuredOnly || undefined,
    available: availableOnly || undefined,
    verified: verifiedOnly || undefined,
    minRating: validRating,
    maxResponseHours: validResponse,
    sort,
    page,
    limit: 9,
  };

  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: () => freelancersApi.skills(),
    staleTime: 10 * 60 * 1000,
  });

  const freelancersQuery = useQuery({
    queryKey: ['freelancers', params],
    queryFn: () => freelancersApi.list(params),
    placeholderData: keepPreviousData,
  });

  const data = freelancersQuery.data;
  const pagination: PaginationType = data?.pagination ?? {
    page,
    limit: 9,
    total: 0,
    totalPages: 1,
  };

  const resetFilters = () => {
    setQ('');
    setSkill('');
    setLocation('');
    setSort('featured');
    setFeaturedOnly(false);
    setAvailableOnly(false);
    setVerifiedOnly(false);
    setMinRating('');
    setMaxResponseHours('');
    setPage(1);
  };

  const scrollToResults = () => {
    document.getElementById('freelancers')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasActiveFilters =
    Boolean(q.trim()) ||
    Boolean(skill) ||
    Boolean(location) ||
    Boolean(minRating) ||
    Boolean(maxResponseHours) ||
    featuredOnly ||
    availableOnly ||
    verifiedOnly ||
    sort !== 'featured';

  const quickSkills = skillsQuery.data?.slice(0, 6) ?? [];
  const showcase = data?.items[0];
  const showcaseSkills = showcase?.skills.slice(0, 3) ?? [];
  const showcaseRating = showcase?.avgRating ? showcase.avgRating.toFixed(1) : null;
  const showcaseLink = showcase
    ? `/freelancers/${showcase.id}`
    : '/#freelancers';

  return (
    <div>
      <section className="relative overflow-hidden bg-linear-to-br from-cyan-50/70 via-sky-50/40 to-transparent text-slate-900">
        <div className="pointer-events-none absolute -inset-e-32 -top-40 size-136 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 inset-s-1/3 size-120 rounded-full bg-violet-100/60 blur-3xl" />
        <div className="pointer-events-none absolute inset-s-[42%] top-12 size-24 animate-float rounded-full border border-sky-200/70 bg-white/40 backdrop-blur-sm" />

        <div className="container-page relative py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
            <div className="max-w-2xl animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-[11px] font-extrabold text-sky-800 shadow-sm backdrop-blur">
                <span className="flex size-5 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <Sparkles className="size-3" />
                </span>
                منصة عربية مجانية — تواصل مباشر بدون وسيط مالي
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.22] tracking-tight sm:text-5xl lg:text-[3.55rem]">
                اعثر على{' '}
                <span className="bg-linear-to-l from-sky-600 via-cyan-500 to-orange-500 bg-clip-text text-transparent">
                  المستقل المناسب
                </span>
                <br />
                وتواصل معه مباشرة.
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-8 text-slate-600 sm:text-base">
                مبدعين تجمع أصحاب المهارات بالعملاء في مكان واحد. تصفح الأعمال
                والتقييمات، احفظ المفضلين، وابدأ محادثة داخلية آمنة بضغطة
                واحدة.
              </p>

              <div className="mt-7 max-w-2xl">
                <div className="flex flex-col gap-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/50 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute inset-s-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={q}
                      onChange={(event) => setQ(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          scrollToResults();
                        }
                      }}
                      placeholder="ابحث باسم المستقل، التخصص، أو المهارة..."
                      className="h-12 w-full rounded-xl border-0 bg-transparent ps-12 pe-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      aria-label="البحث عن مستقل"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={scrollToResults}
                    className="btn btn-primary h-12 px-7"
                  >
                    <Search className="size-4" />
                    ابحث الآن
                  </button>
                </div>

                {quickSkills.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      الأكثر بحثاً:
                    </span>
                    {quickSkills.map((quickSkill, index) => (
                      <button
                        key={quickSkill.id}
                        type="button"
                        onClick={() => {
                          setSkill(quickSkill.id);
                          scrollToResults();
                        }}
                        className={
                          skill === quickSkill.id
                            ? 'rounded-full border border-sky-200 bg-sky-100 px-3 py-1.5 text-[11px] font-bold text-sky-800'
                            : `rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${QUICK_SKILL_ACCENTS[index % QUICK_SKILL_ACCENTS.length]}`
                        }
                      >
                        {quickSkill.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-2 gap-x-5 gap-y-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
                {[
                  { value: '0%', label: 'عمولة' },
                  { value: '100%', label: 'مجاني' },
                  { value: 'آمن', label: 'محادثات داخلية' },
                  { value: 'موثّق', label: 'معرض أعمال' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-107.5 animate-fade-up [animation-delay:120ms] lg:mx-0">
              <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-linear-to-br from-cyan-200/50 via-transparent to-orange-100/70 blur-3xl" />

              <div className="absolute -inset-s-4 top-16 z-20 hidden animate-float items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-800 shadow-xl sm:flex">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                </span>
                متاح للعمل الآن
              </div>

              <div className="relative overflow-hidden rounded-4xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-200/60">
                <div className="relative h-32 overflow-hidden rounded-3xl bg-linear-to-br from-cyan-100 via-sky-50 to-orange-50">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.35),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,.15),transparent_30%)]" />
                  <div className="absolute -inset-e-10 -top-12 size-32 rounded-full border border-white/80 bg-white/40" />
                  <div className="absolute bottom-3 inset-s-3 flex items-center gap-1.5 rounded-full border border-white bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-sky-800 shadow-sm backdrop-blur">
                    <BadgeCheck className="size-3.5" />
                    {showcase?.isFeatured ? 'بروفايل مميز' : 'أحدث بروفايل'}
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <div className="-mt-10 flex items-end justify-between">
                    <span className="rounded-[1.35rem] border-4 border-white bg-white p-0.5 shadow-xl">
                      <Avatar
                        name={showcase?.name ?? 'مستقل مميز'}
                        src={showcase?.avatarUrl ?? null}
                        className="size-[4.6rem] rounded-[1.05rem]"
                        textClassName="text-xl"
                      />
                    </span>
                    <span
                      className={
                        showcase?.isAvailable === false
                          ? 'mb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700'
                          : 'mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700'
                      }
                    >
                      <span
                        className={
                          showcase?.isAvailable === false
                            ? 'size-1.5 rounded-full bg-amber-300'
                            : 'size-1.5 rounded-full bg-emerald-300'
                        }
                      />
                      {showcase?.isAvailable === false
                        ? 'غير متاح حاليًا'
                        : 'متاح للعمل'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-base font-extrabold text-slate-900">
                          {showcase?.name ?? 'مستقل مميز'}
                        </h2>
                        <BadgeCheck className="size-4 shrink-0 text-sky-500" />
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {showcase?.title ?? 'خبرات متنوعة جاهزة لمشروعك'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-amber-700">
                      <Star className="size-3.5 fill-current" />
                      {showcaseRating ?? 'جديد'}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(showcaseSkills.length > 0
                      ? showcaseSkills
                      : [
                          { id: 'design', name: 'تصميم' },
                          { id: 'development', name: 'برمجة' },
                          { id: 'content', name: 'محتوى' },
                        ]
                    ).map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-bold text-slate-500">التقييمات</p>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">
                        {showcase ? `${showcase.reviewCount} تقييم` : 'جديد'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-bold text-slate-500">الموقع</p>
                      <p className="mt-1 truncate text-sm font-extrabold text-slate-900">
                        {showcase?.location ?? 'مصر'}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={showcaseLink}
                    className="btn theme-keep-light mt-4 w-full bg-white text-brand-900 hover:bg-brand-50"
                  >
                    عرض البروفايل الكامل
                    <ArrowLeft className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturedRail />
      <FeaturedServicesRail />

      <section id="freelancers" className="scroll-mt-24 py-12 sm:py-16">
        <div className="container-page">
          <SectionHeading
            eyebrow="مبدعو مبدعين"
            title="ابحث عن المهارة التي تحتاجها"
            description="استخدم الفلاتر لتضييق النتائج حسب التخصص والمحافظة، ثم تواصل مباشرة مع المستقل."
            action={
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                {freelancersQuery.isFetching ? (
                  <Spinner className="size-4" />
                ) : (
                  <Sparkles className="size-4 text-amber-500" />
                )}
                {data ? `${formatNumber(data.pagination.total)} مستقل متاح` : 'جارٍ التحميل'}
              </div>
            }
          />

          <div className="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-4 shadow-card backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <SlidersHorizontal className="size-4" />
                </span>
                فلاتر البحث
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 transition hover:text-rose-800"
                >
                  <X className="size-3.5" />
                  مسح الفلاتر
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div>
                <label htmlFor="filter-skill" className="label">
                  التخصص / المهارة
                </label>
                <select
                  id="filter-skill"
                  className="input"
                  value={skill}
                  onChange={(event) => setSkill(event.target.value)}
                >
                  <option value="">كل المهارات</option>
                  {skillsQuery.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-location" className="label">
                  المحافظة
                </label>
                <select
                  id="filter-location"
                  className="input"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="">كل المحافظات</option>
                  {EGYPT_GOVERNORATES.map((governorate) => (
                    <option key={governorate} value={governorate}>
                      {governorate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-sort" className="label">
                  ترتيب النتائج
                </label>
                <select
                  id="filter-sort"
                  className="input"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as FreelancerSort)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex h-10.5 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50">
                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={(event) => setFeaturedOnly(event.target.checked)}
                    className="size-4 accent-amber-500"
                  />
                  <Sparkles className="size-4 text-amber-500" />
                  المميزون
                </label>
              </div>

              <div className="flex items-end">
                <label className="flex h-10.5 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) => setAvailableOnly(event.target.checked)}
                    className="size-4 accent-emerald-600"
                  />
                  <BadgeCheck className="size-4 text-emerald-600" />
                  المتاحون
                </label>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-3 text-[11px] font-extrabold tracking-wide text-slate-400">
                فلاتر متقدمة
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="flex items-end">
                  <label className="flex h-10.5 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(event) => setVerifiedOnly(event.target.checked)}
                      className="size-4 accent-sky-600"
                    />
                    <ShieldCheck className="size-4 text-sky-600" />
                    الموثّقون فقط
                  </label>
                </div>

                <div>
                  <label htmlFor="filter-rating" className="label">
                    الحد الأدنى للتقييم
                  </label>
                  <select
                    id="filter-rating"
                    className="input"
                    value={minRating}
                    onChange={(event) => setMinRating(event.target.value)}
                  >
                    <option value="">بدون شرط</option>
                    <option value="3">3 نجوم فأكثر</option>
                    <option value="4">4 نجوم فأكثر</option>
                    <option value="4.5">4.5 نجوم فأكثر</option>
                    <option value="5">5 نجوم فقط</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-response" className="label">
                    سرعة الرد
                  </label>
                  <select
                    id="filter-response"
                    className="input"
                    value={maxResponseHours}
                    onChange={(event) => setMaxResponseHours(event.target.value)}
                  >
                    <option value="">بدون شرط</option>
                    <option value="1">خلال ساعة</option>
                    <option value="6">خلال 6 ساعات</option>
                    <option value="24">خلال يوم</option>
                    <option value="72">خلال 3 أيام</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            {freelancersQuery.isError ? (
              <ErrorState
                message="تعذر تحميل قائمة المستقلين. تأكد من اتصال الخادم وحاول مرة أخرى."
                onRetry={() => void freelancersQuery.refetch()}
              />
            ) : freelancersQuery.isPending ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <FreelancerCardSkeleton key={index} />
                ))}
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((freelancer) => (
                    <FreelancerCard key={freelancer.id} freelancer={freelancer} />
                  ))}
                </div>
                <div className="mt-8">
                  <Pagination pagination={pagination} onPageChange={setPage} />
                </div>
              </>
            ) : (
              <EmptyState
                icon={MapPin}
                title="لا توجد نتائج مطابقة"
                description="جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر. يمكنك أيضاً تصفح كل المستقلين."
                action={
                  <button type="button" onClick={resetFilters} className="btn btn-primary">
                    عرض كل المستقلين
                  </button>
                }
              />
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/60 py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="كيف تعمل المنصة"
            title="ثلاث خطوات فقط للبدء"
            description="صممت المنصة لتكون أسرع طريق للوصول إلى المستقل المناسب دون تعقيدات."
          />
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <div
                key={step.title}
                className={`group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition duration-300 hover:-translate-y-1 hover:shadow-slate-300/50 ${STEP_ACCENTS[index % STEP_ACCENTS.length].border}`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-l ${STEP_ACCENTS[index % STEP_ACCENTS.length].bar}`} />
                <span className="absolute -inset-e-1 top-3 text-[5rem] font-extrabold leading-none text-slate-100 transition group-hover:text-brand-50">
                  {index + 1}
                </span>
                <span className={`relative flex size-12 items-center justify-center rounded-2xl ${STEP_ACCENTS[index % STEP_ACCENTS.length].icon}`}>
                  <step.icon className="size-6" />
                </span>
                <h3 className="relative mt-5 text-lg font-extrabold text-slate-950">
                  {step.title}
                </h3>
                <p className="relative mt-2 text-sm leading-7 text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-4xl border border-sky-100 bg-linear-to-br from-cyan-50 via-white to-violet-50 p-7 text-slate-900 shadow-xl shadow-slate-200/40 sm:p-9">
              <div className="pointer-events-none absolute -inset-e-14 -top-16 size-56 rounded-full bg-sky-200/50 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 inset-s-0 size-56 rounded-full bg-violet-100/70 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-sky-800 backdrop-blur">
                  <BadgeCheck className="size-4 text-orange-500" />
                  للمستقلين
                </span>
                <h2 className="mt-5 max-w-md text-2xl font-extrabold leading-snug text-slate-900 sm:text-[1.7rem]">
                  مهارتك تستحق أن يراها العملاء.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
                  أنشئ بروفايل مجاني، أضف معرض أعمالك، وضع رقم واتسابك. العملاء
                  سيتواصلون معك مباشرة دون أي وساطة.
                </p>
                <Link
                  to="/register?type=freelancer"
                  className="btn btn-secondary mt-6"
                >
                  أنشئ بروفايلك الآن
                  <ArrowLeft className="size-4" />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-4xl border border-orange-100 bg-linear-to-br from-orange-50 via-white to-rose-50 p-7 shadow-xl shadow-orange-100/60 sm:p-9">
              <div className="pointer-events-none absolute -inset-e-12 -top-16 size-56 rounded-full bg-amber-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 inset-s-0 size-56 rounded-full bg-rose-200/40 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-amber-800 backdrop-blur">
                  <Sparkles className="size-4 text-amber-500" />
                  لأصحاب المشاريع
                </span>
                <h2 className="mt-5 max-w-md text-2xl font-extrabold leading-snug text-slate-950 sm:text-[1.7rem]">
                  ابحث بذكاء، واختر المستقل المناسب.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
                  أنشئ حساب مشتري مجاني، احفظ المستقلين في المفضلة، وقارن الأعمال
                  والتقييمات قبل بدء مشروعك.
                </p>
                <Link
                  to="/register?type=buyer"
                  className="btn btn-primary mt-6"
                >
                  أنشئ حساب مشتري
                  <ArrowLeft className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

