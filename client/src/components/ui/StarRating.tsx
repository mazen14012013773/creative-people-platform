import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
}

export const StarRating = ({
  value,
  count,
  size = 'sm',
  showValue = true,
}: StarRatingProps) => {
  const rounded = Math.round(value);
  const iconSize = size === 'sm' ? 'size-4' : 'size-5';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              iconSize,
              star <= rounded
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 text-slate-200',
            )}
            aria-hidden="true"
          />
        ))}
      </div>
      {showValue ? (
        <span className="text-xs font-bold text-slate-600">
          {value > 0 ? value.toFixed(1) : 'جديد'}
          {typeof count === 'number' ? (
            <span className="font-medium text-slate-400"> ({count})</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
};

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const StarInput = ({ value, onChange }: StarInputProps) => {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} من 5`}
          onClick={() => onChange(star)}
          className="rounded-lg p-0.5 transition hover:scale-110"
        >
          <Star
            className={cn(
              'size-8',
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 text-slate-300',
            )}
          />
        </button>
      ))}
    </div>
  );
};
