import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Headset, LifeBuoy, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { supportApi, type SupportTicket } from '@/services/support.service';
import { SupportConversation } from '@/components/support/SupportConversation';
import { useSearchParams } from 'react-router-dom';

const MIN_REASON = 0;
const PAGE_SIZE = 20;

export const AdminSupportPanel = () => {
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusDialog, setStatusDialog] = useState<{ ticket: SupportTicket; status: 'OPEN' | 'CLOSED' } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const ticketsQuery = useQuery({ queryKey: ['admin-support-tickets', page], queryFn: () => supportApi.all({ page, limit: PAGE_SIZE }), refetchInterval: 10_000 });
  const tickets = ticketsQuery.data?.items ?? [];
  const requestedTicketId = searchParams.get('ticketId');
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('ar');
    return tickets.filter((ticket) => !term || `${ticket.subject} ${ticket.userName ?? ''} ${ticket.userEmail ?? ''}`.toLocaleLowerCase('ar').includes(term));
  }, [tickets, search]);
  const selected = visible.find((ticket) => ticket.id === selectedId) ?? tickets.find((ticket) => ticket.id === selectedId) ?? null;
  useEffect(() => { if (!selectedId && visible.length) setSelectedId(visible[0].id); else if (selectedId && !visible.some((ticket) => ticket.id === selectedId) && !tickets.some((ticket) => ticket.id === selectedId)) setSelectedId(visible[0]?.id ?? ''); }, [tickets, visible, selectedId]);
  useEffect(() => { if (requestedTicketId && tickets.some((ticket) => ticket.id === requestedTicketId)) setSelectedId(requestedTicketId); }, [requestedTicketId, tickets]);
  useEffect(() => { if (statusDialog) setStatusReason(''); }, [statusDialog]);
  const statusMutation = useMutation({
    mutationFn: ({ ticket, status, reason }: { ticket: SupportTicket; status: 'OPEN' | 'CLOSED'; reason: string }) => supportApi.setStatus(ticket.id, status, reason),
    onSuccess: async (_ticket, variables) => { setStatusDialog(null); toast.success(variables.status === 'CLOSED' ? 'تم إغلاق المحادثة' : 'تمت إعادة فتح المحادثة'); await queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] }); await queryClient.invalidateQueries({ queryKey: ['support-messages', variables.ticket.id] }); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث حالة المحادثة')),
  });
  const submitStatus = () => {
    if (!statusDialog) return;
    const reason = statusReason.trim();
    if (reason.length < MIN_REASON) {
      toast.error('تعذر تنفيذ القرار؛ أعد التحقق بالوجه.');
      return;
    }
    statusMutation.mutate({ ...statusDialog, reason });
  };

  return <section className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-orange-50/70 p-5 shadow-lg shadow-slate-200/30 sm:p-6">
      <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800"><Headset className="size-6"/></span><div><h2 className="text-xl font-black text-slate-900">الدعم الفني والرسائل</h2><p className="mt-1 text-sm text-slate-600">استقبل استفسارات المستخدمين وأولياء الأمور وأجب عنها من مكان واحد.</p></div></div>
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-emerald-700 shadow-sm"><ShieldCheck className="size-4"/>محادثات خاصة وآمنة</span>
    </header>
    {ticketsQuery.isPending ? <div className="grid min-h-80 place-items-center rounded-3xl bg-white"><Spinner className="size-8"/></div> : ticketsQuery.isError ? <ErrorState message="تعذر تحميل محادثات الدعم." onRetry={() => void ticketsQuery.refetch()}/> : <div className="grid min-h-[680px] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="order-2 h-[min(76vh,760px)] min-w-0 lg:order-1">{selected ? <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{selected.userName} <span className="font-normal text-slate-400">· {selected.userRole ?? 'زائر'}</span></p><p className="truncate text-xs text-slate-500" dir="ltr">{selected.userEmail}</p></div><button type="button" disabled={statusMutation.isPending} onClick={() => setStatusDialog({ ticket: selected, status: selected.status === 'OPEN' ? 'CLOSED' : 'OPEN' })} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition disabled:opacity-50 ${selected.status === 'OPEN' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>{statusMutation.isPending ? <Spinner className="size-4"/> : selected.status === 'OPEN' ? <CheckCheck className="size-4"/> : <RotateCcw className="size-4"/>}{selected.status === 'OPEN' ? 'إغلاق المحادثة' : 'إعادة فتحها'}</button></div>
        <SupportConversation ticket={selected} isAdmin/>
      </> : <EmptyState icon={LifeBuoy} title="اختر محادثة للرد" description="ستظهر الرسائل وتفاصيل المحادثة هنا."/>}</div>
      <aside className="order-1 flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 lg:order-2">
        <div className="border-b border-slate-100 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-extrabold text-slate-900">كل المحادثات</h3><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-extrabold text-cyan-800">{ticketsQuery.data?.pagination.total ?? tickets.length}</span></div><label className="relative mt-3 block"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="ابحث بالاسم أو البريد أو الموضوع" className="input w-full pe-9"/></label></div>
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">{visible.length ? visible.map((ticket) => <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={`w-full p-4 text-start transition hover:bg-cyan-50/70 ${selected?.id === ticket.id ? 'bg-cyan-50' : 'bg-white'}`}><span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-slate-900">{ticket.subject}</span><span className="mt-1 block truncate text-xs font-semibold text-slate-600">{ticket.userName ?? 'حساب محذوف'}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${ticket.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ticket.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}</span></span><span className="mt-2 block truncate text-xs text-slate-500">{ticket.lastMessage || 'مرفق'}</span><span className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{ticket.lastSenderType === 'USER' ? 'بانتظار رد الإدارة' : 'آخر رد من الإدارة'}</span><time>{new Date(ticket.updatedAt).toLocaleDateString('ar-EG')}</time></span></button>) : <p className="p-6 text-center text-sm text-slate-500">لا توجد محادثات مطابقة.</p>}</div>
        {ticketsQuery.data && ticketsQuery.data.pagination.totalPages > 1 ? <div className="border-t border-slate-100 p-3"><Pagination pagination={ticketsQuery.data.pagination} onPageChange={setPage}/></div> : null}
      </aside>
    </div>}
    <Modal open={Boolean(statusDialog)} onClose={() => setStatusDialog(null)} title={statusDialog?.status === 'CLOSED' ? 'إغلاق المحادثة' : 'إعادة فتح المحادثة'} size="sm" footer={<div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setStatusDialog(null)} className="btn btn-secondary" disabled={statusMutation.isPending}>رجوع</button><button type="button" onClick={submitStatus} disabled={statusMutation.isPending || statusReason.trim().length < MIN_REASON} className={statusDialog?.status === 'CLOSED' ? 'btn btn-danger' : 'btn btn-primary'}>{statusMutation.isPending ? <Spinner className="size-4"/> : statusDialog?.status === 'CLOSED' ? <CheckCheck className="size-4"/> : <RotateCcw className="size-4"/>}{statusDialog?.status === 'CLOSED' ? 'تأكيد الإغلاق' : 'إعادة الفتح'}</button></div>}>
      {statusDialog ? <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600"><p className="font-extrabold text-slate-900">{statusDialog.ticket.subject}</p><p>{statusDialog.ticket.userName ?? 'حساب محذوف'} <span dir="ltr">· {statusDialog.ticket.userEmail}</span></p><p className="mt-1 text-slate-500">{statusDialog.status === 'CLOSED' ? 'سيتم إغلاق المحادثة ولن يستطيع المستخدم إرسال ردود جديدة حتى إعادة فتحها.' : 'سيتم إعادة فتح المحادثة وسيتمكن المستخدم من إرسال رسائل جديدة.'}</p></div>
      </div> : null}
    </Modal>
  </section>;
};
