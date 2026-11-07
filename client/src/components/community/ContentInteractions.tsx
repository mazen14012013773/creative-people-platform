import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Heart, ImagePlus, MessageCircle, Send, Trash2, X } from 'lucide-react';
import { MediaViewer } from '@/components/common/MediaViewer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageLightboxModal } from './ImageLightboxModal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CHAT_ATTACHMENT_MAX_SIZE, COMMUNITY_COMMENT_ACCEPT, COMMUNITY_COMMENT_EXTENSIONS_LABEL } from '@/lib/upload-rules';
import type { CommunityPostComment, InteractionSummary } from '@/types';

export interface ContentInteractionApi {
  comments: (id: string) => Promise<CommunityPostComment[]>;
  comment: (id: string, content: string, file?: File) => Promise<CommunityPostComment>;
  toggleLike: (id: string) => Promise<{ liked: boolean; likesCount: number }>;
  removeComment: (id: string) => Promise<void>;
}

interface ContentInteractionsProps {
  contentId: string;
  contentType: 'post' | 'article';
  initial: InteractionSummary;
  api: ContentInteractionApi;
}

const roleLabels = { Freelancer: 'مستقل', Buyer: 'عميل', Parent: 'ولي أمر', Admin: 'إدارة' } as const;
const roleStyles = { Freelancer: 'bg-cyan-100 text-cyan-800', Buyer: 'bg-orange-100 text-orange-800', Parent: 'bg-violet-100 text-violet-800', Admin: 'bg-lime-100 text-lime-800' } as const;

const elapsed = (date: string): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3_600], ['minute', 60]];
  const formatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  const unit = units.find(([, size]) => seconds >= size);
  return unit ? formatter.format(-Math.floor(seconds / unit[1]), unit[0]) : 'الآن';
};

