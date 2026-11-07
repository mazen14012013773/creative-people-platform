import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'brand' | 'amber' | 'slate' | 'rose' | 'emerald' | 'sky';

const TONES: Record<BadgeTone, string> = {
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
};

export const Badge = ({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};
