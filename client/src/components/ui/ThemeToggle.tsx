import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  withLabel?: boolean;
}

export const ThemeToggle = ({ className, withLabel = false }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800',
        withLabel ? 'px-3 py-2 text-xs font-extrabold' : 'size-10',
        className,
      )}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {withLabel ? <span>{isDark ? 'وضع فاتح' : 'وضع داكن'}</span> : null}
    </button>
  );
};
