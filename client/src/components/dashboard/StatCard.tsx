import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatTone = 'brand' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';

const TONES: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};
const ACCENT_BARS: Record<StatTone, string> = {
  brand: 'from-cyan-400 to-sky-200',
  emerald: 'from-emerald-400 to-lime-200',
  amber: 'from-orange-400 to-amber-200',
  sky: 'from-sky-400 to-blue-200',
  rose: 'from-rose-400 to-pink-200',
  slate: 'from-violet-400 to-fuchsia-200',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: StatCardProps) => {
  return (
    <div className="group card relative overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-soft sm:p-5">
      <div className={`absolute inset-x-5 top-0 h-1 rounded-b-full bg-linear-to-l ${ACCENT_BARS[tone]}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1',
            TONES[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
};
