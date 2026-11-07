import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { ordersApi, type OrderStatus } from '@/services/orders.service';

export const OrderChat = ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
  const [content, setContent] = useState('');
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const readOnly = status === 'COMPLETED' || status === 'CANCELLED';
  const key = ['order-messages', orderId] as const;
  const messages = useQuery({
    queryKey: key,
    queryFn: () => ordersApi.messages(orderId),
    // The order SSE event refreshes instantly; polling protects the chat during reconnects.
    refetchInterval: readOnly ? false : 5000,
  });
  const send = useMutation({
    mutationFn: (text: string) => ordersApi.sendMessage(orderId, text),
    onSuccess: async () => { setContent(''); await queryClient.invalidateQueries({ queryKey: key }); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إرسال الرسالة.')),
  });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.data?.length]);
  const submit = (event: FormEvent) => { event.preventDefault(); const text = content.trim(); if (text && !send.isPending && !readOnly) send.mutate(text); };

  return <section className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg shadow-slate-200/30 lg:min-h-[38rem]" aria-label="محادثة الطلب">
    <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-700"><MessageCircle className="size-5"/></span><div><h2 className="font-black text-slate-900">محادثة الطلب</h2><p className="mt-0.5 text-xs text-slate-500">رسائل خاصة بين طرفي هذا الطلب</p></div><span className="me-auto size-2 rounded-full bg-emerald-500" title="يتم تحديث الرسائل تلقائياً"/></header>
    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5" aria-live="polite">
      {messages.isPending ? <div className="grid h-full min-h-40 place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-600"/></div> : messages.isError ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><p>تعذر تحميل الرسائل.</p><button type="button" className="mt-2 font-bold text-brand-700" onClick={() => void messages.refetch()}>إعادة المحاولة</button></div> : messages.data?.length ? messages.data.map((message) => {
        const mine = message.senderId === user?.id;
        return <article key={message.id} className={`max-w-[88%] rounded-2xl border px-4 py-3 ${mine ? 'ms-auto border-brand-100 bg-brand-50' : 'me-auto border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-3"><p className="text-xs font-extrabold text-slate-800">{mine ? 'أنت' : message.senderName}</p><time className="text-[10px] text-slate-400" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</time></div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.content}</p>
        </article>;
      }) : <div className="grid h-full min-h-40 place-items-center text-center"><div><MessageCircle className="mx-auto size-8 text-slate-300"/><p className="mt-3 text-sm font-bold text-slate-500">ابدأ المحادثة حول تفاصيل الطلب.</p></div></div>}
      <div ref={bottomRef}/>
    </div>
    {readOnly ? <p className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-center text-xs font-bold text-slate-500">أُغلقت المحادثة مع انتهاء الطلب، ويمكنك مراجعة الرسائل السابقة.</p> : <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3 sm:p-4"><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={4000} rows={2} placeholder="اكتب رسالة للطرف الآخر…" aria-label="رسالة الطلب" className="input min-h-12 min-w-0 flex-1 resize-y py-3"/><button className="btn btn-primary self-end" type="submit" disabled={!content.trim() || send.isPending} aria-label="إرسال الرسالة">{send.isPending ? <LoaderCircle className="size-4 animate-spin"/> : <Send className="size-4"/>}<span className="hidden sm:inline">إرسال</span></button></form>}
  </section>;
};
