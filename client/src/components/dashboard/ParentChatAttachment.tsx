import { useEffect, useState } from 'react';
import { Download, Eye, FileText, LoaderCircle, Paperclip } from 'lucide-react';
import { ImageLightboxModal } from '@/components/community/ImageLightboxModal';
import { parentApi } from '@/services/parent.service';

export const ParentChatAttachment = ({ childId, messageId, name, mimeType }: { childId: string; messageId: string; name: string; mimeType: string | null }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const kind = mimeType?.split('/')[0];

  useEffect(() => {
    let mounted = true;
    let objectUrl = '';
    setLoading(true);
    setError(false);
    parentApi.childMessageAttachment(childId, messageId).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (mounted) setUrl(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    }).catch(() => { if (mounted) setError(true); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [childId, messageId]);

  return <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 text-slate-800 shadow-sm">
    {loading ? <div className="flex min-h-24 items-center justify-center gap-2 px-4 py-6 text-xs text-slate-500"><LoaderCircle className="size-4 animate-spin"/>جارٍ تحميل المرفق…</div> : null}
    {error ? <div className="flex items-center gap-2 p-3 text-xs text-rose-700"><Paperclip className="size-4 shrink-0"/>تعذر عرض المرفق: <span className="truncate">{name}</span></div> : null}
    {url && kind === 'image' ? <><button type="button" onClick={() => setImageOpen(true)} className="group relative block w-full cursor-zoom-in bg-slate-100 text-start" aria-label={`فتح الصورة ${name} بالحجم الكامل`}><img src={url} alt={name} className="max-h-[420px] w-full object-contain"/><span className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-2 text-xs font-bold text-white opacity-100 backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100"><Eye className="size-4"/>عرض بالحجم الكامل</span></button><div className="flex items-center justify-between gap-3 px-3 py-2"><span className="min-w-0 truncate text-xs font-bold text-slate-600">{name}</span><a href={url} download={name} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-800"><Download className="size-3.5"/>تنزيل</a></div>{imageOpen ? <ImageLightboxModal src={url} title={name} onClose={() => setImageOpen(false)}/> : null}</> : null}
    {url && kind === 'video' ? <><video src={url} controls playsInline preload="metadata" className="max-h-[440px] w-full bg-black object-contain"/><div className="flex items-center justify-between gap-3 px-3 py-2"><span className="min-w-0 truncate text-xs font-bold text-slate-600">{name}</span><a href={url} download={name} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-800"><Download className="size-3.5"/>تنزيل</a></div></> : null}
    {url && kind !== 'image' && kind !== 'video' ? <div className="flex items-center gap-3 p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileText className="size-5"/></span><span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{name}</span><a href={url} download={name} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-2 text-xs font-bold text-cyan-800"><Download className="size-3.5"/>تنزيل</a></div> : null}
  </div>;
};
