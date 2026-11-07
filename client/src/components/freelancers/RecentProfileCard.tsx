import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { freelancersApi } from '@/services/freelancers.service';

export const RecentProfileCard = ({ freelancerId }: { freelancerId: string }) => {
  const query = useQuery({
    queryKey: ['freelancer', freelancerId],
    queryFn: () => freelancersApi.detail(freelancerId),
    retry: false,
    staleTime: 60_000,
  });

  if (query.isPending) {
    return (
      <div className="card flex items-center gap-3 p-3.5">
        <div className="size-14 animate-pulse rounded-2xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return null;
  }

  const { freelancer, stats } = query.data;

  return (
    <Link
      to={`/freelancers/${freelancer.id}`}
      className="card group flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
    >
      <Avatar
        name={freelancer.name}
        src={freelancer.avatarUrl}
        className="size-14 rounded-2xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-slate-900 transition group-hover:text-brand-700">
            {freelancer.name}
          </h3>
          {freelancer.isAvailable ? (
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
          ) : (
            <span className="size-2 shrink-0 rounded-full bg-amber-400" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
          {freelancer.title || 'مستقل'}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StarRating
            value={stats.avgRating}
            count={stats.reviewCount}
            showValue={false}
          />
          <span className="text-[10px] font-bold text-slate-400">
            {stats.reviewCount} تقييم
          </span>
          {freelancer.location ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
              <MapPin className="size-3" />
              {freelancer.location}
            </span>
          ) : null}
        </div>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
    </Link>
  );
};
