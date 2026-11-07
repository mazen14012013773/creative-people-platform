import { useEffect, useState } from 'react';
import { ImageOff, Link2, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProtectedImage, ProtectedVideo } from './ProtectedMedia';

type MediaKind = 'image' | 'video' | 'embed' | 'unsupported' | 'invalid';
type ParsedMedia = { kind: MediaKind; source: string; host: string; ratio?: number };
export type EmbedDetails = { source: string; host: string; ratio?: number };

const isHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export const formatEmbedUrl = (url: URL): EmbedDetails | null => {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be' || isHost(host, 'youtube.com') || isHost(host, 'youtube-nocookie.com')) {
    const id = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? url.searchParams.get('v');
    return id && /^[\w-]{6,}$/.test(id)
      ? { source: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`, host: 'YouTube', ratio: 16 / 9 }
      : null;
  }

  if (isHost(host, 'tiktok.com')) {
    const id = url.pathname.match(/\/video\/(\d+)/)?.[1];
    return id
      ? { source: `https://www.tiktok.com/player/v1/${id}?controls=1&description=1&music_info=1`, host: 'TikTok', ratio: 9 / 16 }
      : null;
  }

  if (isHost(host, 'instagram.com')) {
    const match = url.pathname.match(/^\/(?:share\/)?(reel|reels|p)\/([^/]+)/);
    if (!match) return null;
    const type = match[1] === 'reels' ? 'reel' : match[1];
    return { source: `https://www.instagram.com/${type}/${encodeURIComponent(match[2])}/embed/`, host: 'Instagram', ratio: type === 'reel' ? 9 / 16 : 4 / 5 };
  }

  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    return id
      ? { source: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`, host: 'Google Drive', ratio: 16 / 9 }
      : null;
  }

  return null;
};

const parseMediaUrl = (value: string): ParsedMedia => {
  try {
    const url = new URL(value.trim(), window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return { kind: 'invalid', source: '', host: '' };
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = decodeURIComponent(url.pathname).toLowerCase();
    if (/\.(?:jpe?g|png|gif|webp|avif|bmp)$/.test(path)) return { kind: 'image', source: url.href, host };
    if (/\.(?:mp4|webm|ogg|mov|m4v)$/.test(path)) return { kind: 'video', source: url.href, host };
    const embed = formatEmbedUrl(url);
    return embed ? { kind: 'embed', ...embed } : { kind: 'unsupported', source: '', host };
  } catch {
    return { kind: 'invalid', source: '', host: '' };
  }
};

export interface MediaViewerProps {
  url?: string | null;
  title?: string;
  className?: string;
  mediaClassName?: string;
  aspect?: 'video' | 'square' | 'cover';
  compact?: boolean;
  onImageClick?: () => void;
}

const GUIDANCE = 'الروابط المدعومة: YouTube وTikTok وInstagram وGoogle Drive.';

export const MediaViewer = ({ url, title, className, mediaClassName, aspect = 'video', compact = false, onImageClick }: MediaViewerProps) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [videoRatio, setVideoRatio] = useState<number | null>(null);
  useEffect(() => { setFailed(false); setLoaded(false); setVideoRatio(null); }, [url]);

  if (!url) return null;
  const media = parseMediaUrl(url);
  const aspectClass = aspect === 'square' ? 'aspect-square' : aspect === 'cover' ? 'aspect-4/3' : 'aspect-video';
  const shell = cn('relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40', className);
  const mediaClass = cn('size-full object-cover transition duration-500 group-hover:scale-[1.02]', mediaClassName);

  if (media.kind === 'image' && !failed) return <div className={cn(shell, 'group', aspectClass)} onContextMenu={(event) => event.preventDefault()}>{onImageClick ? <button type="button" onClick={onImageClick} className="absolute inset-0 z-[1] size-full cursor-zoom-in" aria-label={`فتح الصورة بالحجم الكامل${title ? `: ${title}` : ''}`}><ProtectedImage containerClassName="size-full" src={media.source} alt={title ?? ''} loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={mediaClass} /></button> : <ProtectedImage containerClassName="size-full" src={media.source} alt={title ?? ''} loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={mediaClass} />}{!loaded && <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-cyan-50"><LoaderCircle className="size-6 animate-spin text-cyan-600" /></div>}</div>;
  if (media.kind === 'video' && !failed) return <div className={cn(shell, videoRatio ? 'max-h-[78dvh] max-w-full' : aspectClass)} style={videoRatio ? { width: `min(100%, calc(78dvh * ${videoRatio}))`, aspectRatio: String(videoRatio) } : undefined} onContextMenu={(event) => event.preventDefault()}><ProtectedVideo containerClassName="size-full" src={media.source} controls playsInline preload="metadata" onLoadedMetadata={(event) => { const video = event.currentTarget; if (video.videoWidth && video.videoHeight) setVideoRatio(video.videoWidth / video.videoHeight); }} onLoadedData={() => setLoaded(true)} onError={() => setFailed(true)} className="size-full bg-slate-950 object-contain" />{!loaded && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/5"><LoaderCircle className="size-6 animate-spin text-cyan-600" /></div>}</div>;
  if (media.kind === 'embed' && !failed) return <div className={cn(shell, !media.ratio && aspectClass, media.ratio && 'max-h-[78dvh] max-w-full')} style={media.ratio ? { width: `min(100%, calc(78dvh * ${media.ratio}))`, aspectRatio: String(media.ratio) } : undefined}><iframe src={media.source} title={title || `معاينة ${media.host}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share" onLoad={() => setLoaded(true)} className="size-full rounded-3xl border-0 bg-slate-100" />{!loaded && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50"><LoaderCircle className="size-6 animate-spin text-cyan-600" /></div>}</div>;

  const invalid = media.kind === 'invalid';
  const label = invalid ? 'تعذر قراءة الرابط' : title || media.host || 'مصدر غير مدعوم';
  return <div className={cn(shell, 'flex min-h-32 flex-col items-center justify-center gap-2 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5 text-center', compact && 'min-h-24 p-3')} role="status">
    <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">{invalid ? <ImageOff className="size-5" /> : <Link2 className="size-5" />}</span>
    <span className="text-sm font-extrabold text-slate-800">{label}</span>
    <span className="text-xs leading-5 text-slate-500">{invalid ? 'تحقق من الرابط وحاول مرة أخرى.' : GUIDANCE}</span>
  </div>;
};

export default MediaViewer;
