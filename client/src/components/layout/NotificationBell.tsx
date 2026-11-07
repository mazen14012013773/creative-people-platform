import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Link2, MessageCircle, Megaphone, MessageSquareText, ShieldAlert, Star, ThumbsUp, UserRoundCheck, Trophy, BadgeCheck, BriefcaseBusiness, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi } from '@/services/notifications.service';

const formatTime = (value: string) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

const notificationIcons: Record<string, LucideIcon> = {
  NEW_MESSAGE: MessageCircle,
  NEW_REVIEW: Star,
  ACCOUNT_STATUS: UserRoundCheck,
  NEW_REPORT: ShieldAlert,
  ADMIN_ANNOUNCEMENT: Megaphone,
  NEW_POST_COMMENT: MessageSquareText,
  NEW_POST_LIKE: ThumbsUp,
  PARENT_LINK_REQUEST: Link2,
  REWARD_EARNED: Trophy,
  BADGE_EARNED: BadgeCheck,
  NEW_ORDER: BriefcaseBusiness,
  ORDER_UPDATE: BriefcaseBusiness,
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const canLoadNotifications = Boolean(
    user?.profileComplete &&
    (user.role !== 'Freelancer' || user.accountStatus === 'ACTIVE'),
  );
  const navigate = useNavigate();
  const client = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['notification-inbox'],
    queryFn: notificationsApi.inbox,
    enabled: canLoadNotifications,
    refetchInterval: 5000,
  });
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['notification-inbox'] }); };
  const readMutation = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const readAllMutation = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  if (!user || !canLoadNotifications) return null;

  const unread = query.data?.unreadCount ?? 0;
  const openItem = (item: NonNullable<typeof query.data>['items'][number]) => {
    if (!item.isRead) readMutation.mutate(item.id);
    setOpen(false);
    navigate(item.link.startsWith('/') ? item.link : '/');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:border-brand-200 hover:text-brand-700" aria-label={`الإشعارات${unread ? `، ${unread} غير مقروء` : ''}`} aria-expanded={open} aria-haspopup="dialog" title={unread ? `${unread} إشعار غير مقروء` : 'الإشعارات'}>
        <Bell className="size-5" />
        {unread > 0 ? <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold leading-5 text-white">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open ? (
        <section role="dialog" className="absolute left-0 top-full z-70 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl" dir="rtl" aria-label="مركز الإشعارات">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div><h2 className="font-extrabold">الإشعارات</h2><p className="mt-0.5 text-xs text-slate-500">{unread} غير مقروء</p></div>
            <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 disabled:opacity-50" disabled={!unread || readAllMutation.isPending} onClick={() => readAllMutation.mutate()}><CheckCheck className="size-4" />قراءة الكل</button>
          </header>
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {query.isPending ? <p className="p-5 text-center text-sm text-slate-500">جارٍ تحميل الإشعارات...</p> : null}
            {query.isError ? <button type="button" onClick={() => void query.refetch()} className="w-full p-5 text-sm font-bold text-rose-600">تعذر التحميل. أعد المحاولة</button> : null}
            {query.data?.items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">لا توجد إشعارات حتى الآن.</p> : null}
            {query.data?.items.map((item) => {
              const Icon = notificationIcons[item.type] ?? Bell;
              return <button key={item.id} type="button" onClick={() => openItem(item)} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-right transition hover:bg-slate-50 ${item.isRead ? '' : 'bg-brand-50/70'}`}>
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate text-sm">{item.title}</strong>{!item.isRead ? <i className="size-2 shrink-0 rounded-full bg-brand-600" /> : null}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">{item.message}</span><time className="mt-1 block text-[10px] text-slate-400">{formatTime(item.createdAt)}</time></span>
              </button>;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};
