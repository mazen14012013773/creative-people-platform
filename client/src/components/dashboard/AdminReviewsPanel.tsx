import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, MessageSquareText, Search, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { StarRating } from '@/components/ui/StarRating';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { csvFilename, downloadCsv } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminReviewsParams } from '@/services/admin.service';
import { sanitizeText } from '@/lib/sanitize';

export const AdminReviewsPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 400);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; clientName: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  useEffect(() => {
    setDeleteReason('');
  }, [deleteTarget]);

  const params: AdminReviewsParams = {
    q: debouncedQ.trim() || undefined,
    page,
    limit: 15,
  };

  const reviewsQuery = useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => adminApi.reviews(params),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.deleteReview(id, reason),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success('تم حذف التقييم بنجاح');
      await queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      await queryClient.invalidateQueries({ queryKey: ['freelancer'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حذف التقييم')),
  });

  const MIN_REASON = 0;
  const deleteReady = deleteReason.trim().length >= MIN_REASON;

  const exportCsv = () => {
    const rows = reviewsQuery.data?.items ?? [];
    if (!rows.length) {
      toast.error('لا توجد تقييمات لتصديرها.');
      return;
    }
    downloadCsv(csvFilename('reviews'), [
      ['صاحب التقييم', 'المستقل', 'التقييم', 'التعليق', 'التاريخ'],
      ...rows.map((review) => [review.clientName, review.freelancerName, review.rating, review.comment ?? '', formatDate(review.createdAt)]),
    ]);
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">مراجعة التقييمات</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            احذف التقييمات المسيئة أو غير الحقيقية للحفاظ على مصداقية الدليل.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reviewsQuery.isFetching ? <Spinner className="size-5" /> : null}
          <button type="button" onClick={exportCsv} className="btn btn-secondary btn-sm">
            <Download className="size-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="input ps-9"
          placeholder="ابحث باسم المستقل أو اسم صاحب التقييم..."
          aria-label="البحث في التقييمات"
        />
      </div>

      <div className="mt-5">
        {reviewsQuery.isError ? (
          <ErrorState
            message="تعذر تحميل التقييمات."
            onRetry={() => void reviewsQuery.refetch()}
          />
        ) : reviewsQuery.isPending ? (
          <PageLoader label="جارٍ تحميل التقييمات..." />
        ) : reviewsQuery.data.items.length > 0 ? (
          <>
            <div className="space-y-3">
              {reviewsQuery.data.items.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {review.clientName}
                        </h3>
                        <Badge tone="slate">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {review.rating}/5
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        تقييم لـ {review.freelancerName} — {formatDate(review.createdAt)}
                      </p>

                      <div className="mt-2">
                        <StarRating value={review.rating} showValue={false} />
                      </div>

                      {review.comment ? (
                        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                          {sanitizeText(review.comment)}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          بدون تعليق
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: review.id, clientName: review.clientName })}
                      disabled={deleteMutation.isPending}
                      className="btn btn-secondary btn-sm shrink-0 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                    >
                      {deleteMutation.isPending ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5">
              <Pagination
                pagination={reviewsQuery.data.pagination}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={MessageSquareText}
            title="لا توجد تقييمات"
            description="لا توجد تقييمات مطابقة لبحثك."
            compact
          />
        )}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف تقييم"
        size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary" disabled={deleteMutation.isPending}>رجوع</button>
            <button
              type="button"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason.trim() });
                }
              }}
              disabled={deleteMutation.isPending || !deleteReady}
              className="btn btn-danger"
            >
              {deleteMutation.isPending ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
              تأكيد الحذف
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm leading-6 text-slate-600">
          <p>سيتم حذف التقييم الخاص بـ <span className="font-extrabold text-slate-900">{deleteTarget?.clientName}</span> نهائياً ولا يمكن التراجع عنه.</p>
        </div>
      </Modal>
    </section>
  );
};
