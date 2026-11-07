import { MessageSquareQuote } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/StarRating';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils';
import type { Review } from '@/types';
import { sanitizeText } from '@/lib/sanitize';

export const ReviewList = ({ reviews }: { reviews: Review[] }) => {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareQuote}
        title="لا توجد تقييمات بعد"
        description="إذا تعاملت مع هذا المستقل، كن أول من يشارك تجربته لمساعدة الآخرين."
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={review.clientName}
                src={null}
                className="size-9 rounded-xl"
                textClassName="text-xs"
              />
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  {review.clientName}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                  {formatDate(review.createdAt)}
                </p>
              </div>
            </div>
            <StarRating value={review.rating} showValue={false} />
          </div>
          {review.comment ? (
            <p className="mt-3 text-sm leading-7 text-slate-600">{sanitizeText(review.comment)}</p>
          ) : null}
          {review.serviceTitle ? <p className="mt-2 text-xs font-bold text-slate-500">الخدمة: {review.serviceTitle}</p> : null}
          {review.freelancerReply ? <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="text-xs font-extrabold text-cyan-900">رد المستقل</p><p className="mt-1 text-sm leading-6 text-slate-700">{sanitizeText(review.freelancerReply)}</p>{review.repliedAt ? <time className="mt-2 block text-[10px] text-slate-400">{formatDate(review.repliedAt)}</time> : null}</div> : null}
        </article>
      ))}
    </div>
  );
};
