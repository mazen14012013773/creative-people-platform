import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { parentApi } from '@/services/parent.service';

export const ChildParentChatPrivacyPanel = () => {
  const toast = useToast();
  const client = useQueryClient();
  const parents = useQuery({ queryKey: ['parent-chat-consent'], queryFn: parentApi.chatConsents });
  const accessLog = useQuery({ queryKey: ['parent-access-log'], queryFn: parentApi.accessLog, refetchInterval: 30_000 });
  const approve = useMutation({
    mutationFn: parentApi.approveExistingChatAccess,
    onSuccess: async () => {
      toast.success('تم تفعيل متابعة المحادثات');
      await Promise.all([client.invalidateQueries({ queryKey: ['parent-chat-consent'] }), client.invalidateQueries({ queryKey: ['parent-access-log'] })]);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث صلاحية المتابعة')),
  });

  return <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-lg shadow-cyan-100/30" dir="rtl">
    <header className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><ShieldCheck className="size-5"/></span><div><h2 className="font-black text-slate-900">متابعة ولي الأمر</h2><p className="mt-1 text-xs leading-5 text-slate-600">عند موافقتك على ربط الحساب، يستطيع ولي أمرك المرتبط الاطلاع على ملفك وخدماتك ومعرض أعمالك ومحادثاتك ومرفقاتها للقراءة فقط. لا يمكنه إرسال رسائل باسمك. يظهر سجل الاطلاع هنا.</p></div></header>
    {parents.isPending ? <p className="mt-4 text-sm text-slate-500">جارٍ تحميل الحسابات المرتبطة…</p> : null}
    {parents.data?.length ? <div className="mt-4 space-y-2">{parents.data.map((parent) => <div key={parent.linkId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-cyan-50/60 p-3"><Avatar name={parent.parentName} src={parent.parentAvatar} className="size-10 rounded-xl"/><div className="min-w-0 flex-1"><p className="font-bold text-slate-800">{parent.parentName}</p><p className="text-xs text-emerald-700">{parent.chatAccessEnabled ? 'الربط مقبول — يمكنه متابعة المحادثات والمحتوى' : 'رُبط الحساب سابقاً قبل توضيح صلاحية المحادثات'}</p></div>{!parent.chatAccessEnabled ? <button type="button" disabled={approve.isPending} onClick={() => approve.mutate(parent.linkId)} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">تأكيد إتاحة المحادثات والمرفقات</button> : null}</div>)}</div> : !parents.isPending ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">لا يوجد ولي أمر مرتبط بحسابك حالياً.</p> : null}
    <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-center gap-2 text-sm font-extrabold text-slate-700"><History className="size-4 text-violet-600"/>سجل الاطلاع على المحادثات</div>{accessLog.isPending ? <p className="mt-2 text-xs text-slate-500">جارٍ تحميل السجل…</p> : null}{accessLog.data?.length ? <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">{accessLog.data.map((entry) => <li key={entry.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-700">{entry.parentName} — {entry.action === 'VIEW_MESSAGES' ? `فتح محادثة ${entry.peerName ?? ''}` : 'فتح قائمة المحادثات'}</span><time className="text-slate-400" dir="ltr">{new Date(entry.createdAt).toLocaleString('ar-EG')}</time></li>)}</ul> : !accessLog.isPending ? <p className="mt-2 text-xs text-slate-400">لا توجد عمليات اطلاع مسجلة.</p> : null}</div>
  </section>;
};
