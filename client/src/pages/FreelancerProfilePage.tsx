import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FavoriteButton } from '@/components/freelancers/FavoriteButton';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { PortfolioModal } from '@/components/portfolio/PortfolioModal';
import { ReportModal } from '@/components/reviews/ReportModal';
import { ReviewList } from '@/components/reviews/ReviewList';
import { Avatar } from '@/components/ui/Avatar';
import { ProtectedImage, ProtectedVideo } from '@/components/common/ProtectedMedia';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { MediaLightbox } from '@/components/ui/MediaLightbox';
import { ExternalMediaCard } from '@/components/ui/ExternalMediaCard';
import { ShareServiceModal } from '@/components/freelancers/ShareServiceModal';
import { OrderConfirmModal } from '@/components/orders/OrderConfirmModal';
import { StarRating } from '@/components/ui/StarRating';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { formatDate, formatNumber, formatPrice } from '@/lib/utils';
import type { ServiceMedia } from '@/types';
import { getErrorMessage } from '@/services/api';
import { freelancersApi } from '@/services/freelancers.service';
import { servicesApi } from '@/services/services.service';
import { ordersApi } from '@/services/orders.service';
import { reportsApi, type ReportCategory } from '@/services/reports.service';
import { useAuth } from '@/context/AuthContext';
import type { PortfolioItem } from '@/types';

