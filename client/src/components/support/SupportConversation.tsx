import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, LoaderCircle, Paperclip, Send, X } from 'lucide-react';
import { ImageLightboxModal } from '@/components/community/ImageLightboxModal';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { CHAT_ATTACHMENT_ACCEPT, CHAT_ATTACHMENT_MAX_SIZE } from '@/lib/upload-rules';
import { getErrorMessage } from '@/services/api';
import { supportApi, type SupportMessage, type SupportTicket } from '@/services/support.service';

const MessageAttachment = ({ ticketId, message }: { ticketId: string; message: SupportMessage }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    void supportApi.attachment(ticketId, message.id).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [ticketId, message.id]);

  if (failed) return <span className="mt-2 block rounded-xl bg-black/5 px-3 py-2 text-xs">تعذر تحميل المرفق</span>;
  if (!url) return <span className="mt-2 inline-flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs"><Spinner className="size-3.5"/>جاري تحميل المرفق…</span>;
  if (message.attachmentType === 'IMAGE') return <>
    <button type="button" onClick={() => setLightboxOpen(true)} className="mt-2 block max-w-full overflow-hidden rounded-2xl bg-slate-100" aria-label={`عرض ${message.attachmentName ?? 'الصورة'}`}><img src={url} alt={message.attachmentName ?? 'مرفق صورة'} className="max-h-64 max-w-full object-contain"/></button>
    {lightboxOpen ? <ImageLightboxModal src={url} title={message.attachmentName ?? 'مرفق صورة'} onClose={() => setLightboxOpen(false)}/> : null}
  </>;
  if (message.attachmentType === 'VIDEO') return <video src={url} controls playsInline className="mt-2 max-h-64 max-w-full rounded-2xl bg-black"/>;
  return <a href={url} download={message.attachmentName ?? 'support-attachment'} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs font-bold underline"><FileText className="size-4 shrink-0"/><span className="truncate">{message.attachmentName ?? 'ملف مرفق'}</span><Download className="size-4 shrink-0"/></a>;
};

export const SupportConversation = ({ ticket, isAdmin = false }: { ticket: SupportTicket; isAdmin?: boolean }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messagesQuery = useQuery({ queryKey: ['support-messages', ticket.id], queryFn: () => supportApi.messages(ticket.id), refetchInterval: 5000 });
  const sendMutation = useMutation({
    mutationFn: () => supportApi.send(ticket.id, message.trim(), file ?? undefined),
    onSuccess: async () => { setMessage(''); setFile(null); await Promise.all([queryClient.invalidateQueries({ queryKey: ['support-messages', ticket.id] }), queryClient.invalidateQueries({ queryKey: [isAdmin ? 'admin-support-tickets' : 'support-tickets'] })]); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إرسال الرسالة')),
  });
  useEffect(() => { const viewport = messagesViewportRef.current; if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' }); }, [messagesQuery.data?.messages.length]);

  const submit = (event: FormEvent) => { event.preventDefault(); if (message.trim() || file) sendMutation.mutate(); };
  const closed = ticket.status === 'CLOSED';

  return <section className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
    <header className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-l from-cyan-50/80 via-white to-orange-50/60 p-4">
      {!isAdmin ? <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800"><FileText className="size-5"/></span> : null}
      <div className="min-w-0 flex-1"><h3 className="truncate font-extrabold text-slate-900">{ticket.subject}</h3>{isAdmin ? <p className="mt-1 truncate text-xs text-slate-500">{ticket.userName} · {ticket.userEmail}</p> : null}</div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold ${closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{closed ? 'مغلقة' : 'مفتوحة'}</span>
    </header>
    <div ref={messagesViewportRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth bg-[#F8FAFC] p-4 sm:p-5">
      {messagesQuery.isPending ? <div className="grid flex-1 place-items-center"><Spinner className="size-7"/></div> : null}
      {messagesQuery.isError ? <p className="m-auto text-sm font-bold text-rose-700">تعذر تحميل الرسائل. أعد فتح المحادثة للمحاولة.</p> : null}
      {messagesQuery.data?.messages.map((item) => {
        const own = isAdmin ? item.senderType === 'ADMIN' : item.senderType === 'USER';
        return <article key={item.id} className={`flex max-w-[92%] items-end gap-2 ${own ? 'ms-auto flex-row-reverse' : 'me-auto'}`}>
          {!own ? <Avatar name={item.senderName} src={item.senderAvatar} className="size-8 rounded-xl"/> : null}
          <div className={`min-w-0 rounded-2xl px-4 py-3 shadow-sm ${own ? 'rounded-ee-md bg-cyan-700 text-white' : 'rounded-es-md border border-slate-100 bg-white text-slate-800'}`}>
            {isAdmin ? <p className={`mb-1 text-[10px] font-bold ${own ? 'text-cyan-100' : 'text-cyan-800'}`}>{item.senderName}</p> : null}
            {item.message ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.message}</p> : null}
            {item.attachmentUrl ? <MessageAttachment ticketId={ticket.id} message={item}/> : null}
            <time className={`mt-1 block text-[10px] ${own ? 'text-cyan-100' : 'text-slate-400'}`} dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</time>
          </div>
        </article>;
      })}
    </div>
    {closed ? <p className="border-t border-slate-100 bg-slate-50 px-4 py-4 text-center text-sm font-bold text-slate-500">أُغلقت هذه المحادثة، ولا يمكن إرسال رسائل جديدة.</p> : <form onSubmit={submit} className="border-t border-slate-100 bg-white p-3 sm:p-4">
      {file ? <div className="mb-2 flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-900"><FileText className="size-4"/><span className="min-w-0 flex-1 truncate">{file.name}</span><span>{(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => setFile(null)} aria-label="إزالة المرفق" className="rounded-full p-1 hover:bg-cyan-100"><X className="size-4"/></button></div> : null}
      <div className="flex items-end gap-2">
        <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-orange-50 text-orange-700 transition hover:bg-orange-100" title="إرفاق صورة أو فيديو أو ملف"><Paperclip className="size-5"/><input type="file" className="sr-only" accept={CHAT_ATTACHMENT_ACCEPT} onChange={(event) => { const selected = event.target.files?.[0] ?? null; if (selected && selected.size > CHAT_ATTACHMENT_MAX_SIZE) { toast.error('الحد الأقصى لحجم الملف 15 ميجابايت'); event.target.value = ''; return; } setFile(selected); }}/></label>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={1} maxLength={4000} placeholder="اكتب رسالتك للدعم الفني..." className="max-h-28 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-50"/>
        <button type="submit" disabled={sendMutation.isPending || (!message.trim() && !file)} aria-label="إرسال الرسالة" className="flex size-11 shrink-0 items-center justify-center rounded-xl border-b-4 border-cyan-800 bg-cyan-600 text-white transition hover:bg-cyan-700 active:translate-y-0.5 active:border-b-0 disabled:opacity-50">{sendMutation.isPending ? <LoaderCircle className="size-5 animate-spin"/> : <Send className="size-5"/>}</button>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">يمكن إرفاق صورة أو فيديو أو PDF أو ملف نصي، بحد أقصى 15 ميجابايت.</p>
    </form>}
  </section>;
};
