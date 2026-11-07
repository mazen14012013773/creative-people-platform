import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Images,
  Layers,
  MessageSquareText,
  Newspaper,
  Pencil,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate, formatNumber, formatPrice } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import {
  adminApi,
  type AdminContentListParams,
  type AdminContentPostsParams,
  type AdminContentServicesParams,
} from '@/services/admin.service';
import type {
  AdminContentPortfolio,
  AdminContentService,
} from '@/types';

type ContentTab = 'services' | 'portfolio' | 'posts' | 'comments';

type ConfirmTarget = {
  kind: 'service' | 'portfolio' | 'post' | 'comment';
  mode: 'delete' | 'status';
  id: string;
  title: string;
  actionLabel: string;
};

interface ServiceForm {
  title: string;
  description: string;
  category: string;
  price: string;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  featuredUntil: string;
}

interface PortfolioForm {
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
}


const TABS: Array<{ id: ContentTab; label: string; icon: typeof Layers }> = [
  { id: 'services', label: 'الخدمات', icon: Layers },
  { id: 'portfolio', label: 'أعمال المعرض', icon: Images },
  { id: 'posts', label: 'منشورات المجتمع', icon: Newspaper },
  { id: 'comments', label: 'التعليقات', icon: MessageSquareText },
];

const toLocalDateTimeInput = (iso: string): string => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 16);
};

const serviceToForm = (service: AdminContentService): ServiceForm => ({
  title: service.title,
  description: service.description,
  category: service.category,
  price: String(service.price),
  status: service.status,
  isFeatured: service.isFeatured,
  featuredUntil: service.featuredUntil ? toLocalDateTimeInput(service.featuredUntil) : '',
});

const portfolioToForm = (item: AdminContentPortfolio): PortfolioForm => ({
  title: item.title,
  description: item.description ?? '',
  imageUrl: item.imageUrl ?? '',
  projectUrl: item.projectUrl ?? '',
});

const textOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

