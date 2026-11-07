import { ExternalLink, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExternalMediaCardProps {
  url: string;
  title?: string;
  className?: string;
}

/** External references are links, not pretend media previews. */
export const ExternalMediaCard = ({ url, title, className }: ExternalMediaCardProps) => {
  let safeUrl: string | null = null;
  let host = '';
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
      safeUrl = parsed.href;
      host = parsed.hostname.replace(/^www\./i, '');
    }
  } catch { /* Invalid old values remain inert. */ }

  const content = <span className={cn('flex h-full min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 text-center', className)}>
    <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"><Link2 className="size-5" /></span>
    <span className="flex max-w-full items-center gap-1 text-sm font-extrabold text-slate-900"><span className="truncate">{title || host || 'رابط خارجي'}</span>{safeUrl ? <ExternalLink className="size-3.5 shrink-0" /> : null}</span>
    {host ? <span className="max-w-full truncate text-xs text-slate-500" dir="ltr">{host}</span> : <span className="text-xs text-slate-500">رابط غير صالح</span>}
    {safeUrl ? <span className="text-[11px] font-bold text-cyan-700">فتح الرابط في تبويب جديد</span> : null}
  </span>;

  return safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="block min-w-0" aria-label={`فتح ${title || host} في تبويب جديد`}>{content}</a> : <div className="min-w-0">{content}</div>;
};
