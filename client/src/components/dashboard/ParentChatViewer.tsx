import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ParentChatAttachment } from '@/components/dashboard/ParentChatAttachment';
import { parentApi, type ChildConversation } from '@/services/parent.service';

export const ParentChatViewer = ({ childId, childName }: { childId: string; childName: string }) => {
  const [selected, setSelected] = useState<ChildConversation | null>(null);
  const [filter, setFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversations = useQuery({ queryKey: ['parent-child-conversations', childId], queryFn: () => parentApi.childConversations(childId) });
  const messages = useQuery({
    queryKey: ['parent-child-messages', childId, selected?.peerId, selected?.serviceId],
    queryFn: () => parentApi.childMessages(childId, selected!.peerId, selected!.serviceId),
    enabled: Boolean(selected),
  });

  useEffect(() => { if (!selected && conversations.data?.length) setSelected(conversations.data[0]); }, [selected, conversations.data]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.data]);
  const visibleConversations = (conversations.data ?? []).filter((conversation) => `${conversation.peerName} ${conversation.lastMessage} ${conversation.serviceTitle ?? ''}`.toLocaleLowerCase('ar').includes(filter.trim().toLocaleLowerCase('ar')));

  return <div className="grid min-w-0 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 lg:h-[min(76vh,820px)] lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
    <section className="order-last flex min-h-[420px] min-w-0 flex-col bg-[#f8fafc] lg:order-none lg:col-start-2 lg:row-start-1 lg:min-h-0">
      <header className="flex min-h-[78px] items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
        {selected ? <div className="flex min-w-0 items-center gap-3"><Avatar name={selected.peerName} src={selected.peerAvatar} className="size-11 rounded-2xl"/><div className="min-w-0"><h3 className="truncate text-base font-black text-slate-900">{selected.peerName}</h3><p className="mt-1 truncate text-xs text-slate-500">{selected.serviceTitle || `محادثة مع ${childName}`}</p></div></div> : <div><h3 className="font-black text-slate-900">سجل المحادثة</h3><p className="mt-1 text-xs text-slate-500">اختر محادثة من القائمة</p></div>}
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800 sm:text-xs"><ShieldCheck className="size-4"/><span className="hidden sm:inline">بيانات التواصل محمية</span><span className="sm:hidden">قراءة فقط</span></div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {!selected && !conversations.isPending ? <div className="grid h-full min-h-64 place-items-center text-center"><div><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><MessageCircle className="size-7"/></span><p className="mt-3 text-sm font-bold text-slate-600">اختر محادثة لعرض سجلها</p></div></div> : null}
        {messages.isPending && selected ? <p className="py-8 text-center text-sm text-slate-500">جارٍ تحميل الرسائل…</p> : null}
        {messages.isError ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">تعذر تحميل الرسائل. حاول اختيار المحادثة مرة أخرى.</p> : null}
        {messages.data?.map((message) => {
          const isChildMessage = message.senderId === childId;
          return <div key={message.id} className={`flex ${isChildMessage ? 'justify-start' : 'justify-end'}`}>
            <article className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[76%] ${isChildMessage ? 'rounded-br-md bg-cyan-700 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800'}`}>
              <p className={`mb-1.5 text-[11px] font-extrabold ${isChildMessage ? 'text-cyan-100' : 'text-cyan-800'}`}>{message.senderName}</p>
              {message.content ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p> : null}
              {message.attachmentName ? <ParentChatAttachment childId={childId} messageId={message.id} name={message.attachmentName} mimeType={message.attachmentMime}/> : null}
              <time className={`mt-2 block text-[10px] ${isChildMessage ? 'text-cyan-100/80' : 'text-slate-400'}`} dir="ltr">{new Date(message.createdAt).toLocaleString('ar-EG')}</time>
            </article>
          </div>;
        })}
        {messages.data?.length === 0 && selected ? <p className="py-8 text-center text-sm text-slate-500">لا توجد رسائل في هذه المحادثة بعد.</p> : null}
        <div ref={messagesEndRef}/>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-slate-100 bg-white px-4 py-3 text-center text-xs text-slate-500"><Eye className="size-3.5 text-cyan-700"/>عرض للمتابعة فقط؛ لا يمكن الإرسال أو تعديل الرسائل.</footer>
    </section>

    <aside className="order-first flex min-h-0 min-w-0 flex-col border-b border-slate-100 bg-white lg:order-none lg:col-start-1 lg:row-start-1 lg:border-b-0 lg:border-s-0 lg:border-e">
      <header className="space-y-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-lg font-black text-slate-900">صندوق المحادثات</h2><p className="mt-1 text-xs leading-5 text-slate-500">تُعرض الرسائل المرتبطة بخدمة في محادثة مستقلة.</p></div><label className="flex h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 focus-within:ring-2 focus-within:ring-cyan-200"><Search className="size-4 shrink-0"/><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="ابحث في المحادثات" className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400" aria-label="البحث في المحادثات"/></label><p className="text-[11px] font-bold text-slate-400">{visibleConversations.length} محادثة</p></header>
      <div className="min-h-0 max-h-64 flex-1 divide-y divide-slate-100 overflow-y-auto lg:max-h-none">
        {conversations.isPending ? <p className="p-5 text-center text-sm text-slate-500">جارٍ تحميل المحادثات…</p> : null}
        {conversations.isError ? <p className="p-5 text-center text-sm leading-6 text-rose-700">تعذر تحميل المحادثات. أعد فتح التبويب للمحاولة مجدداً.</p> : null}
        {visibleConversations.map((conversation) => {
          const active = selected?.peerId === conversation.peerId && selected?.serviceId === conversation.serviceId;
          return <button type="button" key={`${conversation.peerId}:${conversation.serviceId ?? 'general'}`} onClick={() => setSelected(conversation)} aria-pressed={active} className={`flex w-full min-w-0 items-center gap-3 px-4 py-4 text-start transition sm:px-5 ${active ? 'bg-cyan-50' : 'hover:bg-slate-50'}`}>
            <Avatar name={conversation.peerName} src={conversation.peerAvatar} className="size-11 rounded-2xl"/>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-slate-900">{conversation.peerName}</span><span className="mt-1 block truncate text-[11px] text-cyan-800">{conversation.serviceTitle || 'محادثة عامة'}</span><span className="mt-1 block truncate text-xs text-slate-500">{conversation.lastMessage || 'لا توجد رسائل بعد'}</span></span>
            <time className="shrink-0 text-[10px] text-slate-400">{new Date(conversation.lastMessageAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</time>
          </button>;
        })}
        {!conversations.isPending && !conversations.isError && !visibleConversations.length ? <p className="p-5 text-center text-xs text-slate-500">{conversations.data?.length ? 'لا توجد محادثات مطابقة للبحث.' : 'لا توجد محادثات لهذا الحساب حتى الآن.'}</p> : null}
      </div>
    </aside>
  </div>;
};
