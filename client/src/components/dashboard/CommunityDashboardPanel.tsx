import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, PenLine, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { communityApi } from '@/services/community.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { CommunityPostStatus } from '@/types';

const labels: Record<CommunityPostStatus, string> = { PUBLISHED: 'منشور', DRAFT: 'مسودة' };

export const CommunityDashboardPanel = () => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const isAdmin = user?.role === 'Admin';
  const postsQuery = useQuery({
    queryKey: [isAdmin ? 'manage-community-posts' : 'my-community-posts'],
    queryFn: isAdmin ? communityApi.manage : communityApi.mine,
    enabled: Boolean(user),
  });
  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['manage-community-posts'] }),
    queryClient.invalidateQueries({ queryKey: ['my-community-posts'] }),
    queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  ]);
  const deleteMutation = useMutation({
    mutationFn: communityApi.remove,
    onSuccess: async () => { await refresh(); toast.success('تم حذف المنشور'); },
    onError: () => toast.error('تعذر حذف المنشور'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommunityPostStatus }) => communityApi.update(id, { status }),
    onSuccess: async () => { await refresh(); toast.success('تم تحديث حالة المنشور'); },
    onError: () => toast.error('تعذر تحديث المنشور'),
  });
  const posts = postsQuery.data ?? [];
  const publishedCount = posts.filter((post) => post.status === 'PUBLISHED').length;
  const draftCount = posts.filter((post) => post.status === 'DRAFT').length;

  return <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
    <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-l from-cyan-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><div className="flex items-center gap-2 text-cyan-700"><FileText className="size-5"/><span className="text-xs font-extrabold">مساحة الكتابة والمشاركة</span></div><h2 className="mt-2 text-xl font-black text-slate-900">{isAdmin ? 'إدارة منشورات المجتمع' : 'منشوراتي ومسوداتي'}</h2><p className="mt-1 text-sm text-slate-600">{isAdmin ? 'راجع المنشورات والمسودات واحذف المحتوى المخالف.' : 'أنشئ منشوراتك، وراجع ما نشرته أو احفظته كمسودة.'}</p></div>
      <Link to="/community/create" className="inline-flex items-center justify-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-600 active:translate-y-0.5 active:border-b-0"><Plus className="size-4"/>إنشاء منشور</Link>
    </div>
    <div className="grid grid-cols-2 gap-3 p-5 pb-0 sm:px-6"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700">المنشورات</p><p className="mt-1 text-xl font-black text-emerald-900">{publishedCount}</p></div><div className="rounded-2xl bg-amber-50 p-3"><p className="text-xs font-bold text-amber-700">المسودات</p><p className="mt-1 text-xl font-black text-amber-900">{draftCount}</p></div></div>
    <div className="space-y-3 p-5 sm:p-6">
      {postsQuery.isPending ? <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">جارٍ تحميل منشوراتك...</p> : postsQuery.isError ? <div className="rounded-2xl bg-rose-50 p-5 text-center text-sm text-rose-700">تعذر تحميل المنشورات. <button onClick={() => void postsQuery.refetch()} className="font-extrabold underline">أعد المحاولة</button></div> : posts.length ? posts.map((post) => {
        const isOwner = post.authorId === user?.id;
        return <article key={post.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center">
          {post.coverImage ? <img src={post.coverImage} alt="" className="size-16 rounded-xl object-cover"/> : <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><FileText className="size-6"/></span>}
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{post.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${post.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{labels[post.status]}</span>{isAdmin && <span className="text-xs text-slate-400">{post.authorName}</span>}</div><p className="mt-1 line-clamp-1 text-xs text-slate-500">#{post.category.replaceAll(' ', '_')} · {post.viewsCount} مشاهدة</p></div>
          <div className="flex flex-wrap items-center gap-2">{(isOwner || isAdmin) && <><Link to={`/community/create?edit=${post.id}`} aria-label="تعديل المنشور" className="rounded-xl bg-cyan-50 p-2.5 text-cyan-800 hover:bg-cyan-100"><PenLine className="size-4"/></Link><button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: post.id, status: post.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT' })} title={post.status === 'DRAFT' ? 'نشر المسودة' : 'تحويل إلى مسودة'} className="rounded-xl bg-violet-50 p-2.5 text-violet-800 hover:bg-violet-100"><Send className="size-4"/></button></>}{(isOwner || isAdmin) && <button type="button" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(post.id)} aria-label="حذف المنشور" className="rounded-xl bg-rose-50 p-2.5 text-rose-700 hover:bg-rose-100"><Trash2 className="size-4"/></button>}</div>
        </article>;
      }) : <div className="rounded-2xl border border-dashed border-slate-200 p-7 text-center"><p className="font-bold text-slate-700">{isAdmin ? 'لا توجد منشورات لمراجعتها.' : 'لم تضف أي منشور بعد.'}</p>{!isAdmin && <Link to="/community/create" className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-700"><Plus className="size-4"/>اكتب أول مشاركة</Link>}</div>}
      <Link to={isAdmin ? '/community' : '/community?view=mine'} className="inline-flex items-center gap-1 text-sm font-extrabold text-cyan-700 hover:text-orange-600">فتح مجتمع مبدعين ←</Link>
    </div>
    <ConfirmDialog open={Boolean(deleteTarget)} title="حذف المنشور" description="سيتم حذف هذا المنشور نهائيًا مع تفاعلاته. هل تريد المتابعة؟" confirmLabel="حذف المنشور" busy={deleteMutation.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) }); }} />
  </section>;
};