export const AdminContentPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ContentTab>('services');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [editService, setEditService] = useState<AdminContentService | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);
  const [editPortfolio, setEditPortfolio] = useState<AdminContentPortfolio | null>(null);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioForm | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter, tab]);

  const searchText = debouncedQ.trim() || undefined;

  const listParams = useMemo<AdminContentListParams>(
    () => ({ q: searchText, page, limit: 20 }),
    [searchText, page],
  );

  const servicesParams = useMemo<AdminContentServicesParams>(
    () => ({
      q: searchText,
      status: statusFilter === 'active' || statusFilter === 'inactive' ? statusFilter : undefined,
      page,
      limit: 20,
    }),
    [searchText, statusFilter, page],
  );

  const postsParams = useMemo<AdminContentPostsParams>(
    () => ({
      q: searchText,
      status: statusFilter === 'PUBLISHED' || statusFilter === 'DRAFT' ? statusFilter : undefined,
      page,
      limit: 20,
    }),
    [searchText, statusFilter, page],
  );

  const servicesQuery = useQuery({
    queryKey: ['admin-content-services', servicesParams],
    queryFn: () => adminApi.contentServices(servicesParams),
    enabled: tab === 'services',
  });

  const portfolioQuery = useQuery({
    queryKey: ['admin-content-portfolio', listParams],
    queryFn: () => adminApi.contentPortfolio(listParams),
    enabled: tab === 'portfolio',
  });

  const postsQuery = useQuery({
    queryKey: ['admin-content-posts', postsParams],
    queryFn: () => adminApi.contentPosts(postsParams),
    enabled: tab === 'posts',
  });

  const commentsQuery = useQuery({
    queryKey: ['admin-content-comments', listParams],
    queryFn: () => adminApi.contentComments(listParams),
    enabled: tab === 'comments',
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-content-services'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-content-portfolio'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-content-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-content-comments'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['services'] }),
      queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
    ]);
  };

  const updateServiceMutation = useMutation({
    mutationFn: ({
      id,
      patch,
      reason,
    }: {
      id: string;
      patch: {
        title: string;
        description: string;
        category: string;
        price: number;
        status: 'active' | 'inactive';
        isFeatured: boolean;
        featuredUntil: string | null;
      };
      reason: string;
    }) => adminApi.updateContentService(id, patch, reason),
    onSuccess: async () => {
      toast.success('تم تحديث الخدمة وتسجيل الإجراء');
      setEditService(null);
      setServiceForm(null);
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث الخدمة')),
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: ({
      id,
      patch,
      reason,
    }: {
      id: string;
      patch: { title: string; description: string | null; imageUrl: string | null; projectUrl: string | null };
      reason: string;
    }) => adminApi.updateContentPortfolio(id, patch, reason),
    onSuccess: async () => {
      toast.success('تم تحديث مشروع المعرض وتسجيل الإجراء');
      setEditPortfolio(null);
      setPortfolioForm(null);
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث المشروع')),
  });

  const postStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: 'PUBLISHED' | 'DRAFT';
      reason: string;
    }) => adminApi.setContentPostStatus(id, status, reason),
    onSuccess: async (_post, variables) => {
      toast.success(variables.status === 'PUBLISHED' ? 'تم نشر المنشور' : 'تم إخفاء المنشور');
      setConfirm(null);
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث المنشور')),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ kind, id, reason }: { kind: ConfirmTarget['kind']; id: string; reason: string }) => {
      if (kind === 'service') return adminApi.deleteContentService(id, reason);
      if (kind === 'portfolio') return adminApi.deleteContentPortfolio(id, reason);
      if (kind === 'post') return adminApi.deleteContentPost(id, reason);
      return adminApi.deleteContentComment(id, reason);
    },
    onSuccess: async () => {
      toast.success('تم الحذف النهائي وتسجيل الإجراء');
      setConfirm(null);
      await refreshAll();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تنفيذ الحذف')),
  });

  const toggleServiceStatus = (service: AdminContentService) => {
    setConfirm({
      kind: 'service',
      mode: 'status',
      id: service.id,
      title: service.title,
      actionLabel: service.status === 'active' ? 'إخفاء الخدمة' : 'إعادة إظهار الخدمة',
    });
  };

  const togglePostStatus = (postId: string, title: string, current: 'PUBLISHED' | 'DRAFT') => {
    setConfirm({
      kind: 'post',
      mode: 'status',
      id: postId,
      title,
      actionLabel: current === 'PUBLISHED' ? 'إخفاء المنشور' : 'نشر المنشور',
    });
  };

  const confirmAction = () => {
    if (!confirm) return;
    const reason = '';

    if (confirm.mode === 'delete') {
      deleteMutation.mutate({ kind: confirm.kind, id: confirm.id, reason });
      return;
    }

    if (confirm.kind === 'post') {
      const post = postsQuery.data?.items.find((item) => item.id === confirm.id);

      if (!post) {
        return;
      }

      postStatusMutation.mutate({
        id: confirm.id,
        status: post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
        reason,
      });
      return;
    }

    if (confirm.kind === 'service') {
      const service = servicesQuery.data?.items.find((item) => item.id === confirm.id);

      if (!service) {
        return;
      }

      updateServiceMutation.mutate({
        id: service.id,
        patch: {
          title: service.title,
          description: service.description,
          category: service.category,
          price: service.price,
          status: service.status === 'active' ? 'inactive' : 'active',
          isFeatured: service.isFeatured,
          featuredUntil: service.featuredUntil,
        },
        reason,
      });
      setConfirm(null);
    }
  };

  const startDelete = (kind: ConfirmTarget['kind'], id: string, title: string) => {
    setConfirm({ kind, mode: 'delete', id, title, actionLabel: 'حذف نهائي' });
  };

  const openServiceEdit = (service: AdminContentService) => {
    setEditService(service);
    setServiceForm(serviceToForm(service));
  };

  const submitServiceEdit = () => {
    if (!editService || !serviceForm) {
      return;
    }

    updateServiceMutation.mutate({
      id: editService.id,
      patch: {
        title: serviceForm.title.trim(),
        description: serviceForm.description.trim(),
        category: serviceForm.category.trim(),
        price: Number(serviceForm.price),
        status: serviceForm.status,
        isFeatured: serviceForm.isFeatured,
        featuredUntil: serviceForm.featuredUntil ? serviceForm.featuredUntil : null,
      },
      reason: '',
    });
  };

  const openPortfolioEdit = (item: AdminContentPortfolio) => {
    setEditPortfolio(item);
    setPortfolioForm(portfolioToForm(item));
  };

  const submitPortfolioEdit = () => {
    if (!editPortfolio || !portfolioForm) {
      return;
    }

    updatePortfolioMutation.mutate({
      id: editPortfolio.id,
      patch: {
        title: portfolioForm.title.trim(),
        description: textOrNull(portfolioForm.description),
        imageUrl: textOrNull(portfolioForm.imageUrl),
        projectUrl: textOrNull(portfolioForm.projectUrl),
      },
      reason: '',
    });
  };

  const exportCsv = () => {
    if (tab === 'services') {
      const items = servicesQuery.data?.items ?? [];

      if (!items.length) return;

      downloadCsv(csvFilename('content-services'), [
        ['الخدمة', 'المستقل', 'البريد', 'التصنيف', 'السعر', 'الحالة', 'مميزة', 'الطلبات', 'تاريخ الإنشاء'],
        ...items.map((service) => [
          service.title,
          service.freelancerName,
          service.freelancerEmail,
          service.category,
          service.price,
          service.status === 'active' ? 'ظاهرة' : 'مخفية',
          service.isFeatured ? 'نعم' : 'لا',
          service.orderCount,
          formatDate(service.createdAt),
        ]),
      ]);
      return;
    }

    if (tab === 'portfolio') {
      const items = portfolioQuery.data?.items ?? [];

      if (!items.length) return;

      downloadCsv(csvFilename('content-portfolio'), [
        ['المشروع', 'صاحب العمل', 'البريد', 'الوصف', 'رابط المشروع', 'تاريخ الإنشاء'],
        ...items.map((item) => [
          item.title,
          item.userName,
          item.userEmail,
          item.description ?? '',
          item.projectUrl ?? '',
          formatDate(item.createdAt),
        ]),
      ]);
      return;
    }

    if (tab === 'posts') {
      const items = postsQuery.data?.items ?? [];

      if (!items.length) return;

      downloadCsv(csvFilename('content-posts'), [
        ['المنشور', 'الكاتب', 'البريد', 'التصنيف', 'الحالة', 'المشاهدات', 'الإعجابات', 'التعليقات', 'تاريخ الإنشاء'],
        ...items.map((post) => [
          post.title,
          post.authorName,
          post.authorEmail,
          post.category,
          post.status === 'PUBLISHED' ? 'منشور' : 'مخفي',
          post.viewsCount,
          post.likesCount,
          post.commentCount,
          formatDate(post.createdAt),
        ]),
      ]);
      return;
    }

    const items = commentsQuery.data?.items ?? [];

    if (!items.length) return;

    downloadCsv(csvFilename('content-comments'), [
      ['التعليق', 'الكاتب', 'البريد', 'المنشور', 'مرفق', 'تاريخ الإنشاء'],
      ...items.map((comment) => [
        comment.content,
        comment.userName,
        comment.userEmail,
        comment.postTitle ?? '',
        comment.attachmentType ?? '',
        formatDate(comment.createdAt),
      ]),
    ]);
  };

  const activeQuery =
    tab === 'services'
      ? servicesQuery
      : tab === 'portfolio'
        ? portfolioQuery
        : tab === 'posts'
          ? postsQuery
          : commentsQuery;

  const activeItemsCount =
    tab === 'services'
      ? (servicesQuery.data?.items.length ?? 0)
      : tab === 'portfolio'
        ? (portfolioQuery.data?.items.length ?? 0)
        : tab === 'posts'
          ? (postsQuery.data?.items.length ?? 0)
          : (commentsQuery.data?.items.length ?? 0);

  const pagination =
    tab === 'services'
      ? servicesQuery.data?.pagination
      : tab === 'portfolio'
        ? portfolioQuery.data?.pagination
        : tab === 'posts'
          ? postsQuery.data?.pagination
          : commentsQuery.data?.pagination;

  const isBusy =
    updateServiceMutation.isPending ||
    updatePortfolioMutation.isPending ||
    postStatusMutation.isPending ||
    deleteMutation.isPending;

  return (
    <section className="card p-5 sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">التحكم الكامل بالمحتوى والخدمات</h2>
          <p className="mt-1 max-w-3xl text-xs font-semibold leading-6 text-slate-500">
            عدّل أو أخفِ أو احذف أي خدمة، مشروع معرض، منشور مجتمع، أو تعليق. كل إجراء يتطلب سبباً
            ويُسجَّل في سجل التدقيق.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeQuery.isFetching ? <Spinner className="size-5" /> : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={activeItemsCount === 0}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
        {TABS.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setStatusFilter('');
              }}
              className={
                active
                  ? 'inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-extrabold text-white'
                  : 'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-white'
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="input ps-9"
            placeholder="ابحث بالعنوان أو الاسم أو البريد..."
            aria-label={`البحث في ${TABS.find((item) => item.id === tab)?.label}`}
          />
        </div>
        {tab === 'services' ? (
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="input"
            aria-label="فلترة بحالة الخدمة"
          >
            <option value="">كل الحالات</option>
            <option value="active">ظاهرة</option>
            <option value="inactive">مخفية</option>
          </select>
        ) : tab === 'posts' ? (
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="input"
            aria-label="فلترة بحالة المنشور"
          >
            <option value="">كل الحالات</option>
            <option value="PUBLISHED">منشور</option>
            <option value="DRAFT">مخفي</option>
          </select>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <div className="mt-5">
        {activeQuery.isError ? (
          <ErrorState message="تعذر تحميل المحتوى." onRetry={() => void activeQuery.refetch()} />
        ) : activeQuery.isPending ? (
          <PageLoader label="جارٍ تحميل المحتوى..." />
        ) : tab === 'services' && servicesQuery.data ? (
          servicesQuery.data.items.length === 0 ? (
            <EmptyState icon={Layers} title="لا توجد خدمات" description="جرّب تغيير البحث أو الفلتر." />
          ) : (
            <div className="space-y-3">
              {servicesQuery.data.items.map((service) => (
                <article key={service.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">{service.title}</p>
                        <Badge tone={service.status === 'active' ? 'emerald' : 'slate'}>
                          {service.status === 'active' ? 'ظاهرة' : 'مخفية'}
                        </Badge>
                        {service.isFeatured ? (
                          <Badge tone="amber">
                            <Star className="me-1 size-3 fill-amber-500" />
                            مميزة
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500" dir="ltr">
                        {service.freelancerName} · {service.freelancerEmail}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {service.category} · {formatPrice(service.price)} · {service.orderCount} طلب
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{service.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/freelancers/${service.freelancerId}#profile-services`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <ExternalLink className="size-4" /> فتح للمعاينة
                      </Link>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openServiceEdit(service)} disabled={isBusy}>
                        <Pencil className="size-4" /> تعديل
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleServiceStatus(service)} disabled={isBusy}>
                        {service.status === 'active' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        {service.status === 'active' ? 'إخفاء' : 'إظهار'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => startDelete('service', service.id, service.title)}
                        disabled={isBusy}
                      >
                        <Trash2 className="size-4" /> حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : tab === 'portfolio' && portfolioQuery.data ? (
          portfolioQuery.data.items.length === 0 ? (
            <EmptyState icon={Images} title="لا توجد أعمال معرض" description="جرّب تغيير البحث." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {portfolioQuery.data.items.map((item) => (
                <article key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 p-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="size-20 shrink-0 rounded-xl border border-slate-200 object-cover" />
                  ) : (
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Images className="size-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">{item.title}</p>
                    <p className="truncate text-[11px] text-slate-500" dir="ltr">{item.userEmail}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.description ?? 'بدون وصف'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link to={`/freelancers/${item.userId}#profile-portfolio`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <ExternalLink className="size-3.5" /> فتح للمعاينة
                      </Link>
                      {item.projectUrl ? <a href={item.projectUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink className="size-3.5" /> رابط المشروع</a> : null}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openPortfolioEdit(item)} disabled={isBusy}>
                        <Pencil className="size-3.5" /> تعديل
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => startDelete('portfolio', item.id, item.title)} disabled={isBusy}>
                        <Trash2 className="size-3.5" /> حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : tab === 'posts' && postsQuery.data ? (
          postsQuery.data.items.length === 0 ? (
            <EmptyState icon={Newspaper} title="لا توجد منشورات" description="جرّب تغيير البحث أو الفلتر." />
          ) : (
            <div className="space-y-3">
              {postsQuery.data.items.map((post) => (
                <article key={post.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">{post.title}</p>
                        <Badge tone={post.status === 'PUBLISHED' ? 'emerald' : 'slate'}>
                          {post.status === 'PUBLISHED' ? 'منشور' : 'مخفي'}
                        </Badge>
                        <Badge tone="slate">{post.category}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500" dir="ltr">{post.authorName} · {post.authorEmail}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{post.content}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {formatNumber(post.viewsCount)} مشاهدة · {formatNumber(post.likesCount)} إعجاب · {formatNumber(post.commentCount)} تعليق · {formatDate(post.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/community/posts/${post.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <ExternalLink className="size-4" /> فتح للمعاينة
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => togglePostStatus(post.id, post.title, post.status)}
                        disabled={isBusy}
                      >
                        {post.status === 'PUBLISHED' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        {post.status === 'PUBLISHED' ? 'إخفاء' : 'نشر'}
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => startDelete('post', post.id, post.title)} disabled={isBusy}>
                        <Trash2 className="size-4" /> حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : tab === 'comments' && commentsQuery.data ? (
          commentsQuery.data.items.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="لا توجد تعليقات" description="جرّب تغيير البحث." />
          ) : (
            <div className="space-y-3">
              {commentsQuery.data.items.map((comment) => (
                <article key={comment.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900">{comment.userName}</p>
                    <p className="text-[11px] text-slate-500" dir="ltr">{comment.userEmail}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-700">{comment.content}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      على: {comment.postTitle ?? (comment.articleId ? 'مقال' : 'منشور محذوف')} · {formatDate(comment.createdAt)}
                      {comment.attachmentType ? ` · مرفق ${comment.attachmentType}` : ''}
                    </p>
                    {comment.attachmentUrl ? (
                      <a href={comment.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-bold text-brand-700 underline">
                        فتح المرفق
                      </a>
                    ) : null}
                    {comment.postId ? <Link to={`/community/posts/${comment.postId}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"><ExternalLink className="size-3.5" /> فتح المنشور للمعاينة</Link> : null}
                  </div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => startDelete('comment', comment.id, comment.userName)} disabled={isBusy}>
                    <Trash2 className="size-4" /> حذف
                  </button>
                </article>
              ))}
            </div>
          )
        ) : null}

        {pagination ? (
          <div className="mt-4">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(editService && serviceForm)}
        onClose={() => {
          setEditService(null);
          setServiceForm(null);
        }}
        title={editService ? `تعديل الخدمة: ${editService.title}` : 'تعديل الخدمة'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => { setEditService(null); setServiceForm(null); }}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={updateServiceMutation.isPending || !serviceForm}
              onClick={submitServiceEdit}
            >
              {updateServiceMutation.isPending ? <Spinner className="size-4" /> : <Pencil className="size-4" />}
              حفظ التعديلات
            </button>
          </div>
        }
      >
        {serviceForm ? (
          <div className="grid gap-4 sm:grid-cols-2" dir="rtl">
            <label className="label sm:col-span-2">
              عنوان الخدمة
              <input value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} className="input mt-1.5" maxLength={150} />
            </label>
            <label className="label">
              التصنيف
              <input value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} className="input mt-1.5" maxLength={80} />
            </label>
            <label className="label">
              السعر
              <input type="number" min={0} step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} className="input mt-1.5" />
            </label>
            <label className="label sm:col-span-2">
              الوصف
              <textarea rows={4} value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} className="input mt-1.5 resize-y" maxLength={4000} />
            </label>
            <label className="label">
              حالة الظهور
              <select value={serviceForm.status} onChange={(event) => setServiceForm({ ...serviceForm, status: event.target.value as 'active' | 'inactive' })} className="input mt-1.5">
                <option value="active">ظاهرة</option>
                <option value="inactive">مخفية</option>
              </select>
            </label>
            <label className="label">
              تمييز في السوق
              <div className="mt-2 rounded-xl border border-slate-200 p-3">
                <Switch
                  checked={serviceForm.isFeatured}
                  onChange={(checked) => setServiceForm({ ...serviceForm, isFeatured: checked })}
                  label="خدمة مميزة"
                  description="ظهور بارز في صفحة الخدمات."
                />
              </div>
            </label>
            <label className="label sm:col-span-2">
              تمييز حتى تاريخ (اختياري)
              <input
                type="datetime-local"
                value={serviceForm.featuredUntil}
                onChange={(event) => setServiceForm({ ...serviceForm, featuredUntil: event.target.value })}
                className="input mt-1.5"
                disabled={!serviceForm.isFeatured}
              />
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editPortfolio && portfolioForm)}
        onClose={() => {
          setEditPortfolio(null);
          setPortfolioForm(null);
        }}
        title={editPortfolio ? `تعديل مشروع: ${editPortfolio.title}` : 'تعديل المشروع'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => { setEditPortfolio(null); setPortfolioForm(null); }}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={updatePortfolioMutation.isPending || !portfolioForm}
              onClick={submitPortfolioEdit}
            >
              {updatePortfolioMutation.isPending ? <Spinner className="size-4" /> : <Pencil className="size-4" />}
              حفظ التعديلات
            </button>
          </div>
        }
      >
        {portfolioForm ? (
          <div className="grid gap-4" dir="rtl">
            <label className="label">
              عنوان المشروع
              <input value={portfolioForm.title} onChange={(event) => setPortfolioForm({ ...portfolioForm, title: event.target.value })} className="input mt-1.5" maxLength={150} />
            </label>
            <label className="label">
              الوصف
              <textarea rows={3} value={portfolioForm.description} onChange={(event) => setPortfolioForm({ ...portfolioForm, description: event.target.value })} className="input mt-1.5 resize-y" maxLength={2000} />
            </label>
            <label className="label">
              رابط الصورة
              <input dir="ltr" value={portfolioForm.imageUrl} onChange={(event) => setPortfolioForm({ ...portfolioForm, imageUrl: event.target.value })} className="input mt-1.5" placeholder="/uploads/... أو https://..." />
            </label>
            <label className="label">
              رابط المشروع
              <input dir="ltr" value={portfolioForm.projectUrl} onChange={(event) => setPortfolioForm({ ...portfolioForm, projectUrl: event.target.value })} className="input mt-1.5" placeholder="https://..." />
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.actionLabel ?? 'تأكيد الإجراء'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)} disabled={isBusy}>
              تراجع
            </button>
            <button
              type="button"
              className={confirm?.mode === 'delete' ? 'btn btn-danger' : 'btn btn-primary'}
              disabled={isBusy}
              onClick={confirmAction}
            >
              {isBusy ? (
                <Spinner className="size-4" />
              ) : confirm?.mode === 'delete' ? (
                <Trash2 className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
              {confirm?.actionLabel}
            </button>
          </div>
        }
      >
        {confirm ? (
          <div className="space-y-4" dir="rtl">
            <p className="text-sm leading-6 text-slate-700">
              الإجراء «{confirm.actionLabel}» على: <strong className="text-slate-900">{confirm.title}</strong>
            </p>
            {confirm.kind === 'service' && confirm.mode === 'delete' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-6 text-amber-800">
                الخدمات المرتبطة بطلبات سابقة لا يمكن حذفها نهائياً؛ استخدم الإخفاء للمحافظة على سجل الطلبات.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
};
