import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Headset, MessageCircle, Plus, Send, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CHAT_ATTACHMENT_ACCEPT, CHAT_ATTACHMENT_MAX_SIZE } from '@/lib/upload-rules';
import { getErrorMessage } from '@/services/api';
import { supportApi, type SupportTicket } from '@/services/support.service';
import { SupportConversation } from './SupportConversation';
import { Spinner } from '@/components/ui/Spinner';

type WidgetView = 'list' | 'new' | 'thread';

export const SupportChatWidget = () => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WidgetView>('list');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const ticketsQuery = useQuery({ queryKey: ['support-tickets'], queryFn: supportApi.mine, enabled: Boolean(user && user.role !== 'Admin' && (open || searchParams.has('supportTicket'))), refetchInterval: open ? 10_000 : false });
  const createMutation = useMutation({
    mutationFn: () => supportApi.create(subject.trim(), message.trim(), file ?? undefined),
    onSuccess: async (ticket) => { setSubject(''); setMessage(''); setFile(null); setSelected(ticket); setView('thread'); await queryClient.invalidateQueries({ queryKey: ['support-tickets'] }); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر بدء محادثة الدعم')),
  });
  useEffect(() => { if (selected && ticketsQuery.data) setSelected(ticketsQuery.data.find((ticket) => ticket.id === selected.id) ?? selected); }, [ticketsQuery.data, selected?.id]);
  useEffect(() => {
    const ticketId = searchParams.get('supportTicket');
    if (ticketId) setOpen(true);
    const ticket = ticketId ? ticketsQuery.data?.find((item) => item.id === ticketId) : undefined;
    if (!ticket) return;
    setSelected(ticket);
    setView('thread');
    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('supportTicket');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, ticketsQuery.data]);
  if (!user || user.role === 'Admin') return null;

  return <div className="fixed bottom-4 end-4 z-[80]" dir="rtl">
    {open ? <section className="mb-3 flex h-[min(78dvh,620px)] w-[min(94vw,390px)] flex-col overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-2xl shadow-slate-900/20" aria-label="محادثة الدعم الفني">
      <header className="flex items-center gap-3 bg-gradient-to-l from-cyan-700 to-sky-600 px-4 py-3 text-white">
        {view !== 'list' ? <button type="button" onClick={() => setView('list')} aria-label="العودة إلى المحادثات" className="rounded-xl p-2 transition hover:bg-white/15">‹</button> : <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15"><Headset className="size-5"/></span>}
        <div className="min-w-0 flex-1"><h2 className="font-extrabold">الدعم الفني</h2><p className="mt-0.5 text-[11px] text-cyan-50">نحن هنا لمساعدتك</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق الدعم" className="rounded-xl p-2 transition hover:bg-white/15"><X className="size-5"/></button>
      </header>
      {view === 'list' ? <div className="flex min-h-0 flex-1 flex-col bg-[#F8FAFC] p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-extrabold text-slate-800">محادثاتك</h3><button type="button" onClick={() => setView('new')} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-cyan-700"><Plus className="size-4"/>محادثة جديدة</button></div>
        {ticketsQuery.isPending ? <div className="grid flex-1 place-items-center"><Spinner className="size-7"/></div> : ticketsQuery.isError ? <button type="button" onClick={() => void ticketsQuery.refetch()} className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800">تعذر تحميل المحادثات. اضغط لإعادة المحاولة.</button> : ticketsQuery.data?.length ? <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">{ticketsQuery.data.map((ticket) => <button key={ticket.id} type="button" onClick={() => { setSelected(ticket); setView('thread'); }} className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-start shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40"><span className="flex items-center justify-between gap-2"><span className="truncate font-extrabold text-slate-900">{ticket.subject}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${ticket.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{ticket.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}</span></span><span className="mt-2 block truncate text-xs text-slate-500">{ticket.lastMessage || 'ابدأ المحادثة الآن'}</span><time className="mt-2 block text-[10px] text-slate-400">{new Date(ticket.updatedAt).toLocaleDateString('ar-EG')}</time></button>)}</div> : <div className="m-auto max-w-xs py-6 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800"><MessageCircle className="size-7"/></span><p className="mt-4 font-extrabold text-slate-900">لا توجد محادثات بعد</p><p className="mt-1 text-sm leading-6 text-slate-500">ابدأ محادثة جديدة وسيجيبك فريق مبدعين.</p><button type="button" onClick={() => setView('new')} className="mt-4 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white">تواصل مع الدعم</button></div>}
      </div> : null}
      {view === 'new' ? <form onSubmit={(event: FormEvent) => { event.preventDefault(); createMutation.mutate(); }} className="flex min-h-0 flex-1 flex-col gap-3 bg-[#F8FAFC] p-4">
        <div><label htmlFor="support-subject" className="mb-1.5 block text-xs font-extrabold text-slate-700">موضوع المحادثة</label><input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} minLength={3} required placeholder="مثال: مشكلة في الحساب" className="input w-full bg-white"/></div>
        <div className="flex min-h-0 flex-1 flex-col"><label htmlFor="support-message" className="mb-1.5 block text-xs font-extrabold text-slate-700">رسالتك</label><textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="اكتب التفاصيل التي تساعدنا على فهم طلبك..." className="input min-h-28 flex-1 resize-none bg-white"/></div>
        {file ? <div className="flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-900"><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="إزالة المرفق"><X className="size-4"/></button></div> : null}
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-800"><Plus className="size-4"/>إرفاق صورة أو فيديو أو ملف<input type="file" accept={CHAT_ATTACHMENT_ACCEPT} className="sr-only" onChange={(event) => { const selectedFile = event.target.files?.[0] ?? null; if (selectedFile && selectedFile.size > CHAT_ATTACHMENT_MAX_SIZE) { toast.error('الحد الأقصى لحجم الملف 15 ميجابايت'); event.target.value = ''; return; } setFile(selectedFile); }}/></label>
        <button type="submit" disabled={createMutation.isPending || subject.trim().length < 3 || (!message.trim() && !file)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-b-4 border-cyan-800 bg-cyan-600 px-4 py-2.5 font-extrabold text-white active:translate-y-0.5 active:border-b-0 disabled:opacity-50">{createMutation.isPending ? <Spinner className="size-4 text-white"/> : <Send className="size-4"/>}بدء المحادثة</button>
      </form> : null}
      {view === 'thread' && selected ? <div className="min-h-0 flex-1 p-3"><SupportConversation ticket={selected}/></div> : null}
    </section> : null}
    <button type="button" onClick={() => setOpen((value) => !value)} className="ms-auto flex min-h-14 items-center gap-3 rounded-full border-b-4 border-cyan-800 bg-cyan-600 px-5 text-white shadow-xl shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:bg-cyan-700 active:translate-y-0.5 active:border-b-0" aria-label={open ? 'إغلاق الدعم الفني' : 'فتح الدعم الفني'}>
      <span className="relative flex size-9 items-center justify-center rounded-full bg-white/15"><Headset className="size-5"/><span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-cyan-600 bg-lime-300"/></span><span className="text-sm font-extrabold">الدعم الفني</span>
    </button>
  </div>;
};
