import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react';
import { Archive, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, File, FileCode2, FileDown, FileImage, FileVideo2, Maximize2, Minimize2, Monitor, Move, Music, Smartphone, Tablet, X } from 'lucide-react';
import { ordersApi, type OrderDelivery, type OrderStatus } from '@/services/orders.service';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { extractDeliveryUrl, resolveDeliveryLinkPreview } from '@/lib/delivery-link';

const block = (event: SyntheticEvent) => event.preventDefault();
const toolbarShell = 'absolute start-3 top-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-950/85 p-1.5 shadow-2xl shadow-slate-950/50 backdrop-blur';
const toolbarButton = 'grid size-9 place-items-center rounded-xl text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50';
const extensionOf = (name: string) => name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
const textExtensions = new Set(['txt', 'md', 'json', 'js', 'ts', 'py', 'html', 'css', 'obj', 'gltf', 'ai']);
const highlightedLine = (line: string) => line.split(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\/\/.*|\b(?:const|let|var|function|return|if|else|class|import|export|from|async|await|true|false|null|def|for|while|new|this)\b|\b\d+(?:\.\d+)?\b)/g).filter(Boolean).map((part, index) => {
  const color = part.startsWith('//') ? 'text-slate-500' : /^['"`]/.test(part) ? 'text-emerald-300' : /^(const|let|var|function|return|if|else|class|import|export|from|async|await|true|false|null|def|for|while|new|this)$/.test(part) ? 'text-violet-300' : /^\d/.test(part) ? 'text-amber-300' : '';
  return <span key={index} className={color}>{part}</span>;
});

const GalleryThumbnail = ({ orderId, file, active, onClick }: { orderId: string; file: OrderDelivery; active: boolean; onClick: () => void }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let currentUrl = '';
    let activeRequest = true;
    void ordersApi.preview(orderId, file.id).then((blob) => {
      if (!activeRequest) return;
      currentUrl = URL.createObjectURL(blob);
      setUrl(currentUrl);
    }).catch(() => undefined);
    return () => { activeRequest = false; if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [file.id, orderId]);
  const ext = extensionOf(file.originalFilename);
  const Icon = file.mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? FileImage
    : file.mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext) ? FileVideo2
      : file.mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext) ? Music
        : ext === 'url' ? ExternalLink : textExtensions.has(ext) ? FileCode2 : File;
  return <button type="button" onClick={onClick} title={file.originalFilename} aria-label={`فتح ${file.originalFilename}`} aria-current={active ? 'true' : undefined} className={`relative size-14 shrink-0 overflow-hidden rounded-xl border transition sm:size-16 ${active ? 'border-cyan-300 ring-2 ring-cyan-300/40' : 'border-white/10 opacity-70 hover:opacity-100'}`}>
    {url && Icon === FileImage ? <img src={url} alt="" className="size-full bg-slate-800 object-cover"/> : url && Icon === FileVideo2 ? <video src={url} muted preload="metadata" className="size-full bg-slate-800 object-cover"/> : <span className="grid size-full place-items-center bg-slate-800 text-cyan-200"><Icon className="size-5"/></span>}
  </button>;
};

