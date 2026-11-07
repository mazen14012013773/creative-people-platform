import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, BriefcaseBusiness, CalendarDays, Camera, Check, ChevronDown, ExternalLink, Eye, FileText, HeartHandshake, Image as ImageIcon, Link2, MapPin, MessageCircle, Pencil, Play, ShieldCheck, Star, UsersRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaViewer } from '@/components/common/MediaViewer';
import { ParentChatViewer } from '@/components/dashboard/ParentChatViewer';
import { MediaLightbox } from '@/components/ui/MediaLightbox';
import { ExternalMediaCard } from '@/components/ui/ExternalMediaCard';
import { ExternalWebViewLink } from '@/components/ui/ExternalWebViewLink';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { parentApi, type LinkedChild } from '@/services/parent.service';
import type { ServiceMedia } from '@/types';

type ChildTab = 'overview' | 'services' | 'portfolio' | 'community' | 'chats';
const tabs: Array<{ id: ChildTab; label: string; icon: typeof Eye; count?: (child: LinkedChild) => number }> = [
  { id: 'overview', label: 'نظرة عامة', icon: Eye },
  { id: 'services', label: 'خدمات الابن', icon: BriefcaseBusiness, count: (child) => child.services.length },
  { id: 'portfolio', label: 'معرض الأعمال', icon: ImageIcon, count: (child) => child.portfolio.length },
  { id: 'community', label: 'مشاركات المجتمع', icon: FileText, count: (child) => child.posts.length },
  { id: 'chats', label: 'محادثات الأمان', icon: MessageCircle },
];

const parseServiceMedia = (value: string): ServiceMedia[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ServiceMedia => Boolean(item && typeof item === 'object' && 'url' in item && typeof item.url === 'string' && 'type' in item && ['image', 'video', 'link'].includes(String(item.type))));
  } catch { return []; }
};

const parseServiceSources = (value: string): Array<{ title: string; url: string }> => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is { title: string; url: string } => Boolean(item && typeof item === 'object' && 'url' in item && typeof item.url === 'string' && 'title' in item && typeof item.title === 'string'));
  } catch { return []; }
};

