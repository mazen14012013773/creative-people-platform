import { useEffect, useMemo, useState } from 'react';
import { Archive, ChevronLeft, Copy, File, FileCode2, FileDown, FileImage, FileVideo2, Folder, FolderOpen, Grid2X2, List, Music, Search, ShieldCheck } from 'lucide-react';
import { ordersApi, type OrderDelivery, type OrderStatus } from '@/services/orders.service';
import { useToast } from '@/context/ToastContext';
import { extractDeliveryUrl } from '@/lib/delivery-link';
import { ProtectedMediaViewer } from './ProtectedMediaViewer';

const folderOf = (path: string) => path.includes('/') ? path.split('/').slice(0, -1).join('/') : '';
const extensionOf = (name: string) => name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'بدون امتداد';
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const isPreviewableImage = (file: OrderDelivery) => file.mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extensionOf(file.originalFilename));
const isPreviewableVideo = (file: OrderDelivery) => file.mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(extensionOf(file.originalFilename));
const isPreviewableAudio = (file: OrderDelivery) => file.mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(extensionOf(file.originalFilename));

const PreviewThumbnail = ({ orderId, file }: { orderId: string; file: OrderDelivery }) => {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isPreviewableImage(file) && !isPreviewableVideo(file)) return undefined;
    let active = true;
    let objectUrl = '';
    void ordersApi.preview(orderId, file.id).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.mimeType, file.originalFilename, orderId]);

  if (url && isPreviewableImage(file)) return <img src={url} alt="" loading="lazy" draggable={false} className="size-full object-cover"/>;
  if (url && isPreviewableVideo(file)) return <video src={url} muted playsInline preload="metadata" className="size-full object-cover"/>;
  const Icon = isPreviewableImage(file) ? FileImage : isPreviewableVideo(file) ? FileVideo2 : isPreviewableAudio(file) ? Music : ['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'md', 'txt', 'obj', 'gltf', 'ai'].includes(extensionOf(file.originalFilename)) ? FileCode2 : File;
  return <div className={`grid size-full place-items-center ${failed ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-700'}`}><Icon className="size-7"/></div>;
};

