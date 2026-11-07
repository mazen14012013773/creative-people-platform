import { MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { cn } from '@/lib/utils';
import type { FreelancerCard as FreelancerCardType } from '@/types';
import { FavoriteButton } from './FavoriteButton';

const CARD_ACCENTS = [
  'from-cyan-100 via-sky-50 to-blue-100',
  'from-violet-100 via-fuchsia-50 to-pink-100',
  'from-emerald-100 via-lime-50 to-teal-100',
  'from-amber-100 via-orange-50 to-rose-100',
];

const SKILL_ACCENTS = [
  'border-violet-100 bg-violet-50 text-violet-700',
  'border-emerald-100 bg-emerald-50 text-emerald-700',
  'border-sky-100 bg-sky-50 text-sky-700',
  'border-orange-100 bg-orange-50 text-orange-700',
  'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700',
];

interface FreelancerCardProps {
  freelancer: FreelancerCardType;
  className?: string;
}

export const FreelancerCard = ({ freelancer, className }: FreelancerCardProps) => {
  const accentIndex = Array.from(freelancer.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % CARD_ACCENTS.length;

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-slate-300/50',
        className,
      )}
    >
      <div className={cn('relative h-22 overflow-hidden bg-linear-to-br', CARD_ACCENTS[accentIndex])}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.75),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(0,174,239,0.08),transparent_36%)]" />
        <div className="absolute -inset-e-6 -top-10 size-28 rounded-full border border-sky-200/60 bg-white/30" />
        <div className="absolute bottom-2 inset-s-1/3 size-10 rounded-full border border-violet-200/50 bg-white/30" />

        {freelancer.isFeatured ? (
          <span className="absolute inset-s-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold text-orange-700">
            <Sparkles className="size-3.5" />
            مستقل مميز
          </span>
        ) : null}

        <FavoriteButton
          freelancerId={freelancer.id}
          freelancerName={freelancer.name}
          className="absolute inset-e-4 top-3 border-white/30 bg-white/90 text-slate-600 shadow-sm backdrop-blur hover:bg-white"
        />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-9 flex items-end justify-between gap-3">
          <span className="rounded-[1.35rem] border-4 border-white bg-white shadow-lg shadow-slate-300/50">
            <Avatar
              name={freelancer.name}
              src={freelancer.avatarUrl}
              className="size-18 rounded-2xl"
              textClassName="text-xl"
            />
          </span>
          <div className="mb-1.5 rounded-full border border-amber-100 bg-amber-50 px-2 py-1">
            <StarRating
              value={freelancer.avgRating}
              count={freelancer.reviewCount}
            />
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/freelancers/${freelancer.id}`}
                className="min-w-0 truncate text-lg font-extrabold text-slate-950 transition hover:text-brand-700"
              >
                {freelancer.name}
              </Link>
              {freelancer.isVerified ? <VerifiedBadge /> : null}
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm font-bold text-brand-700">
              {freelancer.title || 'مستقل'}
            </p>
          </div>
          {freelancer.isAvailable ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              متاح
            </span>
          ) : (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500" />
              غير متاح
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-slate-400" />
            {freelancer.location || 'غير محدد'}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <span className="size-1 rounded-full bg-slate-300" />
            {freelancer.skills.length} مهارة
          </span>
          {freelancer.avgResponseHours !== null ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="size-1 rounded-full bg-emerald-300" />
              يرد خلال {freelancer.avgResponseHours <= 1 ? 'أقل من ساعة' : `${freelancer.avgResponseHours} ساعة`}
            </span>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-6 text-slate-500">
          {freelancer.bio || 'مبدع جاهز لعرض خدماته. ابدأ محادثة داخل المنصة لمناقشة التفاصيل.'}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {freelancer.skills.slice(0, 3).map((skill, index) => (
            <span
              key={skill.id}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-bold',
                SKILL_ACCENTS[(index + accentIndex) % SKILL_ACCENTS.length],
              )}
            >
              {skill.name}
            </span>
          ))}
          {freelancer.skills.length > 3 ? (
            <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
              +{freelancer.skills.length - 3}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/freelancers/${freelancer.id}`}
              className="btn btn-secondary btn-sm"
            >
              البروفايل
            </Link>
            <Link to={`/chat?userId=${freelancer.id}`} className="btn btn-primary btn-sm">
              <MessageCircle className="size-4" />
              مراسلة
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export const FreelancerCardSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white shadow-card">
      <div className="h-22 animate-pulse bg-linear-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900" />
      <div className="p-5">
        <div className="-mt-12 mb-4 flex items-end justify-between">
          <div className="size-18 rounded-[1.35rem] border-4 border-white bg-slate-200" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
};
