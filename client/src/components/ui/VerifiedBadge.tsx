import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  label?: string;
}

export const VerifiedBadge = ({ className, label = 'موثّق' }: VerifiedBadgeProps) => {
  return (
    <span
      title="حساب موثّق من فريق مبدعين"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-100',
        className,
      )}
    >
      <BadgeCheck className="size-3.5 shrink-0" />
      {label}
    </span>
  );
};
