import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  tone?: 'brand' | 'rose';
}

export const Switch = ({
  checked,
  onChange,
  label,
  description,
  disabled,
  tone = 'brand',
}: SwitchProps) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-slate-900">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition duration-200 disabled:pointer-events-none disabled:opacity-60',
          checked
            ? tone === 'rose'
              ? 'border-rose-600 bg-rose-600'
              : 'border-brand-700 bg-brand-700'
            : 'border-slate-300 bg-slate-200',
        )}
      >
        <span
          className={cn(
            'absolute size-5 rounded-full bg-white shadow transition-all duration-200',
            checked ? 'inset-s-[1.65rem]' : 'inset-s-0.5',
          )}
        />
      </button>
    </div>
  );
};
