import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) => {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center'
          : 'flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center'
      }
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};