export const VaultFileExplorer = ({ orderId, files, status }: { orderId: string; files: OrderDelivery[]; status: OrderStatus }) => {
  const [folder, setFolder] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OrderDelivery | null>(null);
  const [viewing, setViewing] = useState<OrderDelivery | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [downloadingArchive, setDownloadingArchive] = useState(false);
  const [linkActionPending, setLinkActionPending] = useState(false);
  const toast = useToast();
  const canDownload = status === 'COMPLETED';
  const linkFiles = files.filter((file) => file.mimeType === 'text/uri-list').sort((a, b) => b.versionNumber - a.versionNumber);
  const downloadableFiles = files.filter((file) => file.mimeType !== 'text/uri-list');
  const activeLink = selected?.mimeType === 'text/uri-list' ? selected : linkFiles[0];
  const getLink = async () => {
    if (!activeLink || !canDownload) return '';
    const blob = await ordersApi.preview(orderId, activeLink.id);
    const link = extractDeliveryUrl(await blob.text());
    if (!link) throw new Error('Invalid delivery link.');
    return link;
  };
  const copyLink = async () => {
    if (!canDownload || !activeLink || linkActionPending) return;
    setLinkActionPending(true);
    try { await navigator.clipboard.writeText(await getLink()); toast.success('تم نسخ رابط التسليم.'); }
    catch { toast.error('تعذر نسخ الرابط.'); }
    finally { setLinkActionPending(false); }
  };
  const downloadLinkText = async () => {
    if (!canDownload || !activeLink || linkActionPending) return;
    setLinkActionPending(true);
    try {
      const value = await getLink();
      const url = URL.createObjectURL(new Blob([`${value}\n`], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'delivery-link.txt'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('تعذر تنزيل الرابط كملف نصي.'); }
    finally { setLinkActionPending(false); }
  };
  const downloadAll = async () => {
    if (!canDownload || downloadingArchive) return;
    setDownloadingArchive(true);
    try { await ordersApi.downloadAll(orderId); }
    catch { toast.error('تعذر تنزيل ملفات الطلب. حاول مرة أخرى.'); }
    finally { setDownloadingArchive(false); }
  };
  const directories = useMemo(() => {
    const all = new Set<string>();
    files.forEach((file) => {
      const path = folderOf(file.relativePath || file.originalFilename);
      if (path) path.split('/').forEach((_part, index, parts) => all.add(parts.slice(0, index + 1).join('/')));
    });
    return [...all];
  }, [files]);
  const childDirectories = directories.filter((directory) => folderOf(directory) === folder && directory !== folder);
  const visible = files.filter((file) => folderOf(file.relativePath || file.originalFilename) === folder &&
    `${file.originalFilename} ${extensionOf(file.originalFilename)}`.toLowerCase().includes(search.toLowerCase()));
  const crumbs = folder ? folder.split('/') : [];
  const galleryFiles = viewing ? visible.filter((file) => file.versionNumber === viewing.versionNumber && folderOf(file.relativePath || file.originalFilename) === folderOf(viewing.relativePath || viewing.originalFilename)) : [];
  const openFile = (file: OrderDelivery) => { setSelected(file); setViewing(file); };

  return <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg shadow-slate-200/30">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div><h3 className="font-black text-slate-900">مستكشف ملفات التسليم</h3><p className="mt-1 text-xs text-slate-500">المعاينة الآمنة لملفات مساحة الطلب.</p></div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800"><ShieldCheck className="size-4"/>خزنة خاصة</span>{downloadableFiles.length || !linkFiles.length ? <button type="button" onClick={() => void downloadAll()} disabled={!canDownload || downloadingArchive} title={canDownload ? 'تنزيل ملفات التسليم بصيغة ZIP' : 'يفتح التنزيل بعد اكتمال الطلب'} className="btn btn-secondary btn-sm inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"><Archive className="size-4"/>{downloadingArchive ? 'جارٍ تجهيز الأرشيف…' : 'تنزيل الملفات (.zip)'}</button> : null}{linkFiles.length ? <><button type="button" onClick={() => void copyLink()} disabled={!canDownload || linkActionPending} className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"><Copy className="size-4"/>نسخ الرابط</button><button type="button" onClick={() => void downloadLinkText()} disabled={!canDownload || linkActionPending} className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"><FileDown className="size-4"/>تنزيل الرابط TXT</button></> : null}</div><p className="w-full text-[11px] text-slate-500">{canDownload ? 'الملفات والروابط جاهزة بعد اكتمال الطلب.' : 'نسخ الرابط والتنزيل يفتحان بعد اكتمال الطلب.'}</p></header>
    <div className="grid min-h-72 md:grid-cols-[11rem_minmax(0,1fr)]">
      <aside className="border-b border-slate-100 bg-slate-50/70 p-3 md:border-b-0 md:border-e"><p className="px-2 py-1 text-[11px] font-black text-slate-500">المجلدات</p><button onClick={() => setFolder('')} className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start text-xs font-bold ${!folder ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-white'}`}><FolderOpen className="size-4"/>كل الملفات</button>{directories.map((item) => <button key={item} onClick={() => setFolder(item)} title={item} className={`flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-start text-xs font-bold ${folder === item ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-white'}`}><Folder className="size-4 shrink-0"/><span className="truncate">{item}</span></button>)}</aside>
      <div className="min-w-0 p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs font-bold text-slate-500"><button onClick={() => setFolder('')} className="shrink-0 hover:text-brand-700">التسليم</button>{crumbs.map((crumb, index) => <span key={index} className="inline-flex shrink-0 items-center gap-1"><ChevronLeft className="size-3"/><button onClick={() => setFolder(crumbs.slice(0, index + 1).join('/'))}>{crumb}</button></span>)}</nav><div className="flex w-full items-center gap-2 sm:w-auto"><label className="relative min-w-0 flex-1 sm:w-56"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input className="input h-9 ps-9 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الامتداد"/></label><div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1" aria-label="طريقة عرض الملفات"><button type="button" title="عرض شبكي" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={`rounded-lg p-1.5 ${viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:text-slate-700'}`}><Grid2X2 className="size-4"/></button><button type="button" title="عرض قائمة" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={`rounded-lg p-1.5 ${viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:text-slate-700'}`}><List className="size-4"/></button></div></div></div>
        <div className={viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
          {childDirectories.map((directory) => <button key={directory} onClick={() => setFolder(directory)} title={directory.split('/').pop()} className={`flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 text-start transition hover:border-brand-200 hover:bg-brand-50/40 ${viewMode === 'grid' ? 'p-3' : 'w-full p-3'}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Folder className="size-5"/></span><span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-800">{directory.split('/').pop()}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">مجلد</span></button>)}
          {visible.map((file) => <button key={file.id} type="button" onClick={() => openFile(file)} title={file.originalFilename} className={`group min-w-0 overflow-hidden rounded-2xl border text-start transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md hover:shadow-brand-900/5 ${selected?.id === file.id ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-100'} ${viewMode === 'grid' ? 'p-2.5' : 'flex w-full items-center gap-3 p-2'}`}>
            <span className={`relative block overflow-hidden rounded-xl bg-slate-50 ${viewMode === 'grid' ? 'mb-2.5 aspect-[16/9] w-full' : 'size-12 shrink-0'}`}><PreviewThumbnail orderId={orderId} file={file}/>{isPreviewableVideo(file) ? <span className="absolute bottom-1.5 end-1.5 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-bold text-white">VIDEO</span> : isPreviewableAudio(file) ? <span className="absolute bottom-1.5 end-1.5 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-bold text-white">AUDIO</span> : null}</span>
            <span className="flex min-w-0 flex-1 items-center gap-2"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-slate-800" dir="auto">{file.originalFilename}</span><span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-slate-500"><span className="truncate">.{extensionOf(file.originalFilename)}</span><span aria-hidden="true">·</span><span>{formatSize(file.fileSize)}</span><span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">v{file.versionNumber}</span></span></span></span>
          </button>)}
        </div>
        {!visible.length && !childDirectories.length ? <p className="py-12 text-center text-sm text-slate-400">لا توجد ملفات في هذا المجلد.</p> : null}
        {selected ? <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3 text-xs text-slate-600"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-extrabold text-slate-800" title={selected.originalFilename}>{selected.originalFilename}</p><p className="mt-1">{formatSize(selected.fileSize)} · {selected.mimeType} · {new Date(selected.createdAt).toLocaleString()}</p><p className="mt-1 break-all font-mono text-[10px]">SHA-256: {selected.sha256 || 'غير متاح'}</p></div><button onClick={() => setViewing(selected)} className="btn btn-primary btn-sm">معاينة الملف</button></div></div> : null}
      </div>
    </div>
    {viewing ? <ProtectedMediaViewer orderId={orderId} file={viewing} files={galleryFiles.length ? galleryFiles : [viewing]} status={status} onSelect={setViewing} onDownloadAll={downloadAll} downloadingArchive={downloadingArchive} onClose={() => setViewing(null)}/> : null}
  </section>;
};
