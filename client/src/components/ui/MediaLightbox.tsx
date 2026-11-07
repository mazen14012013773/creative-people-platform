import { ChevronLeft, ChevronRight, Link2, Play, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ServiceMedia } from '@/types';
import { ExternalMediaCard } from './ExternalMediaCard';
import { MediaViewer } from '@/components/common/MediaViewer';

interface MediaLightboxProps {
  items: ServiceMedia[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

export const MediaLightbox = ({ items, initialIndex, title, onClose }: MediaLightboxProps) => {
  const [index, setIndex] = useState(initialIndex);
  const [unpreviewable, setUnpreviewable] = useState<Set<string>>(() => new Set());
  const current = items[index];
  const markUnpreviewable = (url: string) => {
    setUnpreviewable((previous) => new Set(previous).add(url));
  };

  const move = useCallback((direction: -1 | 1) => {
    setIndex((previous) => (previous + direction + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (items.length > 1 && event.key === 'ArrowRight') move(-1);
      if (items.length > 1 && event.key === 'ArrowLeft') move(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [items.length, move, onClose]);

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      dir="rtl"
    >
      <div className="relative flex h-full max-h-[92vh] w-full max-w-[96vw] flex-col items-center justify-center gap-3">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 text-white">
          <p className="truncate text-sm font-bold drop-shadow">{title}</p>
          <div className="flex shrink-0 items-center gap-3">
            {items.length > 1 ? <span className="text-xs font-semibold text-white/75">{index + 1} / {items.length}</span> : null}
            <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg transition hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="إغلاق المعاينة"><X className="size-5" /></button>
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden pt-12 pb-3">
          {unpreviewable.has(current.url) ? (
            <ExternalMediaCard url={current.url} className="max-h-[80vh] max-w-[90vw] rounded-3xl" />
          ) : (
            <MediaViewer url={current.url} title={`${title} — ${index + 1}`} aspect="video" className="max-h-[80vh] max-w-[90vw] border-0 bg-black shadow-none" mediaClassName="object-contain" />
          )}
        </div>
        {items.length > 1 ? <>
          <button type="button" onClick={() => move(-1)} className="absolute inset-s-2 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:inset-s-4" aria-label="الوسيط السابق"><ChevronRight className="size-6" /></button>
          <button type="button" onClick={() => move(1)} className="absolute inset-e-2 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:inset-e-4" aria-label="الوسيط التالي"><ChevronLeft className="size-6" /></button>
          <div className="flex max-w-[90vw] gap-2 overflow-x-auto rounded-2xl bg-black/35 p-1.5 pb-2 backdrop-blur-sm">
            {items.map((item, itemIndex) => <button key={`${item.url}-${itemIndex}`} type="button" onClick={() => setIndex(itemIndex)} className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-gradient-to-br from-cyan-50 to-violet-100 shadow transition hover:scale-105 ${itemIndex === index ? 'border-cyan-300 ring-2 ring-orange-400/70' : 'border-white/50 opacity-80 hover:opacity-100'}`} aria-label={`عرض الوسيط ${itemIndex + 1}`}>
              {item.type === 'link' || unpreviewable.has(item.url) ? <span className="flex size-full flex-col items-center justify-center gap-1 text-violet-700"><Link2 className="size-5" /><span className="max-w-full truncate px-1 text-[8px] font-bold" dir="ltr">{(() => { try { return new URL(item.url).hostname.replace(/^www\./, ''); } catch { return 'رابط'; } })()}</span></span> : item.type === 'video' && /\.(?:mp4|webm|ogg|mov|m4v)(?:[?#]|$)/i.test(item.url) ? <><video src={item.url} muted preload="metadata" onError={() => markUnpreviewable(item.url)} className="size-full object-contain" /><span className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="size-5 fill-white text-white drop-shadow" /></span></> : item.type === 'video' ? <span className="flex size-full flex-col items-center justify-center gap-1 text-violet-700"><Play className="size-5 fill-current"/><span className="max-w-full truncate px-1 text-[8px] font-bold" dir="ltr">{(() => { try { return new URL(item.url).hostname.replace(/^www\./, ''); } catch { return 'فيديو'; } })()}</span></span> : <img src={item.url} alt={`معاينة ${itemIndex + 1}`} onError={() => markUnpreviewable(item.url)} className="size-full bg-white object-contain" />}
            </button>)}
          </div>
        </> : null}
      </div>
    </div>,
    document.body,
  );
};
