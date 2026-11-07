import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Eye, FileText, LayoutGrid, MessageCircleHeart, PenLine, Sparkles, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { communityApi } from '@/services/community.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { CommunityPost } from '@/types';
import { MediaViewer } from '@/components/common/MediaViewer';
import { ImageLightboxModal } from '@/components/community/ImageLightboxModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const categories = ['الكل', 'تجربتي', 'درس برمجة', 'مشروعي', 'نصائح', 'أخرى'];
const roleNames = { FREELANCER: 'مستقل', CLIENT: 'عميل / ولي أمر', ADMIN: 'إدارة' };
const roleStyles = { FREELANCER: 'bg-cyan-100 text-cyan-800', CLIENT: 'bg-orange-100 text-orange-800', ADMIN: 'bg-violet-100 text-violet-800' };
const timeLabel = (value: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
type CommunityView = 'community' | 'mine' | 'drafts';

const PostCard = ({ post, canEdit, canDelete, onDelete }: { post: CommunityPost; canEdit: boolean; canDelete: boolean; onDelete: (id: string) => void }) => {
  const [previewImage, setPreviewImage] = useState(false);
  return <>
  <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-cyan-100">
    {post.coverImage && <MediaViewer url={post.coverImage} title={post.title} aspect="cover" className="rounded-none border-0 shadow-none" mediaClassName="h-52" onImageClick={() => setPreviewImage(true)} />}
    <div className="p-6">
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-extrabold text-lime-800">#{post.category.replaceAll(' ', '_')}</span><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${post.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{post.status === 'DRAFT' ? 'مسودة' : 'منشور'}</span></div>
      <h2 className="mt-4 text-xl font-black leading-8 text-slate-900"><Link to={`/community/posts/${post.id}`} className="transition hover:text-cyan-700">{post.title}</Link></h2>
      <p className="mt-2 line-clamp-5 whitespace-pre-line text-sm leading-7 text-slate-600">{post.content}</p>
      <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
        <img src={post.authorAvatar || '/images/articles/author.svg'} alt="" className="size-11 rounded-full border-2 border-cyan-100 object-cover"/>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-extrabold text-slate-900">{post.authorName}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${roleStyles[post.authorRole]}`}>{roleNames[post.authorRole]}</span></div><span className="text-xs text-slate-500">{timeLabel(post.createdAt)}</span></div>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Eye className="size-4"/>{post.viewsCount}</span>
      </div>
      <Link to={`/community/posts/${post.id}`} className="mt-3 inline-flex text-sm font-extrabold text-cyan-700 hover:text-orange-600">اقرأ المشاركة ←</Link>
      {(canEdit || canDelete) && <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">{canEdit && <Link to={`/community/create?edit=${post.id}`} className="rounded-lg px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50">تعديل</Link>}{canDelete && <button type="button" onClick={() => onDelete(post.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="size-3.5"/>حذف</button>}</div>}
    </div>
  </article>
  {previewImage && post.coverImage ? <ImageLightboxModal src={post.coverImage} title={post.title} onClose={() => setPreviewImage(false)} /> : null}
  </>;
};

export const CommunityPage = () => {
  const [category, setCategory] = useState('الكل');
  const [view, setView] = useState<CommunityView>(() => {
    const requestedView = new URLSearchParams(window.location.search).get('view');
    return requestedView === 'mine' || requestedView === 'drafts' ? requestedView : 'community';
  });
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  useDocumentTitle('مجتمع مبدعين');
  const postsQuery = useQuery({ queryKey: ['community-posts', category], queryFn: () => communityApi.list({ category: category === 'الكل' ? undefined : category }) });
  const mineQuery = useQuery({ queryKey: ['my-community-posts'], queryFn: communityApi.mine, enabled: Boolean(user && view !== 'community') });
  const manageQuery = useQuery({ queryKey: ['manage-community-posts'], queryFn: communityApi.manage, enabled: user?.role === 'Admin' && view === 'community' });
  const deleteMutation = useMutation({ mutationFn: communityApi.remove, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['community-posts'] }); void queryClient.invalidateQueries({ queryKey: ['my-community-posts'] }); void queryClient.invalidateQueries({ queryKey: ['manage-community-posts'] }); toast.success('تم حذف المنشور'); }, onError: () => toast.error('تعذر حذف المنشور') });
  const sourceItems = view === 'community'
    ? (user?.role === 'Admin' ? manageQuery.data ?? [] : postsQuery.data ?? [])
    : (mineQuery.data ?? []).filter((post) => view === 'drafts' ? post.status === 'DRAFT' : true);
  const items = sourceItems.filter((post) => category === 'الكل' || post.category === category);
  const isViewPending = view === 'community' ? (user?.role === 'Admin' ? manageQuery.isPending : postsQuery.isPending) : mineQuery.isPending;
  const isViewError = view === 'community' ? (user?.role === 'Admin' ? manageQuery.isError : postsQuery.isError) : mineQuery.isError;

  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-20">
    <section className="border-b border-cyan-100 bg-gradient-to-bl from-cyan-50 via-sky-50/60 to-white"><div className="container-page py-12 sm:py-16">
      <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center"><div><span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-extrabold text-orange-700"><Sparkles className="size-4"/> نتعلم ونبدع معاً</span><h1 className="mt-5 text-4xl font-black text-slate-900 sm:text-5xl">مجتمع <span className="text-cyan-600">مبدعين</span></h1><p className="mt-4 max-w-2xl leading-8 text-slate-600">شارك تجربة تعلمك، مشروعك، أو نصيحة تساعد مبدعاً آخر على البدء.</p></div>
        {user ? <Link to="/community/create" className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border-b-4 border-cyan-700 bg-cyan-500 px-6 py-4 font-extrabold text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-600 active:translate-y-0.5 active:border-b-0"><PenLine className="size-5"/> شارك مقالك أو تجربتك</Link> : <Link to="/login" className="inline-flex items-center gap-2 self-start rounded-2xl border-b-4 border-orange-700 bg-orange-500 px-6 py-4 font-extrabold text-white">سجّل الدخول للمشاركة</Link>}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-bold ${category === item ? 'bg-slate-900 text-white' : 'border border-slate-100 bg-white text-slate-700 hover:border-cyan-200 hover:text-cyan-700'}`}>{item === 'الكل' ? 'كل المشاركات' : `#${item.replaceAll(' ', '_')}`}</button>)}</div>
      {user && <div className="mt-7 flex flex-wrap gap-2 border-t border-cyan-100 pt-5" role="tablist" aria-label="عرض المشاركات">
        {([['community', 'المجتمع', LayoutGrid], ['mine', 'منشوراتي', UserRound], ['drafts', 'مسوداتي', FileText]] as const).map(([key, label, Icon]) => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${view === key ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200' : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700'}`}><Icon className="size-4"/>{label}{key === 'drafts' && mineQuery.data?.filter((post) => post.status === 'DRAFT').length ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">{mineQuery.data.filter((post) => post.status === 'DRAFT').length}</span> : null}</button>)}
      </div>}
    </div></section>
    <section className="container-page py-10 sm:py-14">
      {isViewPending ? <div className="rounded-3xl bg-white p-12 text-center text-slate-500">نحمّل مشاركات المجتمع...</div> : isViewError ? <div role="alert" className="rounded-3xl bg-white p-12 text-center text-rose-700">تعذر تحميل المنشورات. حاول مرة أخرى.</div> : items.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{items.map((post) => <PostCard key={post.id} post={post} canEdit={user?.id === post.authorId} canDelete={user?.role === 'Admin' || user?.id === post.authorId} onDelete={(id) => setDeleteTargetId(id)}/>)}</div> : <div className="mx-auto max-w-3xl rounded-3xl border border-cyan-100 bg-white px-6 py-14 text-center shadow-xl shadow-cyan-100/50 sm:px-12"><span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-lime-100 text-cyan-700"><MessageCircleHeart className="size-8"/></span><h2 className="mt-6 text-2xl font-black text-slate-900">{view === 'drafts' ? 'لا توجد مسودات بعد' : view === 'mine' ? 'لم تنشر أي مشاركة بعد' : 'كن أول من يشارك إبداعه وتجربته!'}</h2><p className="mx-auto mt-3 max-w-lg leading-8 text-slate-600">{view === 'community' ? 'مساحة آمنة لنتعلم من بعضنا. شارك مشروعك أو أول خطوة في رحلتك وألهم مبدعاً صغيراً 🚀' : 'ابدأ مشاركة تجربتك، ويمكنك حفظها كمسودة والعودة إليها في أي وقت.'}</p>{user && <Link to="/community/create" className="mt-7 inline-flex items-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-6 py-3 font-extrabold text-white"><BookOpen className="size-4"/> اكتب مشاركة جديدة</Link>}</div>}
    </section>
    <ConfirmDialog open={Boolean(deleteTargetId)} title="حذف المنشور" description="سيتم حذف هذا المنشور نهائيًا مع تفاعلاته. هل تريد المتابعة؟" confirmLabel="حذف المنشور" busy={deleteMutation.isPending} onCancel={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) deleteMutation.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) }); }} />
  </main>;
};
export default CommunityPage;
