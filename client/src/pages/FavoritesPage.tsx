import { Compass, Heart, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FavoriteProfileCard } from '@/components/freelancers/FavoriteProfileCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFavorites } from '@/hooks/useFavorites';
import { formatNumber } from '@/lib/utils';

export const FavoritesPage = () => {
  useDocumentTitle('المفضلة');

  const { favoriteIds, favoriteCount } = useFavorites();

  return (
    <div className="container-page py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-rose-100 bg-linear-to-l from-rose-50 via-white to-brand-50 p-6 dark:border-rose-400/20 dark:from-rose-950/30 dark:via-slate-900 dark:to-brand-950/40 sm:p-8">
        <div className="absolute -inset-e-10 -top-10 size-40 rounded-full bg-rose-100/60 blur-2xl dark:bg-rose-500/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-xs font-extrabold text-rose-700">
              <Heart className="size-3.5 fill-current" />
              قائمتك المختارة
            </span>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              المستقلون المفضلون
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              احفظ المستقلين الذين أعجبك عملهم وارجع إليهم بسهولة قبل بدء مشروعك.
              القائمة محفوظة على هذا المتصفح.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm">
              <Heart className="size-4 text-rose-500" />
              {formatNumber(favoriteCount)} محفوظ
            </span>
            <Link to="/#freelancers" className="btn btn-primary">
              <Compass className="size-4" />
              استكشف المستقلين
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8">
        {favoriteCount === 0 ? (
          <EmptyState
            icon={Heart}
            title="قائمة المفضلة فارغة"
            description="اضغط على أيقونة القلب في أي بروفايل مستقل لحفظه هنا والرجوع إليه لاحقًا."
            action={
              <Link to="/#freelancers" className="btn btn-primary">
                <Search className="size-4" />
                ابدأ البحث الآن
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {favoriteIds.map((id) => (
                <FavoriteProfileCard key={id} freelancerId={id} />
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center text-xs font-semibold leading-6 text-slate-500">
              إذا حذفت مستقلًا من المفضلة، فسيختفي من هذه الصفحة مباشرة. لا يؤثر ذلك
              على البروفايل أو التقييمات.
            </div>
          </>
        )}
      </div>
    </div>
  );
};
