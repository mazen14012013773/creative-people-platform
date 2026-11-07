import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowRight, CalendarDays, Eye, PenLine, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MediaViewer } from '@/components/common/MediaViewer';
import { ImageLightboxModal } from '@/components/community/ImageLightboxModal';
import { ContentInteractions } from '@/components/community/ContentInteractions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { communityApi } from '@/services/community.service';

const roleNames = { FREELANCER: 'مستقل', CLIENT: 'عميل / ولي أمر', ADMIN: 'إدارة' };
const roleStyles = { FREELANCER: 'bg-cyan-100 text-cyan-800', CLIENT: 'bg-orange-100 text-orange-800', ADMIN: 'bg-violet-100 text-violet-800' };

export const CommunityPostPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const postQuery = useQuery({ queryKey: ['community-post', id], queryFn: () => communityApi.get(id), enabled: Boolean(id) });
  const post = postQuery.data;
  useDocumentTitle(post?.title ?? 'مشاركة المجتمع');
  const deleteMutation = useMutation({
    mutationFn: () => communityApi.remove(id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['community-posts'] }); await queryClient.invalidateQueries({ queryKey: ['my-community-posts'] }); toast.success('تم حذف المشاركة'); navigate('/community'); },
    onError: () => toast.error('تعذر حذف المشاركة'),
  });
  if (postQuery.isPending) return <main dir="rtl" className="container-page min-h-[60vh] py-20 text-center text-slate-500">نحمّل المشاركة...</main>;
  if (postQuery.isError || !post) return <main dir="rtl" className="container-page min-h-[60vh] py-20 text-center"><p className="text-xl font-black">المشاركة غير متاحة</p><Link to="/community" className="mt-5 inline-flex items-center gap-2 font-bold text-cyan-700"><ArrowRight className="size-4"/>العودة للمجتمع</Link></main>;
  const canEdit = user?.id === post.authorId;
  const canDelete = canEdit || user?.role === 'Admin';
  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-20"><div className="container-page max-w-4xl py-8"><Link to="/community" className="inline-flex items-center gap-2 text-sm font-extrabold text-cyan-700"><ArrowRight className="size-4"/> مجتمع مبدعين</Link>
    <article className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
      {post.coverImage ? <MediaViewer url={post.coverImage} title={post.title} aspect="cover" className="rounded-none border-0 shadow-none" onImageClick={() => setPreviewImage(post.coverImage!)} /> : null}
      <div className="p-6 sm:p-10"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-lime-100 px-4 py-2 text-sm font-extrabold text-lime-800">#{post.category.replaceAll(' ', '_')}</span>{post.status === 'DRAFT' ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">مسودة خاصة بك</span> : null}</div>
        <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">{post.title}</h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6"><div className="flex items-center gap-3"><img src={post.authorAvatar || '/images/articles/author.svg'} alt="" className="size-12 rounded-full border-2 border-cyan-100 object-cover"/><div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{post.authorName}</span><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${roleStyles[post.authorRole]}`}>{roleNames[post.authorRole]}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="size-3.5"/>{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(post.createdAt))}</p></div></div><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><Eye className="size-4"/>{post.viewsCount} مشاهدة</span></div>
        <div className="mt-7 whitespace-pre-wrap text-lg leading-9 text-slate-700">{post.content}</div>
        {(canEdit || canDelete) ? <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">{canEdit ? <Link to={`/community/create?edit=${post.id}`} className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-2.5 text-sm font-extrabold text-cyan-800"><PenLine className="size-4"/>تعديل</Link> : null}{canDelete ? <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700"><Trash2 className="size-4"/>حذف</button> : null}</div> : null}
        {post.status === 'PUBLISHED' ? <ContentInteractions contentId={id} contentType="post" initial={{ likesCount: post.likesCount, commentsCount: 0, likedByMe: Boolean(post.likedByMe) }} api={communityApi}/> : null}
      </div>
    </article></div>{previewImage ? <ImageLightboxModal src={previewImage} title={post.title} onClose={() => setPreviewImage(null)} /> : null}
    <ConfirmDialog open={deleteOpen} title="حذف المشاركة" description="سيتم حذف هذه المشاركة نهائيًا مع تفاعلاتها. هل تريد المتابعة؟" confirmLabel="حذف المشاركة" busy={deleteMutation.isPending} onCancel={() => setDeleteOpen(false)} onConfirm={() => deleteMutation.mutate(undefined, { onSuccess: () => setDeleteOpen(false) })} />
  </main>;
};
export default CommunityPostPage;
