import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'compact' | 'footer';
}

export const Logo = ({ className, variant = 'compact' }: LogoProps) => (
  <Link
    to="/"
    className={cn(
      'group inline-flex shrink-0 items-center rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
      variant === 'footer'
        ? ''
        : 'gap-2.5 border border-brand-300/65 bg-brand-50/80 p-1.5 pe-3 shadow-sm hover:border-brand-400/80 hover:bg-white dark:border-brand-300/35 dark:bg-white/5 dark:hover:bg-white/10 sm:gap-3',
      className,
    )}
    aria-label="مبدعين - الصفحة الرئيسية"
  >
    {variant === 'footer' ? (
      <img
        src="/images/mabdeen-logo.jpg"
        alt="شعار مبدعين"
        width="2048"
        height="1489"
        loading="lazy"
        decoding="async"
        className="block h-auto w-48 rounded-2xl bg-white shadow-lg transition duration-200 group-hover:scale-[1.02] sm:w-56"
      />
    ) : (
      <>
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sky-200 bg-white p-0.5 shadow-[0_8px_20px_-10px_rgba(0,174,239,0.45)] ring-1 ring-white/70 transition duration-200 group-hover:-translate-y-0.5 sm:size-11">
          <img
            src="/images/mabdeen-icon.jpg"
            alt=""
            width="512"
            height="512"
            loading="eager"
            decoding="async"
            className="size-full rounded-lg object-cover"
          />
        </span>
        <span className="flex min-w-0 flex-col leading-none">
          <span className="bg-linear-to-l from-sky-600 via-cyan-500 to-orange-500 bg-clip-text text-base font-black tracking-tight text-transparent sm:text-lg">
            منصة المبدعين
          </span>
          <span className="mt-1 text-[10px] font-extrabold tracking-[0.24em] text-slate-500">
            مبدعين
          </span>
        </span>
      </>
    )}
  </Link>
);