export const ProtectedMediaViewer = ({ orderId, file, files, status, onSelect, onDownloadAll, downloadingArchive, onClose }: {
  orderId: string; file: OrderDelivery; files: OrderDelivery[]; status: OrderStatus;
  onSelect: (file: OrderDelivery) => void; onDownloadAll: () => void; downloadingArchive: boolean; onClose: () => void;
}) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [deviceView, setDeviceView] = useState<'responsive' | 'desktop' | 'tablet' | 'mobile'>('responsive');
  const [fullScreen, setFullScreen] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [confirmExternal, setConfirmExternal] = useState(false);
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const currentIndex = Math.max(0, files.findIndex((item) => item.id === file.id));
  const isDeliveryLink = file.mimeType === 'text/uri-list';
  const goTo = (index: number) => { if (files.length) onSelect(files[(index + files.length) % files.length]); };
  const goNext = () => goTo(currentIndex + 1);
  const goPrevious = () => goTo(currentIndex - 1);
  const beginToolbarDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: toolbarOffset.x, offsetY: toolbarOffset.y };
  };
  const moveToolbar = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (start?.pointerId === event.pointerId) setToolbarOffset({ x: start.offsetX + event.clientX - start.x, y: start.offsetY + event.clientY - start.y });
  };
  const stopToolbarDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
  };
  const toolbarStyle = { transform: `translate(${toolbarOffset.x}px, calc(-50% + ${toolbarOffset.y}px))` };

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl(''); setText(null); setError('');
    if (isDeliveryLink && !['DELIVERED', 'REVISION_REQUESTED', 'AWAITING_REVIEW', 'COMPLETED'].includes(status)) {
      setError('تتوفر معاينة الرابط بعد تسليم الملفات.');
      return () => { active = false; };
    }
    void ordersApi.preview(orderId, file.id).then(async (blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      if (textExtensions.has(extensionOf(file.originalFilename)) || file.mimeType === 'text/plain' || file.mimeType === 'text/uri-list' || file.mimeType === 'application/json') setText(await blob.text());
    }).catch(() => { if (active) setError('تعذرت معاينة هذا الملف في المتصفح.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [orderId, file.id, file.mimeType, file.originalFilename, status]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goNext(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); goPrevious(); }
      if ((event.ctrlKey || event.metaKey) && ['s', 'c', 'u'].includes(event.key.toLowerCase())) event.preventDefault();
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j'].includes(event.key.toLowerCase()))) event.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, files, onClose]);

  const name = file.originalFilename.toLowerCase();
  const extension = extensionOf(name);
  const deliveryUrl = isDeliveryLink && text ? extractDeliveryUrl(text) : null;
  const linkPreview = isDeliveryLink && text ? resolveDeliveryLinkPreview(text.trim()) : null;
  const linkPreviewVisible = Boolean(isDeliveryLink && linkPreview && ['DELIVERED', 'REVISION_REQUESTED', 'AWAITING_REVIEW', 'COMPLETED'].includes(status));
  const image = file.mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const video = file.mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(extension);
  const audio = file.mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(extension);
  const pdf = file.mimeType === 'application/pdf' || extension === 'pdf';
  const download = async () => { const blob = await ordersApi.download(orderId, file.id); const link = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = link; anchor.download = file.originalFilename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(link), 1000); };
  const downloadLinkText = () => {
    if (!deliveryUrl || status !== 'COMPLETED') return;
    const textUrl = URL.createObjectURL(new Blob([`${deliveryUrl}\n`], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = textUrl; anchor.download = 'delivery-link.txt'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(textUrl), 1000);
  };
  const copyLink = async () => {
    if (!deliveryUrl || status !== 'COMPLETED') return;
    try { await navigator.clipboard.writeText(deliveryUrl); setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 1800); }
    catch { setError('تعذر نسخ الرابط.'); }
  };

  return <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 ${fullScreen ? '' : 'p-2 sm:p-5'}`} onMouseDown={onClose} onContextMenu={block}>
    <section role="dialog" aria-modal="true" aria-label={file.originalFilename} onMouseDown={(event) => event.stopPropagation()} className={`relative flex w-full flex-col overflow-hidden border border-white/10 bg-slate-950 text-white shadow-2xl ${fullScreen ? 'h-dvh max-w-none rounded-none' : 'h-[min(96vh,960px)] max-w-7xl rounded-3xl'}`}>
      <button type="button" onClick={onClose} aria-label="إغلاق المعاينة" title="إغلاق" className="absolute end-3 top-3 z-50 grid size-9 place-items-center rounded-xl text-white/90 hover:bg-slate-950/20"><X className="size-5"/></button>
      {controlsCollapsed ? <button type="button" onClick={() => setControlsCollapsed(false)} aria-label="إظهار شريط الأدوات" title="إظهار الأدوات" style={toolbarStyle} className="absolute start-3 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-2xl border border-white/15 bg-slate-950/85 text-white shadow-2xl shadow-slate-950/50 backdrop-blur transition hover:bg-slate-800"><ChevronRight className="size-5"/></button> : null}
      {!linkPreviewVisible && !controlsCollapsed ? <div className={`${toolbarShell} z-40 flex flex-col gap-1`} style={toolbarStyle} onPointerMove={moveToolbar} onPointerUp={stopToolbarDrag} onPointerCancel={stopToolbarDrag}><button type="button" onPointerDown={beginToolbarDrag} aria-label="تحريك شريط الأزرار" title="اسحب لتحريك الشريط" className={`${toolbarButton} touch-none cursor-grab active:cursor-grabbing`}><Move className="size-4"/></button><button type="button" onClick={() => setControlsCollapsed(true)} aria-label="طي شريط الأزرار" title="إخفاء الأدوات" className={toolbarButton}><ChevronLeft className="size-4"/></button><button type="button" onClick={() => setFullScreen((value) => !value)} aria-label={fullScreen ? 'استعادة حجم المعاينة' : 'ملء الشاشة'} title={fullScreen ? 'استعادة الحجم' : 'ملء الشاشة'} className={toolbarButton}>{fullScreen ? <Minimize2 className="size-4"/> : <Maximize2 className="size-4"/>}</button>{status === 'COMPLETED' && !isDeliveryLink ? <><span className="mx-1 my-1 h-px bg-white/15"/><button type="button" disabled={downloadingArchive} onClick={onDownloadAll} aria-label="تنزيل جميع الملفات" title="تنزيل جميع الملفات ZIP" className={toolbarButton}><Archive className="size-4"/></button><button type="button" onClick={() => void download()} aria-label="تنزيل الملف الأصلي" title="تنزيل الملف الأصلي" className={toolbarButton}><FileDown className="size-4"/></button></> : null}</div> : null}
      <div className="grid min-h-0 flex-1 overflow-hidden" onContextMenu={block} onDragStart={block}>
        <div className="relative flex min-h-0 items-center justify-center overflow-auto bg-slate-900">
          {!url && !error ? <span className="text-sm text-slate-300">جارٍ تحميل المعاينة…</span> : null}
          {error ? <span className="px-6 text-center text-sm text-rose-200">{error}</span> : null}
          {files.length > 1 ? <><button type="button" onClick={goPrevious} aria-label="الملف السابق" className="absolute start-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white shadow-lg backdrop-blur hover:bg-brand-700"><ChevronRight className="size-6"/></button><button type="button" onClick={goNext} aria-label="الملف التالي" className="absolute end-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white shadow-lg backdrop-blur hover:bg-brand-700"><ChevronLeft className="size-6"/></button></> : null}
          {url && image ? <img src={url} alt={file.originalFilename} draggable={false} onDragStart={block} className="max-h-full max-w-full select-none object-contain"/> : null}
          {url && video ? <div className="relative max-h-full max-w-full"><video key={file.id} src={url} controls playsInline controlsList="nodownload noplaybackrate" disablePictureInPicture onContextMenu={block} onEnded={goNext} className="max-h-full max-w-full"/><div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-8"/></div> : null}
          {url && audio ? <audio key={file.id} src={url} controls controlsList="nodownload" onContextMenu={block} onEnded={goNext} className="w-[min(90%,32rem)]"/> : null}
          {url && pdf ? <iframe src={url} title={file.originalFilename} className="h-full w-full border-0" sandbox="allow-scripts"/> : null}
          {url && extension === 'html' && text !== null ? <iframe title={file.originalFilename} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-full w-full border-0 bg-white" srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width,initial-scale=1">${text}`}/> : null}
          {isDeliveryLink && linkPreview && ['DELIVERED', 'REVISION_REQUESTED', 'AWAITING_REVIEW', 'COMPLETED'].includes(status) ? <div className="relative flex size-full min-h-0 items-center justify-center overflow-auto bg-slate-950"><iframe title={`معاينة ${file.originalFilename}`} src={linkPreview.embedUrl} sandbox="allow-scripts allow-same-origin" referrerPolicy={linkPreview.kind === 'website' ? 'no-referrer' : 'strict-origin-when-cross-origin'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={deviceView === 'responsive' ? undefined : deviceView === 'desktop' ? { width: 'min(100%, 1280px)', height: 'min(100%, 800px)' } : deviceView === 'tablet' ? { width: 'min(100%, 768px)', height: 'min(100%, 1024px)' } : { width: 'min(100%, 390px)', height: 'min(100%, 844px)' }} className={`shrink-0 bg-white transition-[width,height,border-radius] ${deviceView === 'responsive' ? 'size-full border-0' : `border border-white/10 shadow-xl ${deviceView === 'mobile' ? 'rounded-2xl' : 'rounded-lg'}`}`} onContextMenu={block}/><div className={`${toolbarShell} z-20 flex flex-col gap-1`} style={{ ...toolbarStyle, display: controlsCollapsed ? 'none' : undefined }} onPointerMove={moveToolbar} onPointerUp={stopToolbarDrag} onPointerCancel={stopToolbarDrag}><button type="button" onPointerDown={beginToolbarDrag} aria-label="تحريك شريط الأزرار" title="اسحب لتحريك الشريط" className={`${toolbarButton} touch-none cursor-grab active:cursor-grabbing`}><Move className="size-4"/></button><button type="button" onClick={() => setControlsCollapsed(true)} aria-label="طي شريط الأزرار" title="إخفاء الأدوات" className={toolbarButton}><ChevronLeft className="size-4"/></button>{linkPreview.kind === 'website' ? <>{([{ key: 'responsive', Icon: Monitor, label: 'تلقائي' }, { key: 'desktop', Icon: Monitor, label: 'كمبيوتر' }, { key: 'tablet', Icon: Tablet, label: 'تابلت' }, { key: 'mobile', Icon: Smartphone, label: 'هاتف' }] as const).map(({ key, Icon, label }) => <button key={key} type="button" onClick={() => setDeviceView(key)} aria-pressed={deviceView === key} aria-label={label} title={label} className={`${toolbarButton} ${deviceView === key ? 'bg-cyan-500 hover:bg-cyan-400' : ''}`}><Icon className="size-4"/></button>)}<span className="mx-1 my-1 h-px bg-white/15"/> </> : null}{status === 'COMPLETED' ? isDeliveryLink ? <><button type="button" onClick={() => void copyLink()} aria-label="نسخ الرابط" title={linkCopied ? 'تم نسخ الرابط' : 'نسخ الرابط'} className={toolbarButton}>{linkCopied ? <Check className="size-4 text-emerald-300"/> : <Copy className="size-4"/>}</button><button type="button" onClick={downloadLinkText} aria-label="تنزيل الرابط كملف نصي" title="تنزيل الرابط TXT" className={toolbarButton}><FileDown className="size-4"/></button></> : <><button type="button" disabled={downloadingArchive} onClick={onDownloadAll} aria-label="تنزيل جميع الملفات" title="تنزيل جميع الملفات ZIP" className={toolbarButton}><Archive className="size-4"/></button><button type="button" onClick={() => void download()} aria-label="تنزيل الملف الأصلي" title="تنزيل الملف الأصلي" className={toolbarButton}><FileDown className="size-4"/></button></> : null}<span className="mx-1 my-1 h-px bg-white/15"/><button type="button" onClick={() => setFullScreen((value) => !value)} aria-label={fullScreen ? 'استعادة حجم المعاينة' : 'ملء الشاشة'} title={fullScreen ? 'استعادة الحجم' : 'ملء الشاشة'} className={toolbarButton}>{fullScreen ? <Minimize2 className="size-4"/> : <Maximize2 className="size-4"/>}</button></div>{status === 'COMPLETED' ? <a href={linkPreview.externalUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (linkPreview.kind === 'website') { event.preventDefault(); setConfirmExternal(true); } }} className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><ExternalLink className="size-3.5"/>فتح خارج المعاينة</a> : null}
                    {linkPreview.kind === 'website' ? <p className="pointer-events-none absolute inset-x-3 top-3 z-30 mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-xl border border-amber-300/30 bg-slate-950/85 px-3 py-2 text-center text-[11px] font-semibold leading-5 text-amber-200 shadow-lg backdrop-blur">تحذير: هذا الرابط خارجي وغير مستضاف على منصة مبدعين. افتحه فقط إن كنت تثق بمصدره، ولا تُدخل بياناتك الحساسة هناك.</p> : null}</div> : null}
          {isDeliveryLink && text !== null && !linkPreview ? <div className="max-w-md px-8 text-center text-rose-200">الرابط غير صالح أو غير مسموح. نقبل روابط YouTube وGoogle Drive أو روابط مواقع آمنة عبر HTTPS فقط.</div> : null}
          {url && !isDeliveryLink && !image && !video && !audio && !pdf && extension !== 'html' && text !== null ? <pre className="h-full w-full overflow-auto p-5 text-start font-mono text-sm leading-6 text-slate-100 select-none" onCopy={block} onCut={block}><code>{text.split('\n').map((line, index) => <span key={index} className="grid grid-cols-[3rem_1fr]"><span className="pe-3 text-end text-slate-500">{index + 1}</span><span className="whitespace-pre-wrap break-all">{line ? highlightedLine(line) : ' '}</span></span>)}</code></pre> : null}
          {url && !isDeliveryLink && !image && !video && !audio && !pdf && text === null ? <div className="max-w-md px-8 text-center text-slate-300"><File className="mx-auto mb-2 size-8"/><p className="font-bold">لا تتوفر معاينة مباشرة لهذا النوع من الملفات في المتصفح.</p><p className="mt-2 text-xs leading-5 text-slate-400">يمكنك استعراض معلوماته هنا، ويظل تنزيل الملف الأصلي متاحاً وفق صلاحيات الطلب.</p></div> : null}
        </div>
      </div>
      {files.length > 1 ? <footer className="flex items-center gap-2 border-t border-white/10 bg-slate-950 px-3 py-2.5 sm:px-5"><span className="me-1 hidden shrink-0 text-[10px] font-bold text-slate-400 sm:block">الملفات</span><div className="flex min-w-0 gap-2 overflow-x-auto py-1">{files.map((item, index) => <GalleryThumbnail key={item.id} orderId={orderId} file={item} active={item.id === file.id} onClick={() => goTo(index)}/>)}</div><span className="ms-auto hidden shrink-0 text-[10px] text-slate-500 lg:block">← → للتنقل · Esc للإغلاق</span></footer> : null}
    </section>
    <ConfirmDialog
      open={confirmExternal}
      title="فتح رابط خارجي"
      description="هذا رابط خارجي غير مستضاف على منصة مبدعين، وسيُفتح في نافذة جديدة. افتحه فقط إن كنت تثق بمصدره، ولا تُدخل بياناتك الحساسة هناك."
      confirmLabel="فتح الرابط"
      cancelLabel="إلغاء"
      tone="primary"
      onCancel={() => setConfirmExternal(false)}
      onConfirm={() => { setConfirmExternal(false); window.open(linkPreview?.externalUrl ?? '', '_blank', 'noopener,noreferrer'); }}
    />
  </div>;
};