const MediaPreviewDialog = ({ url, title, onClose }: { url: string; title: string; onClose: () => void }) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(<div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative flex h-[min(88vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4"><h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900">{title}</h3><button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200" aria-label="إغلاق المعاينة"><X className="size-5"/></button></header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-5"><MediaViewer url={url} title={title} aspect="video" className="max-h-full max-w-full border-0 bg-slate-950 shadow-none" mediaClassName="object-contain"/></div>
    </div>
  </div>, document.body);
};

const Stat = ({ icon: Icon, label, value, color }: { icon: typeof BriefcaseBusiness; label: string; value: number; color: string }) => <div className={`flex min-w-0 items-center gap-3 rounded-2xl p-3 sm:p-4 ${color}`}>
  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/80"><Icon className="size-5"/></span>
  <span className="min-w-0"><span className="block text-xl font-black leading-none sm:text-2xl">{value}</span><span className="mt-1 block truncate text-[11px] font-bold sm:text-xs">{label}</span></span>
</div>;

const ChildOverview = ({ child }: { child: LinkedChild }) => <section className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-7">
  <div className="flex items-center gap-2"><span className="flex size-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><UsersRound className="size-5"/></span><div><h2 className="font-black text-slate-900">نبذة المبدع</h2><p className="text-xs text-slate-500">معلومات الحساب والمهارات وطرق التواصل العامة</p></div></div>
  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{child.bio || 'لم يضف الابن نبذة تعريفية إلى ملفه بعد.'}</p>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <div className="rounded-2xl bg-sky-50 p-4"><p className="text-xs font-bold text-sky-800">التخصص</p><p className="mt-1 font-extrabold text-slate-900">{child.title || 'لم يحدد بعد'}</p></div>
    <div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs font-bold text-violet-800">الموقع</p><p className="mt-1 flex items-center gap-1 font-extrabold text-slate-900"><MapPin className="size-4 text-violet-700"/>{child.location || 'غير محدد'}</p></div>
    <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-800">حالة العمل</p><p className="mt-1 font-extrabold text-slate-900">{child.isAvailable ? 'متاح للعمل' : 'غير متاح حالياً'}</p></div>
  </div>
  <div className="mt-6"><h3 className="text-sm font-extrabold text-slate-800">المهارات</h3>{child.skills.length ? <div className="mt-3 flex flex-wrap gap-2">{child.skills.map((skill) => <span key={skill.id} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">{skill.name}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">لم يضف مهارات بعد.</p>}</div>
  <div className="mt-6 flex flex-wrap gap-3">{[[child.websiteUrl, 'الموقع الإلكتروني'], [child.githubUrl, 'GitHub'], [child.linkedinUrl, 'LinkedIn']].filter((item): item is [string, string] => Boolean(item[0])).map(([href, label]) => <a key={label} href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100"><Link2 className="size-3.5"/>{label}</a>)}</div>
</section>;

const ChildServiceCard = ({ service }: { service: LinkedChild['services'][number] }) => {
  const media = parseServiceMedia(service.mediaJson);
  const sources = parseServiceSources(service.sourcesJson);
  const [mediaViewer, setMediaViewer] = useState<{ items: ServiceMedia[]; index: number } | null>(null);
  return <article className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/40">
    {media.length ? <div className="grid gap-3 bg-gradient-to-br from-cyan-50 to-violet-50 p-3 sm:grid-cols-2">{media.map((item, index) => item.type === 'link' ? <ExternalMediaCard key={`${item.url}:${index}`} url={item.url} className="min-h-40 rounded-2xl"/> : <button key={`${item.url}:${index}`} type="button" onClick={() => setMediaViewer({ items: media, index })} className="group relative aspect-video min-w-0 overflow-hidden rounded-2xl bg-slate-950" aria-label={`فتح ${item.type === 'video' ? 'الفيديو' : 'الصورة'} ${index + 1} بحجم أكبر`}>
      {item.type === 'video' ? <video src={item.url} muted preload="metadata" playsInline className="size-full bg-slate-950 object-contain transition group-hover:scale-[1.02]"/> : <img src={item.url} alt={`${service.title} — صورة ${index + 1}`} loading="lazy" className="size-full bg-slate-950 object-contain transition group-hover:scale-[1.02]"/>}
      <span className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/65 via-transparent to-transparent p-3 text-white"><span className="flex items-center gap-1.5 text-xs font-bold">{item.type === 'video' ? <Play className="size-4 fill-white"/> : <Eye className="size-4"/>}{item.type === 'video' ? 'تشغيل ومعاينة' : 'تكبير الصورة'}</span><span className="rounded-full bg-black/40 px-2 py-1 text-[10px]">{index + 1} / {media.length}</span></span>
    </button>)}</div> : <div className="flex h-36 items-center justify-center bg-gradient-to-br from-cyan-50 to-violet-50 text-cyan-700"><BriefcaseBusiness className="size-10"/></div>}
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-lg font-black text-slate-900">{service.title}</h3><span className="mt-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">{service.category}</span></div></div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{service.description || 'لم يضف وصفاً لهذه الخدمة.'}</p>
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="size-3.5"/>نُشرت في {new Date(service.createdAt).toLocaleDateString('ar-EG')}</p>
      {sources.length ? <div className="mt-5 border-t border-slate-100 pt-4"><h4 className="mb-3 text-sm font-extrabold text-slate-800">روابط ومصادر الخدمة</h4><div className="grid gap-3 sm:grid-cols-2">{sources.map((source, index) => <ExternalWebViewLink key={`${source.url}:${index}`} href={source.url} title={source.title} className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-cyan-50"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm"><ExternalLink className="size-4"/></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{source.title}</span><span className="mt-1 block truncate text-[11px] text-slate-400" dir="ltr">{(() => { try { return new URL(source.url).hostname.replace(/^www\./, ''); } catch { return source.url; } })()}</span></span></ExternalWebViewLink>)}</div></div> : null}
    </div>
    {mediaViewer ? <MediaLightbox items={mediaViewer.items} initialIndex={mediaViewer.index} title={service.title} onClose={() => setMediaViewer(null)}/> : null}
  </article>;
};

const ChildServices = ({ child }: { child: LinkedChild }) => child.services.length ? <div className="grid min-w-0 gap-6 md:grid-cols-2">{child.services.map((service) => <ChildServiceCard key={service.id} service={service}/>)}</div> : <EmptyState icon={BriefcaseBusiness} title="لا توجد خدمات منشورة" detail="ستظهر هنا خدمات الابن عند إضافتها إلى ملفه."/>;

const PortfolioCard = ({ item, index }: { item: LinkedChild['portfolio'][number]; index: number }) => {
  const [preview, setPreview] = useState(false);
  return <li className="group min-w-0 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="relative overflow-hidden bg-slate-950">
      {item.imageUrl ? <MediaViewer url={item.imageUrl} title={item.title} aspect="video" onImageClick={() => setPreview(true)} className="overflow-hidden rounded-none border-0 shadow-none" mediaClassName="object-contain"/> : <div className="grid aspect-video place-items-center bg-gradient-to-br from-violet-50 to-cyan-50 text-violet-700"><ImageIcon className="size-12"/></div>}
      {item.imageUrl ? <button type="button" onClick={() => setPreview(true)} className="absolute end-3 top-3 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-extrabold text-slate-800 shadow-lg backdrop-blur transition hover:bg-cyan-50" aria-label={`فتح معاينة ${item.title}`}><Eye className="size-4"/>معاينة كاملة</button> : null}
      <span className="absolute bottom-3 start-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">مشروع {index + 1}</span>
    </div>
    <div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><h3 className="break-words text-lg font-black text-slate-900">{item.title}</h3><span className="shrink-0 rounded-xl bg-violet-50 p-2 text-violet-700"><ImageIcon className="size-4"/></span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description || 'عمل ضمن معرض الأعمال'}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="size-3.5"/>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>{item.projectUrl ? <ExternalWebViewLink href={item.projectUrl} title={item.title} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-700"><ExternalLink className="size-4"/>فتح المشروع</ExternalWebViewLink> : null}</div></div>
    {preview && item.imageUrl ? <MediaPreviewDialog url={item.imageUrl} title={item.title} onClose={() => setPreview(false)}/> : null}
  </li>;
};

const ChildPortfolio = ({ child }: { child: LinkedChild }) => child.portfolio.length ? <ul className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">{child.portfolio.map((item, index) => <PortfolioCard key={item.id} item={item} index={index}/>)}</ul> : <EmptyState icon={ImageIcon} title="معرض الأعمال فارغ حالياً" detail="ستظهر هنا المشاريع والصور التي يشاركها الابن في ملفه."/>;

const ChildCommunity = ({ child }: { child: LinkedChild }) => child.posts.length ? <ul className="grid min-w-0 gap-6 md:grid-cols-2">{child.posts.map((post) => <li key={post.id} className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/40">
  {post.coverImage ? <MediaViewer url={post.coverImage} title={post.title} aspect="video" className="overflow-hidden rounded-none" mediaClassName="object-contain"/> : null}
  <div className="p-5"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">{post.category}</span><span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString('ar-EG')}</span></div><h3 className="mt-3 break-words text-lg font-black text-slate-900">{post.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{post.content}</p><p className="mt-4 text-xs font-bold text-slate-500">{post.likesCount} إعجاب · {post.viewsCount} مشاهدة</p><Link to={`/community/posts/${post.id}`} className="mt-4 inline-flex rounded-xl bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-100">عرض المشاركة</Link></div>
</li>)}</ul> : <EmptyState icon={FileText} title="لا توجد مشاركات حتى الآن" detail="ستظهر هنا منشورات الابن ومشاريعه التي يشاركها مع المجتمع."/>;

const EmptyState = ({ icon: Icon, title, detail }: { icon: typeof BriefcaseBusiness; title: string; detail: string }) => <div className="grid min-h-72 place-items-center rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/40"><div><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon className="size-7"/></span><h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{detail}</p></div></div>;

const ChildWorkspace = ({ child }: { child: LinkedChild }) => {
  const [activeTab, setActiveTab] = useState<ChildTab>('overview');
  const tab = tabs.find((item) => item.id === activeTab) ?? tabs[0];
  const displayName = child.parentDisplayName?.trim() || child.name;
  const displayAvatar = child.parentAvatarDataUrl || child.avatarUrl;

  return <div className="min-w-0">
    <section className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={displayName} src={displayAvatar} className="size-20 rounded-3xl sm:size-24"/>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{displayName}</h2>{child.isVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800"><BadgeCheck className="size-3.5"/>موثق</span> : null}</div>{displayName !== child.name ? <p className="mt-1 text-xs text-slate-400">اسم الحساب: {child.name}</p> : null}<p className="mt-1 text-base font-bold text-cyan-800">{child.title || 'مبدع مستقل'}</p><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="size-4"/>{child.location || 'الموقع غير محدد'}</span><span>انضم للمتابعة {new Date(child.linkedAt).toLocaleDateString('ar-EG')}</span></p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800"><ShieldCheck className="size-4"/>حساب مرتبط بموافقة ولي الأمر</span></div>
        <Link to={`/freelancers/${child.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-cyan-700"><Eye className="size-4"/>عرض الملف العام</Link>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"><Stat icon={BriefcaseBusiness} label="الخدمات المنشورة" value={child.serviceCount} color="bg-cyan-50 text-cyan-900"/><Stat icon={Star} label="التقييمات" value={child.reviewCount} color="bg-orange-50 text-orange-900"/><Stat icon={FileText} label="مشاركات المجتمع" value={child.postCount} color="bg-lime-50 text-lime-900"/></div>
    </section>

    <nav aria-label="محتوى حساب الابن" className="mt-5 grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow-lg shadow-slate-200/40 sm:grid-cols-3 lg:grid-cols-5">
      {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => setActiveTab(id)} aria-pressed={activeTab === id} className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-xs font-extrabold transition sm:text-sm ${activeTab === id ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200' : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-800'}`}><Icon className="size-4 shrink-0"/><span className="truncate">{label}</span>{count ? <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count(child)}</span> : null}</button>)}
    </nav>

    <div className="mt-5 min-w-0" key={activeTab}>
      <div className="mb-4 flex items-center gap-2"><tab.icon className="size-5 text-cyan-700"/><h2 className="text-lg font-black text-slate-900">{tab.label}</h2></div>
      {activeTab === 'overview' ? <ChildOverview child={child}/> : null}
      {activeTab === 'services' ? <ChildServices child={child}/> : null}
      {activeTab === 'portfolio' ? <ChildPortfolio child={child}/> : null}
      {activeTab === 'community' ? <ChildCommunity child={child}/> : null}
      {activeTab === 'chats' ? <ParentChatViewer childId={child.id} childName={displayName}/> : null}
    </div>
  </div>;
};

export const ParentChildrenPanel = () => {
  const [email, setEmail] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const toast = useToast();
  const client = useQueryClient();
  const children = useQuery({ queryKey: ['parent-linked-children'], queryFn: parentApi.children, refetchInterval: 30_000 });
  const request = useMutation({
    mutationFn: () => parentApi.requestLink(email.trim()),
    onSuccess: async (result) => { setEmail(''); toast.success(`تم إرسال طلب الربط إلى ${result.childName}`); await client.invalidateQueries({ queryKey: ['parent-linked-children'] }); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إرسال طلب الربط')),
  });
  useEffect(() => { if (children.data?.length && !children.data.some((child) => child.id === selectedChildId)) setSelectedChildId(children.data[0].id); }, [children.data, selectedChildId]);
  const selectedChild = children.data?.find((child) => child.id === selectedChildId) ?? children.data?.[0];
  useEffect(() => {
    if (!selectedChild) return;
    setDisplayName(selectedChild.parentDisplayName ?? '');
    setAvatarFile(null);
    setIdentityEditorOpen(false);
  }, [selectedChild?.id]);
  useEffect(() => {
    if (!selectedChild) { setAvatarPreview(null); return; }
    if (!avatarFile) { setAvatarPreview(selectedChild.parentAvatarDataUrl); return; }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, selectedChild?.id, selectedChild?.parentAvatarDataUrl]);
  const updateIdentity = useMutation({
    mutationFn: () => selectedChild ? parentApi.updateChildDisplay(selectedChild.id, displayName.trim(), avatarFile ?? undefined) : Promise.reject(new Error('اختر حساب الابن أولاً')),
    onSuccess: async () => { toast.success('تم تحديث الاسم والصورة في لوحة ولي الأمر'); setAvatarFile(null); setIdentityEditorOpen(false); await client.invalidateQueries({ queryKey: ['parent-linked-children'] }); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث بيانات العرض')),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); if (email.trim()) request.mutate(); };

  return <section dir="rtl" className="space-y-5">
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-xl shadow-slate-200/40 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700"><HeartHandshake className="size-5"/></span><div className="min-w-0"><h2 className="font-black text-slate-900">ربط حساب ابن</h2><p className="text-xs text-slate-500">يحتاج الربط إلى موافقة صاحب الحساب.</p></div></div>
      <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="البريد الإلكتروني لحساب الابن" dir="ltr" className="input min-w-0 sm:w-64"/>
      <button type="submit" disabled={request.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-2.5 text-sm font-extrabold text-white active:translate-y-0.5 active:border-b-0 disabled:opacity-50"><Link2 className="size-4"/>{request.isPending ? 'جارٍ الإرسال…' : 'إرسال طلب الربط'}</button>
    </form>
    {children.isPending ? <div className="grid min-h-72 place-items-center rounded-3xl bg-white text-sm text-slate-500 shadow-xl shadow-slate-200/40">جارٍ تحميل حسابات الأبناء…</div> : null}
    {children.isError ? <button type="button" onClick={() => void children.refetch()} className="w-full rounded-3xl bg-rose-50 p-6 text-sm font-bold text-rose-800">تعذر تحميل الحسابات. اضغط لإعادة المحاولة.</button> : null}
    {!children.isPending && !children.isError && !children.data?.length ? <EmptyState icon={UsersRound} title="لا توجد حسابات مرتبطة بعد" detail="أرسل طلب ربط باستخدام البريد الإلكتروني، وسيظهر الحساب هنا بعد موافقة الابن."/> : null}
    {children.data?.length && selectedChild ? <>
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-xl shadow-slate-200/40 sm:flex-row sm:items-center sm:p-5">
        <label className="flex min-w-0 flex-1 items-center gap-3"><Avatar name={selectedChild.parentDisplayName?.trim() || selectedChild.name} src={selectedChild.parentAvatarDataUrl || selectedChild.avatarUrl} className="size-12 rounded-2xl"/><span className="min-w-0 flex-1"><span className="mb-1 block text-xs font-bold text-slate-500">اختر الابن الذي تريد متابعة حسابه</span><span className="relative block"><select value={selectedChild.id} onChange={(event) => setSelectedChildId(event.target.value)} className="input w-full appearance-none pe-10 font-extrabold"><option value="" disabled>اختر حساباً</option>{children.data.map((child) => <option key={child.id} value={child.id}>{child.parentDisplayName?.trim() || child.name}{child.parentDisplayName ? ` — ${child.name}` : ''}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/></span></span></label>
        <button type="button" onClick={() => setIdentityEditorOpen((open) => !open)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-extrabold text-violet-800 hover:bg-violet-100"><Pencil className="size-4"/>{identityEditorOpen ? 'إغلاق التعديل' : 'تعديل الاسم والصورة'}</button>
      </div>
      {identityEditorOpen ? <form onSubmit={(event) => { event.preventDefault(); updateIdentity.mutate(); }} className="grid gap-4 rounded-3xl border border-violet-100 bg-gradient-to-l from-violet-50/60 via-white to-cyan-50/50 p-5 shadow-lg shadow-slate-200/30 sm:grid-cols-[auto_1fr] sm:items-center">
        <Avatar name={displayName.trim() || selectedChild.name} src={avatarPreview || selectedChild.avatarUrl} className="size-20 rounded-3xl"/>
        <div className="min-w-0 space-y-3">
          <label className="block text-sm font-extrabold text-slate-800">الاسم الذي سيظهر لك في لوحة ولي الأمر<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder={selectedChild.name} className="input mt-2 w-full"/></label>
          <label className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-violet-200 bg-white p-3 text-sm font-bold text-slate-700"><Camera className="size-5 text-violet-700"/><span className="flex-1">صورة مخصصة للتعرّف على الابن <span className="block text-xs font-normal text-slate-500">JPG أو PNG أو WebP أو GIF، بحد أقصى 1 ميجابايت</span></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="max-w-52 text-xs" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && file.size > 1024 * 1024) { toast.error('يجب ألا يتجاوز حجم الصورة 1 ميجابايت'); event.target.value = ''; return; } setAvatarFile(file); }}/></label>
          <p className="text-xs leading-5 text-slate-500">الاسم والصورة المخصصان يظهران لك وحدك ولا يغيّران بيانات حساب الابن أو صورته العامة.</p>
          <button type="submit" disabled={updateIdentity.isPending || (!displayName.trim() && !avatarFile && !selectedChild.parentDisplayName)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"><Check className="size-4"/>{updateIdentity.isPending ? 'جارٍ الحفظ…' : 'حفظ بيانات العرض'}</button>
        </div>
      </form> : null}
      <ChildWorkspace key={selectedChild.id} child={selectedChild}/>
    </> : null}
  </section>;
};