export const ContentInteractions = ({ contentId, contentType, initial, api }: ContentInteractionsProps) => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [liked, setLiked] = useState(initial.likedByMe);
  const [likesCount, setLikesCount] = useState(initial.likesCount);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const commentsKey = ['content-comments', contentType, contentId];
  const commentsQuery = useQuery({ queryKey: commentsKey, queryFn: () => api.comments(contentId) });
  useEffect(() => { setLiked(initial.likedByMe); setLikesCount(initial.likesCount); }, [initial.likedByMe, initial.likesCount, contentId]);
  useEffect(() => {
    if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) { setFilePreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const likeMutation = useMutation({
    mutationFn: () => api.toggleLike(contentId),
    onMutate: () => {
      const previous = { liked, likesCount };
      setLiked(!liked);
      setLikesCount((count) => Math.max(0, count + (liked ? -1 : 1)));
      return previous;
    },
    onSuccess: (result) => { setLiked(result.liked); setLikesCount(result.likesCount); },
    onError: (_error, _variables, previous) => {
      if (previous) { setLiked(previous.liked); setLikesCount(previous.likesCount); }
      toast.error('تعذر تسجيل الإعجاب');
    },
  });
  const commentMutation = useMutation({
    mutationFn: () => api.comment(contentId, text.trim(), file ?? undefined),
    onSuccess: async () => {
      setText(''); setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: commentsKey });
      toast.success('تم إضافة تعليقك');
    },
    onError: () => toast.error('تعذر إضافة التعليق'),
  });
  const deleteMutation = useMutation({
    mutationFn: api.removeComment,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: commentsKey }); toast.success('تم حذف التعليق'); },
    onError: () => toast.error('تعذر حذف التعليق'),
  });

  return <><section className="mt-7 border-t border-slate-100 pt-6" aria-label="التفاعل مع المحتوى">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={!user || likeMutation.isPending} onClick={() => likeMutation.mutate()} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${liked ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'}`} title={!user ? 'سجل الدخول للإعجاب' : undefined}>
        <Heart className={`size-5 transition ${liked ? 'scale-110 fill-current' : ''}`} /> {likesCount} إعجاب
      </button>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><MessageCircle className="size-4 text-cyan-600"/>{commentsQuery.data?.length ?? initial.commentsCount} تعليق</span>
    </div>

    <h2 className="mt-7 text-xl font-black text-slate-900">التعليقات</h2>
    {user ? <form className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3" onSubmit={(event) => { event.preventDefault(); if (text.trim() || file) commentMutation.mutate(); }}>
      <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={3} placeholder="اكتب تعليقًا لطيفًا..." className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
      {file ? <div className="mt-3 flex items-start gap-3 rounded-xl bg-white p-3"><div className="min-w-0 flex-1">{filePreviewUrl && file.type.startsWith('image/') ? <img src={filePreviewUrl} alt={file.name} className="max-h-48 rounded-2xl object-contain"/> : filePreviewUrl ? <video src={filePreviewUrl} controls playsInline className="max-h-48 max-w-full rounded-2xl bg-slate-950 object-contain"/> : <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><FileText className="size-4 text-cyan-700"/>{file.name}</p>}</div><button type="button" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} className="rounded-full p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="إزالة المرفق"><X className="size-4"/></button></div> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><input ref={inputRef} type="file" accept={COMMUNITY_COMMENT_ACCEPT} className="sr-only" onChange={(event) => { const selected = event.target.files?.[0] ?? null; event.currentTarget.value = ''; if (!selected) return; if (selected.size > CHAT_ATTACHMENT_MAX_SIZE) { toast.error('حجم المرفق يتجاوز 15 ميجابايت.'); return; } setFile(selected); }} /><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-extrabold text-cyan-800 hover:bg-cyan-100"><ImagePlus className="size-4"/>إرفاق صورة أو فيديو أو ملف</button><button type="submit" disabled={(!text.trim() && !file) || commentMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_3px_0_#0e7490] transition hover:bg-cyan-700 active:translate-y-0.5 active:shadow-none disabled:opacity-50"><Send className="size-4"/>إرسال التعليق</button></div>
      <p className="mt-2 text-[11px] text-slate-500">الحد الأقصى للمرفق 15 ميجابايت. الامتدادات المسموحة: {COMMUNITY_COMMENT_EXTENSIONS_LABEL}.</p>
    </form> : <p className="mt-3 rounded-xl bg-cyan-50 p-4 text-sm font-semibold text-cyan-800">سجّل الدخول لتضيف تعليقًا أو إعجابًا.</p>}

    {commentsQuery.isPending ? <p className="mt-5 text-sm text-slate-500">جارٍ تحميل التعليقات...</p> : null}
    {commentsQuery.isError ? <button type="button" onClick={() => void commentsQuery.refetch()} className="mt-5 text-sm font-bold text-rose-600">تعذر تحميل التعليقات. أعد المحاولة</button> : null}
    <div className="mt-4 space-y-3">{commentsQuery.data?.map((comment) => {
      const canDelete = user?.id === comment.userId || user?.role === 'Admin';
      return <article key={comment.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><img src={comment.authorAvatar || '/images/articles/author.svg'} alt="" className="size-10 shrink-0 rounded-full border border-slate-100 object-cover"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-extrabold text-slate-900">{comment.authorName}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${roleStyles[comment.authorRole]}`}>{roleLabels[comment.authorRole]}</span><time className="text-xs text-slate-400">{elapsed(comment.createdAt)}</time>{canDelete ? <button type="button" disabled={deleteMutation.isPending} onClick={() => setDeleteCommentId(comment.id)} className="ms-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label="حذف التعليق"><Trash2 className="size-4"/></button> : null}</div>{comment.content ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{comment.content}</p> : null}{comment.attachmentUrl ? <div className="mt-3">{comment.attachmentType === 'IMAGE' || comment.attachmentType === 'VIDEO' ? <MediaViewer url={comment.attachmentUrl} title={`مرفق من ${comment.authorName}`} aspect="video" className="max-h-80 max-w-xl rounded-2xl" onImageClick={comment.attachmentType === 'IMAGE' ? () => setPreviewImage({ src: comment.attachmentUrl!, title: `مرفق من ${comment.authorName}` }) : undefined} /> : <a href={comment.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800"><FileText className="size-4"/>فتح الملف المرفق</a>}</div> : null}</div></article>;
    })}</div>
    {!commentsQuery.isPending && !commentsQuery.isError && !commentsQuery.data?.length ? <p className="py-6 text-center text-sm text-slate-500">لا توجد تعليقات بعد. كن أول من يشارك رأيه.</p> : null}
  </section>{previewImage ? <ImageLightboxModal src={previewImage.src} title={previewImage.title} onClose={() => setPreviewImage(null)} /> : null}
  <ConfirmDialog open={Boolean(deleteCommentId)} title="حذف التعليق" description="سيتم حذف هذا التعليق ومرفقه نهائيًا. هل تريد المتابعة؟" confirmLabel="حذف التعليق" busy={deleteMutation.isPending} onCancel={() => setDeleteCommentId(null)} onConfirm={() => { if (deleteCommentId) deleteMutation.mutate(deleteCommentId, { onSuccess: () => setDeleteCommentId(null) }); }} /></>;
};
