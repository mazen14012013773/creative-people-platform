import { Code2, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeText } from '@/lib/sanitize';
import type { PortfolioItem } from '@/types';
import { ProtectedImage } from '@/components/common/ProtectedMedia';

const PORTFOLIO_ACCENTS = [
  'from-cyan-100 via-sky-50 to-blue-100 text-sky-700',
  'from-violet-100 via-fuchsia-50 to-pink-100 text-violet-700',
  'from-emerald-100 via-lime-50 to-teal-100 text-emerald-700',
  'from-amber-100 via-orange-50 to-rose-100 text-orange-700',
];

export const PortfolioCard = ({
  item,
  onOpen,
}: {
  item: PortfolioItem;
  onOpen: (item: PortfolioItem) => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;
  const accent = Array.from(item.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % PORTFOLIO_ACCENTS.length;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      onContextMenu={(event) => event.preventDefault()}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-start shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
    >
      <div className={cn('relative aspect-4/3 overflow-hidden bg-linear-to-br', PORTFOLIO_ACCENTS[accent])}>
        {showImage ? (
          <ProtectedImage
            containerClassName="size-full"
            src={item.imageUrl ?? undefined}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <FolderOpen className="size-10" />
            <span className="text-xs font-bold">مشروع</span>
          </div>
        )}
        {item.projectUrl ? (
          <span className="absolute inset-e-2 top-2 flex size-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm">
            <Code2 className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className={cn('line-clamp-1 text-sm font-extrabold text-slate-900')}>
          {item.title}
        </h3>
        {item.description ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
          {sanitizeText(item.description)}
          </p>
        ) : null}
      </div>
    </button>
  );
};
