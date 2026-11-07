import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ImagePlus, LoaderCircle, Save, Send, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { communityApi } from '@/services/community.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { CommunityPostPayload, CommunityPostStatus } from '@/types';

const categories = ['تجربتي', 'درس برمجة', 'مشروعي', 'نصائح', 'أخرى'];

export const CommunityCreatePage = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [status, setStatus] = useState<CommunityPostStatus>('PUBLISHED');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  useDocumentTitle(editId ? 'تعديل المشاركة' : 'شارك تجربتك');

  const editQuery = useQuery({ queryKey: ['community-post', editId], queryFn: () => communityApi.get(editId!), enabled: Boolean(editId) });
  const currentPost = editQuery.data;
  useEffect(() => {
    if (!currentPost) return;
    setTitle(currentPost.title); setContent(currentPost.content); setCategory(currentPost.category);
    setStatus(currentPost.status); setCoverImage(currentPost.coverImage);
  }, [currentPost]);
  const preview = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : coverImage, [coverFile, coverImage]);
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CommunityPostPayload) => {
      const uploadedCover = coverFile ? await communityApi.uploadCover(coverFile) : payload.coverImage;
      const body = { ...payload, coverImage: uploadedCover };
      return editId ? communityApi.update(editId, body) : communityApi.create(body);
    },
    onSuccess: async (post) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['my-community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['manage-community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['community-post', editId] }),
      ]);
      toast.success(post.status === 'DRAFT' ? 'تم حفظ المسودة' : 'تم نشر مشاركتك في المجتمع');
      navigate('/community');
    },
    onError: () => toast.error('تعذر حفظ المشاركة. راجع المحتوى وحاول مرة أخرى.'),
  });

  const submit = (nextStatus: CommunityPostStatus) => (event: FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 3 || content.trim().length < 20) {
      toast.error('اكتب عنواناً من 3 أحرف ومحتوى من 20 حرفاً على الأقل.');
      return;
    }
    saveMutation.mutate({ title: title.trim(), content: content.trim(), category, status: nextStatus, coverImage });
  };

  if (!user) return null;
  if (editId && editQuery.isPending) return <div className="container-page py-20 text-center text-slate-500">نحمّل مشاركتك...</div>;
  if (editId && !editQuery.isPending && (editQuery.isError || !currentPost)) return <div dir="rtl" className="container-page py-20 text-center"><p className="font-bold">لا يمكنك تعديل هذه المشاركة أو أنها غير موجودة.</p><Link to="/community" className="mt-4 inline-flex items-center gap-2 text-cyan-700"><ArrowRight className="size-4"/>عودة للمجتمع</Link></div>;

  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-16">
    <div className="container-page py-8"><Link to="/community" className="inline-flex items-center gap-2 text-sm font-extrabold text-cyan-700"><ArrowRight className="size-4"/> مجتمع مبدعين</Link>
      <div className="mx-auto mt-7 max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-l from-cyan-500 to-sky-500 p-7 text-white sm:p-9"><span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold"><Sparkles className="size-4"/> مساحة آمنة للتعلّم والمشاركة</span><h1 className="mt-4 text-3xl font-black">{editId ? 'عدّل مشاركتك' : 'شارك فكرتك مع المجتمع'}</h1><p className="mt-2 text-sm leading-7 text-cyan-50">اكتب بطريقتك، وشارك ما تعلمته أو صنعته. تجنب إضافة معلوماتك الشخصية.</p></div>
        <form className="space-y-6 p-6 sm:p-9" onSubmit={submit('PUBLISHED')}>
          <label className="block"><span className="mb-2 block text-sm font-extrabold text-slate-800">عنوان المشاركة</span><input required minLength={3} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: أول لعبة صنعتها ببرنامج Scratch" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"/><span className="mt-1 block text-start text-xs text-slate-400">{title.length}/160</span></label>
          <label className="block"><span className="mb-2 block text-sm font-extrabold text-slate-800">التصنيف</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-400">{categories.map((item) => <option key={item} value={item}>#{item.replaceAll(' ', '_')}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-sm font-extrabold text-slate-800">المحتوى</span><textarea required minLength={20} maxLength={12000} rows={10} value={content} onChange={(event) => setContent(event.target.value)} placeholder="احكِ لنا عن فكرتك، كيف بدأت، وما الشيء الجديد الذي تعلمته..." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"/><span className="mt-1 block text-start text-xs text-slate-400">{content.length}/12000</span></label>
          <div><span className="mb-2 block text-sm font-extrabold text-slate-800">صورة الغلاف <span className="font-medium text-slate-400">(اختيارية)</span></span><label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-6 text-center transition hover:bg-cyan-50"><ImagePlus className="size-8 text-cyan-600"/><span className="text-sm font-bold text-cyan-800">اختر صورة من جهازك</span><span className="text-xs text-slate-500">JPG أو PNG أو WEBP أو GIF، حتى 3 ميجابايت</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 3 * 1024 * 1024) { setCoverFile(file); setCoverImage(null); } else if (file) toast.error('حجم الصورة يجب ألا يتجاوز 3 ميجابايت'); }}/></label>{preview && <img src={preview} alt="معاينة الغلاف" className="mt-4 max-h-64 w-full rounded-2xl object-cover"/>}{preview && <button type="button" onClick={() => { setCoverFile(null); setCoverImage(null); }} className="mt-2 text-xs font-bold text-rose-600">إزالة الصورة</button>}</div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between"><button type="button" disabled={saveMutation.isPending} onClick={submit('DRAFT')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"><Save className="size-4"/>حفظ كمسودة</button><button type="submit" disabled={saveMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-6 py-3 font-extrabold text-white transition hover:bg-cyan-600 disabled:opacity-60 active:translate-y-0.5 active:border-b-0">{saveMutation.isPending ? <LoaderCircle className="size-4 animate-spin"/> : <Send className="size-4"/>}{saveMutation.isPending ? 'جارٍ الحفظ...' : status === 'DRAFT' ? 'نشر المشاركة' : 'نشر في المجتمع'}</button></div>
        </form>
      </div>
    </div>
  </main>;
};
export default CommunityCreatePage;
