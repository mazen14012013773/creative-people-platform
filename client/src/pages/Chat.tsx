import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Download, FileText, MessageCircle, Paperclip, Send, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CHAT_ATTACHMENT_ACCEPT, CHAT_ATTACHMENT_MAX_SIZE } from '@/lib/upload-rules';
import { formatDate } from '@/lib/utils';
import { chatApi } from '@/services/chat.service';
import { api, getErrorMessage } from '@/services/api';
import { freelancersApi } from '@/services/freelancers.service';
import type { ChatMessage } from '@/types';

const SERVICE_PATH_PATTERN = /(\/freelancers\/[0-9a-f-]+\?serviceId=[0-9a-f-]+)/gi;
const isServicePath = (value: string) => /^\/freelancers\/[0-9a-f-]+\?serviceId=[0-9a-f-]+$/i.test(value);

const MessageContent = ({ content }: { content: string }) => (
  <>
    {content.split(SERVICE_PATH_PATTERN).map((part, index) => isServicePath(part)
      ? <Link key={`${part}-${index}`} to={part} className="break-all font-semibold underline underline-offset-2" onClick={(event) => event.stopPropagation()}>{part}</Link>
      : part)}
  </>
);

const ChatAttachment = ({ message, mine }: { message: ChatMessage; mine: boolean }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const attachment = message.attachment;

  useEffect(() => {
    if (!attachment) return undefined;
    let active = true;
    let objectUrl: string | null = null;
    api.get(attachment.downloadUrl, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment?.downloadUrl]);

  if (!attachment) return null;
  const cardStyle = mine ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-800';
  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  return (
    <div className={`mt-2 min-w-48 max-w-full overflow-hidden rounded-xl border ${cardStyle}`}>
      {url && isImage ? <a href={url} target="_blank" rel="noreferrer" title="فتح الصورة بالحجم الكامل"><img src={url} alt={attachment.name} className="max-h-64 w-full object-contain" /></a> : null}
      {url && isVideo ? <video src={url} controls preload="metadata" className="max-h-64 w-full bg-black" /> : null}
      {!url && isImage ? <div className="flex h-24 items-center justify-center"><FileText className="size-8 opacity-50" /></div> : null}
      <div className="flex items-center gap-2 px-3 py-2">
        <FileText className="size-5 shrink-0" />
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{attachment.name}</span><span className="text-[10px] opacity-70">{(attachment.size / 1024 / 1024).toFixed(1)} MB</span></span>
        {url ? <><a className="text-xs font-bold underline" href={url} target="_blank" rel="noreferrer" title="فتح الملف">فتح</a><a className="rounded-lg p-1" href={url} download={attachment.name} title="تنزيل الملف" aria-label="تنزيل الملف"><Download className="size-4" /></a></> : failed ? <span className="text-[10px] text-rose-500">تعذر فتح الملف</span> : <span className="text-[10px] opacity-70">جارٍ التحميل...</span>}
      </div>
    </div>
  );
};

export const ChatPage = () => {
  useDocumentTitle('المحادثات الداخلية');
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const peerId = searchParams.get('userId');
  const serviceId = searchParams.get('serviceId');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const handledInitialMessage = useRef<string | null>(null);
  const initialMessage = searchParams.get('message');
  const initialRequestId = searchParams.get('requestId');

  const conversationsQuery = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatApi.conversations,
  });

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', peerId, serviceId],
    queryFn: () => chatApi.messages(peerId as string, serviceId ?? undefined),
    enabled: Boolean(peerId),
    // SSE invalidates this query immediately; polling is a fallback if the stream drops.
    refetchInterval: peerId ? 5000 : false,
  });

  const profileQuery = useQuery({
    queryKey: ['chat-peer-profile', peerId],
    queryFn: () => freelancersApi.detail(peerId as string),
    enabled: Boolean(peerId),
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: (messageContent: string) => chatApi.send({
      receiverId: peerId as string,
      serviceId,
      content: messageContent.trim(),
      file: attachment ?? undefined,
    }),
    onSuccess: (message, sentContent) => {
      setContent((current) => current === sentContent ? '' : current);
      setAttachment(null);
      setSendError(null);
      queryClient.setQueryData<ChatMessage[]>(['chat-messages', peerId, serviceId], (current = []) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: (error) => setSendError(getErrorMessage(error, 'تعذر إرسال الرسالة')),
  });

  useEffect(() => {
    const requestKey = initialRequestId ?? initialMessage;
    if (!peerId || !initialMessage || !requestKey || handledInitialMessage.current === requestKey || sendMutation.isPending) return;
    handledInitialMessage.current = requestKey;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('message');
    nextParams.delete('requestId');
    setSearchParams(nextParams, { replace: true });
    sendMutation.mutate(initialMessage);
  }, [initialMessage, initialRequestId, peerId, searchParams, sendMutation.isPending, sendMutation.mutate, setSearchParams]);

  const conversations = conversationsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const currentConversation = conversations.find((item) =>
    item.userId === peerId && item.serviceId === (serviceId ?? null),
  );
  const peerProfile = profileQuery.data?.freelancer;
  const peerName = currentConversation?.name ?? peerProfile?.name ?? 'المحادثة';
  const peerAvatar = currentConversation?.avatarUrl ?? peerProfile?.avatarUrl ?? null;
  const threadServiceTitle = currentConversation?.serviceTitle;

  useEffect(() => {
    const panel = messagesContainerRef.current;
    if (panel) panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
  }, [messages.length, peerId]);

  const openConversation = (userId: string, selectedServiceId: string | null) => {
    const next = new URLSearchParams({ userId });
    if (selectedServiceId) next.set('serviceId', selectedServiceId);
    setSearchParams(next);
    setSendError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!content.trim() && !attachment) || !peerId || sendMutation.isPending) return;
    setSendError(null);
    sendMutation.mutate(content.trim());
  };


  if (conversationsQuery.isPending) return <PageLoader label="جارٍ تحميل المحادثات..." />;

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-950">المحادثات الداخلية</h1><p className="mt-1 text-sm font-semibold text-slate-500">تواصل بأمان من داخل منصة مبدعين، دون مشاركة بيانات اتصال شخصية.</p></div>
        <Link to="/" className="btn btn-secondary btn-sm"><ArrowRight className="size-4" />الرئيسية</Link>
      </div>

      <section className="grid h-[min(76dvh,820px)] min-h-[480px] overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-card md:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className={`${peerId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-e`}>
          <div className="border-b border-slate-100 px-4 py-4"><h2 className="font-extrabold text-slate-900">صندوق المحادثات</h2><p className="mt-1 text-xs font-semibold text-slate-500">تُعرض الرسائل المرتبطة بخدمة في محادثة مستقلة.</p></div>
          {conversationsQuery.isError ? <div className="p-4"><ErrorState message="تعذر تحميل المحادثات." onRetry={() => void conversationsQuery.refetch()} /></div> : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {conversations.map((conversation) => {
              const isSelected = conversation.userId === peerId && conversation.serviceId === (serviceId ?? null);
              return (
                <button key={`${conversation.userId}:${conversation.serviceId ?? 'direct'}`} type="button" onClick={() => openConversation(conversation.userId, conversation.serviceId)} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-start transition ${isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                  <Avatar name={conversation.name} src={conversation.avatarUrl} className="size-11 rounded-2xl" />
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-extrabold text-slate-900">{conversation.name}</span>{conversation.unreadCount > 0 ? <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">{conversation.unreadCount}</span> : null}</span>{conversation.serviceTitle ? <span className="mt-0.5 block truncate text-[10px] font-bold text-brand-700">{conversation.serviceTitle}</span> : null}<span className="mt-1 block truncate text-xs text-slate-500">{conversation.lastMessage}</span></span>
                </button>
              );
            })}
            {conversations.length === 0 && !conversationsQuery.isError ? <div className="p-5"><EmptyState icon={MessageCircle} title="لا توجد محادثات بعد" description="ابدأ من بروفايل أحد المبدعين أو من بطاقة خدمة." compact /></div> : null}
          </div>
        </aside>

        <div className={`${peerId ? 'flex' : 'hidden md:flex'} min-h-0 flex-col bg-slate-50/60`}>
          {!peerId ? (
            <div className="m-auto p-6"><EmptyState icon={MessageCircle} title="اختر محادثة" description="ستظهر هنا الرسائل المتبادلة وطلبات الخدمات." /></div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <button type="button" className="btn btn-secondary btn-sm md:hidden" onClick={() => setSearchParams({})} aria-label="العودة للمحادثات"><ArrowRight className="size-4" /></button>
                <Avatar name={peerName} src={peerAvatar} className="size-10 rounded-xl" />
                <div className="min-w-0"><h2 className="truncate font-extrabold text-slate-900">{peerName}</h2><p className="text-xs font-semibold text-slate-500">{threadServiceTitle ?? 'محادثة داخلية'}</p></div><span className="ms-auto hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 sm:inline-flex"><ShieldCheck className="size-3.5" />بيانات التواصل محمية</span>
              </header>

              <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth px-4 py-5 sm:px-6">
                {messagesQuery.isPending ? <p className="text-center text-sm text-slate-500">جارٍ تحميل الرسائل...</p> : null}
                {messagesQuery.isError ? <ErrorState message="تعذر تحميل الرسائل." onRetry={() => void messagesQuery.refetch()} /> : null}
                {messages.length === 0 && !messagesQuery.isPending ? <p className="mx-auto mt-12 max-w-sm rounded-2xl border border-brand-100 bg-white p-4 text-center text-sm font-semibold leading-6 text-slate-600">ابدأ المحادثة برسالة لطيفة عن الخدمة أو العمل الذي تريد مناقشته.</p> : null}
                {messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${mine ? 'rounded-es-sm bg-brand-700 text-white' : 'rounded-ee-sm border border-slate-200 bg-white text-slate-800'}`}>
                        {message.content ? <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6"><MessageContent content={message.content} /></p> : null}
                        {message.attachment ? <ChatAttachment message={message} mine={mine} /> : null}
                        <time className={`mt-1 block text-[10px] ${mine ? 'text-brand-100' : 'text-slate-400'}`}>{formatDate(message.createdAt)}</time>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 sm:p-4">
                <p className="mb-2 text-[11px] font-semibold text-slate-500">لا تشارك أرقام الهاتف أو البريد الإلكتروني أو روابط التواصل الخارجي في الرسائل.</p>
                {attachment ? <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs"><FileText className="size-4" /><span className="min-w-0 flex-1 truncate font-bold">{attachment.name}</span><span className="text-slate-500">{(attachment.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => setAttachment(null)} aria-label="إزالة الملف"><X className="size-4" /></button></div> : null}
                <div className="flex items-end gap-2">
                  <input className="hidden" type="file" id="chat-attachment" accept={CHAT_ATTACHMENT_ACCEPT} onChange={(event) => { const selected = event.target.files?.[0] ?? null; event.currentTarget.value = ''; if (!selected) return; if (selected.size > CHAT_ATTACHMENT_MAX_SIZE) { toast.error('حجم المرفق يتجاوز 15 ميجابايت.'); return; } setAttachment(selected); }} />
                  <label htmlFor="chat-attachment" className="btn btn-secondary h-12 shrink-0 px-3" title="إرفاق ملف"><Paperclip className="size-4" /><span className="sr-only">إرفاق ملف</span></label>
                  <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={2} placeholder="اكتب رسالتك هنا..." className="input min-h-12 flex-1 resize-y" aria-label="نص الرسالة" />
                  <button type="submit" className="btn btn-primary h-12 shrink-0 px-4" disabled={(!content.trim() && !attachment) || sendMutation.isPending}>{sendMutation.isPending ? '...' : <><Send className="size-4" /><span className="hidden sm:inline">إرسال</span></>}</button>
                </div>
                {sendError ? <p className="mt-2 text-xs font-semibold text-rose-600">{sendError}</p> : null}
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
