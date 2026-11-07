import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <Loader2
      className={cn('size-5 animate-spin text-brand-600', className)}
      aria-hidden="true"
    />
  );
};

export const PageLoader = ({ label = 'جارٍ التحميل...' }: { label?: string }) => {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="size-8" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
};

export const InlineLoader = ({ label }: { label?: string }) => {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner className="size-4 text-current" />
      {label ? <span>{label}</span> : null}
    </span>
  );
};
