import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { freelancersApi } from '@/services/freelancers.service';
import { SectionHeading } from '@/components/ui/SectionHeading';

const formatRating = (value: number): string => value.toFixed(1);

const FEATURED_ACCENTS = [
  'border-sky-100 hover:border-sky-300',
  'border-violet-100 hover:border-violet-300',
  'border-emerald-100 hover:border-emerald-300',
  'border-orange-100 hover:border-orange-300',
  'border-fuchsia-100 hover:border-fuchsia-300',
];
const SKILL_ACCENTS = [
  'border-sky-100 bg-sky-50 text-sky-700',
  'border-violet-100 bg-violet-50 text-violet-700',
  'border-emerald-100 bg-emerald-50 text-emerald-700',
  'border-orange-100 bg-orange-50 text-orange-700',
];

export const FeaturedRail = () => {
  const query = useQuery({
    queryKey: ['featured-freelancers', 8],
    queryFn: () => freelancersApi.featured(8),
    staleTime: 5 * 60 * 1000,
  });

  const items = query.data ?? [];

  if (query.isPending || items.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-slate-200/70 bg-white/70 py-10 sm:py-12">
      <div className="container-page">
        <SectionHeading
          eyebrow="مختارون من الإدارة"
          title="مستقلون مميزون"
          description="بروفايلات موثّقة ومعارض أعمال مراجعة، اختارتها إدارة مبدعين لبدء البحث أسرع."
          action={
            <Link to="/#freelancers" className="btn btn-secondary btn-sm">
              كل المستقلين
              <ArrowLeft className="size-4" />
            </Link>
          }
        />

        <div className="mt-6 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {items.map((freelancer, index) => (
            <Link
              key={freelancer.id}
              to={`/freelancers/${freelancer.id}`}
              className={`group flex w-62 shrink-0 snap-start flex-col rounded-3xl border bg-white p-4 shadow-xl shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-slate-300/50 ${FEATURED_ACCENTS[index % FEATURED_ACCENTS.length]}`}
            >
              <div className="flex items-start gap-3">
                <span className="relative">
                  <Avatar
                    name={freelancer.name}
                    src={freelancer.avatarUrl}
                    className="size-14 rounded-2xl"
                    textClassName="text-sm"
                  />
                  <span className="absolute -inset-e-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-white">
                    <Sparkles className="size-3" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-extrabold text-slate-950 group-hover:text-brand-700">
                      {freelancer.name}
                    </p>
                    {freelancer.isVerified ? <VerifiedBadge label="موثّق" /> : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs font-bold text-brand-700">
                    {freelancer.title || 'مستقل'}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {formatRating(freelancer.avgRating)}
                    <span className="text-slate-400">
                      ({freelancer.reviewCount} تقييم)
                    </span>
                  </p>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-6 text-slate-500">
                {freelancer.bio || 'بروفايل مميز جاهز لمشروعك القادم.'}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {freelancer.skills.slice(0, 2).map((skill, skillIndex) => (
                  <span
                    key={skill.id}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SKILL_ACCENTS[(index + skillIndex) % SKILL_ACCENTS.length]}`}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>

              <span className="mt-auto pt-4 text-xs font-extrabold text-brand-700">
                عرض البروفايل
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