export const FreelancerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [expandedServiceIds, setExpandedServiceIds] = useState<Set<string>>(() => new Set());
  const [mediaViewer, setMediaViewer] = useState<{ items: ServiceMedia[]; index: number; title: string } | null>(null);
  const [sharedService, setSharedService] = useState<{ id: string; title: string } | null>(null);
  const [selectedOrderService, setSelectedOrderService] = useState<{ id: string; title: string; description: string; price: number } | null>(null);
  const { recordView } = useRecentlyViewed();

  const profileQuery = useQuery({
    queryKey: ['freelancer', id],
    queryFn: () => freelancersApi.detail(id as string),
    enabled: Boolean(id),
    retry: false,
  });

  const servicesQuery = useQuery({
    queryKey: ['freelancer-services', id],
    queryFn: () => servicesApi.listForFreelancer(id as string),
    enabled: Boolean(id),
  });

  const profile = profileQuery.data;

  const createOrder = useMutation({
    mutationFn: (serviceId: string) => ordersApi.create(serviceId, crypto.randomUUID()),
    onSuccess: async ({ order }) => {
      setSelectedOrderService(null);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إنشاء الطلب.')),
  });

  useEffect(() => {
    if (profile?.freelancer.id) {
      recordView(profile.freelancer.id);
    }
  }, [profile?.freelancer.id, recordView]);

  useEffect(() => {
    const serviceId = searchParams.get('serviceId');
    if (!serviceId || !servicesQuery.data) return;
    const target = document.getElementById(`service-${serviceId}`);
    if (target) window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [searchParams, servicesQuery.data]);

  useDocumentTitle(
    profile ? `${profile.freelancer.name} — ${profile.freelancer.title ?? 'مستقل'}` : 'البروفايل',
  );

  const reportMutation = useMutation({
    mutationFn: ({ category, description, files }: { category: ReportCategory; description: string; files: File[] }) =>
      reportsApi.submit(id as string, category, description, files),
  });

  const submitReport = async (category: ReportCategory, description: string, files: File[]): Promise<boolean> => {
    try {
      await reportMutation.mutateAsync({ category, description, files });
      toast.success('تم إرسال البلاغ للإدارة، شكراً لمساعدتك');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  if (profileQuery.isPending) {
    return <PageLoader label="جارٍ تحميل البروفايل..." />;
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="container-page py-16">
        <ErrorState
          message="المستقل غير موجود أو حسابه غير متاح حالياً."
          onRetry={() => void profileQuery.refetch()}
        />
        <div className="mt-5 text-center">
          <Link to="/" className="btn btn-secondary">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const { freelancer, skills, portfolio, reviews, stats } = profile;
  const isOwnProfile = user?.id === freelancer.id;
  const conversationPath = isOwnProfile ? '/chat' : `/chat?userId=${freelancer.id}`;

  return (
    <div className="pb-24 lg:pb-10">
      <div className="container-page py-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-brand-700"
        >
          <ArrowRight className="size-4" />
          العودة إلى مبدعين
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-4xl border border-slate-100 bg-linear-to-br from-cyan-50 via-white to-sky-50 text-slate-900 shadow-xl shadow-slate-200/40">
          <div className="pointer-events-none absolute -inset-e-20 -top-24 size-72 rounded-full bg-orange-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 inset-s-1/4 size-72 rounded-full bg-sky-100/70 blur-3xl" />

          <div className="relative px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={!freelancer.avatarUrl}
                  onClick={() => freelancer.avatarUrl && setMediaViewer({
                    items: [{ url: freelancer.avatarUrl, type: 'image' }],
                    index: 0,
                    title: freelancer.name,
                  })}
                  aria-label={freelancer.avatarUrl ? `عرض صورة ${freelancer.name} بحجم أكبر` : undefined}
                  title={freelancer.avatarUrl ? 'اضغط لعرض الصورة بحجم أكبر' : undefined}
                  className={`group relative w-fit rounded-[1.9rem] border border-white bg-white p-1 shadow-xl shadow-slate-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${freelancer.avatarUrl ? 'cursor-zoom-in' : 'cursor-default'}`}
                >
                  <Avatar
                    name={freelancer.name}
                    src={freelancer.avatarUrl}
                    className="aspect-square size-24 rounded-[1.4rem] bg-sky-50 sm:size-28"
                    imageFit="contain"
                    textClassName="text-2xl"
                  />
                  {freelancer.avatarUrl ? (
                    <span className="absolute inset-1 flex items-center justify-center rounded-[1.4rem] bg-slate-950/0 text-white opacity-0 transition duration-200 group-hover:bg-slate-950/40 group-hover:opacity-100 group-focus-visible:bg-slate-950/40 group-focus-visible:opacity-100">
                      <span className="flex size-10 items-center justify-center rounded-full border border-white/40 bg-slate-950/40 shadow-lg backdrop-blur-sm">
                        <ZoomIn className="size-5" aria-hidden="true" />
                      </span>
                    </span>
                  ) : null}
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold text-slate-900 sm:text-[2rem]">
                      {freelancer.name}
                    </h1>
                    {freelancer.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-sky-700">
                        <BadgeCheck className="size-3.5" />
                        حساب موثّق
                      </span>
                    ) : null}
                    {freelancer.isFeatured ? (
                      <Badge tone="amber">
                        <Sparkles className="size-3.5" />
                        بروفايل مميز
                      </Badge>
                    ) : null}
                    {stats.sellerBadge ? <Badge tone="amber">🏅 بائع متميز</Badge> : null}
                    {stats.fastDeliveryBadge ? <Badge tone="emerald">⚡ سريع التسليم</Badge> : null}
                    {freelancer.isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        متاح للعمل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        غير متاح للعمل حاليًا
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-base font-bold text-sky-700">
                    {freelancer.title || 'مستقل'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 text-sky-500" />
                      {freelancer.location || 'غير محدد'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5 text-sky-500" />
                      عضو منذ {formatDate(freelancer.createdAt)}
                    </span>
                    {freelancer.avgResponseHours !== null ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                        <Clock className="size-3.5" />
                        يرد خلال{' '}
                        {freelancer.avgResponseHours <= 1
                          ? 'أقل من ساعة'
                          : `${formatNumber(freelancer.avgResponseHours)} ساعة`}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white/90 px-2.5 py-1">
                      <StarRating value={stats.avgRating} count={stats.reviewCount} />
                    </span>
                    <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-extrabold text-violet-800">{freelancer.level.title}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to={conversationPath} className="btn btn-primary">
                  <MessageCircle className="size-4" />
                  المحادثة الداخلية
                </Link>
                <FavoriteButton
                  freelancerId={freelancer.id}
                  freelancerName={freelancer.name}
                  variant="button"
                  className="border-slate-200 bg-white text-slate-600 shadow-sm hover:border-rose-200 hover:bg-rose-50"
                />
              </div>
            </div>
          </div>
        </section>

        <nav aria-label="أقسام بروفايل المستقل" className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
          {[['profile-about', 'نبذة'], ['profile-services', 'الخدمات'], ['profile-portfolio', 'معرض الأعمال'], ['profile-reviews', 'التقييمات وآراء العملاء']].map(([target, label]) => <a key={target} href={`#${target}`} className="shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-brand-50 hover:text-brand-800">{label}</a>)}
        </nav>
        <div className="mt-4 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <section id="profile-about" className="card min-w-0 scroll-mt-28 overflow-hidden p-5 sm:p-6">
              <h2 className="text-lg font-extrabold text-slate-900">نبذة عن المستقل</h2>
              <p className={`mt-3 min-w-0 whitespace-pre-line wrap-anywhere text-sm leading-8 text-slate-600 ${bioExpanded ? '' : 'line-clamp-5'}`}>
                {freelancer.bio ||
                  'لم يضف المستقل نبذة تعريفية بعد. تواصل معه مباشرة لمعرفة المزيد عن خبراته.'}
              </p>
              {(freelancer.bio?.length ?? 0) > 240 ? <button type="button" onClick={() => setBioExpanded((value) => !value)} className="mt-2 text-xs font-extrabold text-brand-700">{bioExpanded ? 'عرض أقل' : 'قراءة المزيد'}</button> : null}

              {skills.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-sm font-extrabold text-slate-800">المهارات والتخصصات</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

            </section>

            <section id="profile-services" className="card min-w-0 scroll-mt-28 overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="text-lg font-extrabold text-slate-900">الخدمات المصغّرة</h2><p className="mt-1 text-xs font-semibold text-slate-500">اختر خدمة وناقش تفاصيلها عبر المحادثة الداخلية.</p></div>
                <BriefcaseBusiness className="size-5 text-brand-600" />
              </div>
              {servicesQuery.isPending ? <p className="mt-4 text-sm text-slate-500">جارٍ تحميل الخدمات...</p> : null}
              {servicesQuery.isError ? <p className="mt-4 text-sm font-semibold text-rose-600">تعذر تحميل الخدمات.</p> : null}
              {!servicesQuery.isPending && !servicesQuery.isError && (servicesQuery.data?.length ?? 0) === 0 ? (
                <div className="mt-4"><EmptyState icon={BriefcaseBusiness} title="لا توجد خدمات منشورة بعد" description="يمكنك بدء محادثة داخلية للاستفسار عن الأعمال المتاحة." compact /></div>
              ) : null}
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                {servicesQuery.data?.map((service) => (
                  <article id={`service-${service.id}`} key={service.id} className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md ${searchParams.get('serviceId') === service.id ? 'border-brand-400 ring-2 ring-brand-200' : 'border-slate-200'}`}>
                    {service.media?.length ? <div className={`grid gap-1.5 bg-slate-100 p-1.5 ${service.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>{service.media.map((item, index) => item.type === 'link' ? <ExternalMediaCard key={`${item.url}-${index}`} url={item.url} className="aspect-video min-w-0 rounded-xl p-2" /> : <button key={`${item.url}-${index}`} type="button" onClick={() => setMediaViewer({ items: service.media, index, title: service.title })} className="group relative aspect-video min-w-0 overflow-hidden rounded-xl bg-slate-200 text-start" aria-label={item.type === 'video' ? `تشغيل فيديو خدمة ${service.title}` : `تكبير صورة خدمة ${service.title}`}>{item.type === 'video' ? <ProtectedVideo containerClassName="size-full" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" src={item.url} preload="metadata" muted playsInline /> : <ProtectedImage containerClassName="size-full" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" src={item.url} alt={`صورة لخدمة ${service.title}`} loading="lazy" />}{item.type === 'video' ? <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15"><span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white"><span className="ms-1 border-y-[7px] border-s-[11px] border-y-transparent border-s-white" /></span></span> : null}<span className="pointer-events-none absolute inset-0 ring-0 transition group-hover:ring-2 group-hover:ring-inset group-hover:ring-teal-300" /></button>)}</div> : <div className="mx-4 mt-4 flex min-h-20 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-xs font-semibold text-slate-400">لم يضف صاحب الخدمة صورًا أو فيديوهات أو روابط خارجية بعد</div>}
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="chip max-w-full text-brand-700">{service.category}</span>{service.isFeatured ? <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-extrabold text-orange-800"><Sparkles className="size-3"/>خدمة مميزة</span> : null}<span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-800">{formatPrice(service.price)}</span></div><button type="button" onClick={() => setSharedService({ id: service.id, title: service.title })} className="btn btn-secondary btn-sm" aria-label={`مشاركة خدمة ${service.title}`} title="رابط وQR للخدمة"><Share2 className="size-4" /><span className="hidden sm:inline">مشاركة</span></button></div>
                      <h3 className="mt-3 min-w-0 wrap-anywhere text-base font-extrabold leading-7 text-slate-900">{service.title}</h3>
                      <div className="mt-2"><StarRating value={service.avgRating} count={service.reviewCount}/></div>
                      <p className={`mt-2 min-w-0 flex-1 whitespace-pre-line wrap-anywhere text-sm leading-6 text-slate-600 ${expandedServiceIds.has(service.id) ? '' : 'line-clamp-4'}`}>{service.description}</p>
                      {service.description.length > 180 ? <button type="button" onClick={() => setExpandedServiceIds((current) => { const next = new Set(current); if (next.has(service.id)) next.delete(service.id); else next.add(service.id); return next; })} className="mt-2 self-start text-xs font-extrabold text-brand-700">{expandedServiceIds.has(service.id) ? 'عرض أقل' : 'قراءة المزيد'}</button> : null}
                      {service.sources?.length ? <div className="mt-4"><p className="mb-2 text-xs font-extrabold text-slate-600">روابط ومراجع الخدمة</p><div className="grid gap-3 sm:grid-cols-2">{service.sources.map((source, index) => <ExternalMediaCard key={`${source.url}-${index}`} url={source.url} title={source.title} />)}</div></div> : null}
                      {user?.role === 'Buyer' && !isOwnProfile ? <button type="button" onClick={() => setSelectedOrderService({ id: service.id, title: service.title, description: service.description, price: service.price })} className="btn btn-primary btn-sm mt-4 w-full"><BriefcaseBusiness className="size-4"/>{'\u0637\u0644\u0628 \u0627\u0644\u062e\u062f\u0645\u0629'}</button> : <Link to={conversationPath} className="btn btn-secondary btn-sm mt-4 w-full"><MessageCircle className="size-4"/>{isOwnProfile ? '\u0641\u062a\u062d \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a' : '\u0645\u062d\u0627\u062f\u062b\u0629 \u0639\u0627\u0645\u0629'}</Link>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="profile-portfolio" className="card scroll-mt-28 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">معرض الأعمال</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {formatNumber(portfolio.length)} مشروع
                  </p>
                </div>
                <BriefcaseBusiness className="size-5 text-brand-600" />
              </div>

              {portfolio.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {portfolio.map((item) => (
                    <PortfolioCard key={item.id} item={item} onOpen={setSelectedItem} />
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    icon={BriefcaseBusiness}
                    title="لا يوجد معرض أعمال بعد"
                    description="اطلب من المستقل مشاركة نماذج من أعماله عند التواصل."
                    compact
                  />
                </div>
              )}
            </section>

            <section id="profile-reviews" className="card scroll-mt-28 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-slate-900">
                  التقييمات والآراء
                </h2>
                <StarRating value={stats.avgRating} count={stats.reviewCount} />
              </div>
              <div className="mt-4">
                <ReviewList reviews={reviews} />
              </div>
              <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 sm:p-5">
                <h3 className="text-base font-extrabold text-slate-900">كيف أُضيف تقييمًا؟</h3>
                <p className="mt-1 text-xs leading-6 text-slate-600">التقييمات مرتبطة بالطلبات المكتملة فقط، ويُضاف التقييم من صفحة الطلب بعد قبول التسليم لضمان موثوقية الآراء.</p>
                {user?.role === 'Buyer' ? <Link to="/orders" className="btn btn-secondary mt-3 inline-flex">الذهاب إلى طلباتي</Link> : null}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="card p-5">
              <h2 className="text-base font-extrabold text-slate-900">التواصل مع المستقل</h2>

              {!freelancer.isAvailable ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold leading-6 text-amber-800">
                  المستقل غير متاح لاستقبال طلبات جديدة حاليًا، ويمكنك إرسال رسالة داخلية للاستفسار.
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <MapPin className="size-4" />
                    الموقع
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {freelancer.location || 'غير محدد'}
                  </span>
                </div>
              </div>

              <Link to={conversationPath} className="btn btn-primary mt-4 w-full">
                <MessageCircle className="size-4" />
                {isOwnProfile ? 'فتح المحادثات' : 'طلب خدمة / محادثة داخلية'}
              </Link>

              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Flag className="size-3.5" />
                الإبلاغ عن الحساب
              </button>
            </section>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-800">
              المنصة مجانية ولا تتدخل في المدفوعات. اتفق على تفاصيل المشروع والدفع
              مباشرة مع المستقل، وتأكد من معاينة الأعمال قبل التحويل.
            </div>

          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Link to={conversationPath} className="btn btn-primary h-full flex-1">
            <MessageCircle className="size-5" />
            {isOwnProfile ? 'المحادثات' : 'محادثة داخلية'}
          </Link>
        </div>
      </div>

      <PortfolioModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <OrderConfirmModal open={Boolean(selectedOrderService)} title={selectedOrderService?.title ?? ''} description={selectedOrderService?.description ?? ''} price={selectedOrderService?.price} pending={createOrder.isPending} onClose={() => setSelectedOrderService(null)} onConfirm={() => { if (selectedOrderService) createOrder.mutate(selectedOrderService.id); }} />
      <ShareServiceModal open={Boolean(sharedService)} onClose={() => setSharedService(null)} freelancerId={freelancer.id} service={sharedService} />
      {mediaViewer ? <MediaLightbox items={mediaViewer.items} initialIndex={mediaViewer.index} title={mediaViewer.title} onClose={() => setMediaViewer(null)} /> : null}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        isSubmitting={reportMutation.isPending}
        onSubmit={submitReport}
      />
    </div>
  );
};
