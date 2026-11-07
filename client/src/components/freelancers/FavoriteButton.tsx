import { Heart } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  freelancerId: string;
  freelancerName?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export const FavoriteButton = ({
  freelancerId,
  freelancerName,
  variant = 'icon',
  className,
}: FavoriteButtonProps) => {
  const toast = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(freelancerId);

  const handleClick = () => {
    toggleFavorite(freelancerId);
    toast.info(
      active
        ? `تمت إزالة ${freelancerName ?? 'البروفايل'} من المفضلة`
        : `تمت إضافة ${freelancerName ?? 'البروفايل'} إلى المفضلة`,
    );
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        className={cn(
          'btn',
          active
            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            : 'btn-secondary',
          className,
        )}
      >
        <Heart className={cn('size-4', active && 'fill-current')} />
        {active ? 'في المفضلة' : 'أضف للمفضلة'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      title={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition',
        active
          ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600',
        className,
      )}
    >
      <Heart className={cn('size-4', active && 'fill-current')} />
    </button>
  );
};
