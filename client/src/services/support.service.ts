import type { Pagination } from '@/types';
import { api, unwrap } from './api';

export interface SupportTicketsResult {
  items: SupportTicket[];
  pagination: Pagination;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  lastMessage?: string | null;
  messageCount?: number;
  userId?: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  lastSenderType?: 'USER' | 'ADMIN' | null;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: 'USER' | 'ADMIN';
  senderId: string | null;
  senderName: string;
  senderAvatar: string | null;
  message: string;
  attachmentUrl: string | null;
  attachmentType: 'IMAGE' | 'VIDEO' | 'FILE' | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  createdAt: string;
}

export const supportApi = {
  mine: async (): Promise<SupportTicket[]> => unwrap<{ items: SupportTicket[] }>(await api.get('/support/tickets/mine')).items,
  create: async (subject: string, message: string, file?: File): Promise<SupportTicket> => {
    const form = new FormData();
    form.append('subject', subject);
    form.append('message', message);
    if (file) form.append('file', file);
    return unwrap<{ ticket: SupportTicket }>(await api.post('/support/tickets', form, { headers: { 'Content-Type': null } })).ticket;
  },
  messages: async (ticketId: string) => unwrap<{ ticket: SupportTicket; messages: SupportMessage[] }>(await api.get(`/support/tickets/${encodeURIComponent(ticketId)}/messages`)),
  send: async (ticketId: string, message: string, file?: File): Promise<SupportMessage> => {
    const form = new FormData();
    form.append('message', message);
    if (file) form.append('file', file);
    return unwrap<{ message: SupportMessage }>(await api.post(`/support/tickets/${encodeURIComponent(ticketId)}/messages`, form, { headers: { 'Content-Type': null } })).message;
  },
  attachment: async (ticketId: string, messageId: string): Promise<Blob> => (await api.get(`/support/tickets/${encodeURIComponent(ticketId)}/messages/${encodeURIComponent(messageId)}/attachment`, { responseType: 'blob' })).data as Blob,
  all: async (params: { page?: number; limit?: number; q?: string; status?: 'OPEN' | 'CLOSED' } = {}): Promise<SupportTicketsResult> =>
    unwrap<SupportTicketsResult>(await api.get('/admin/support/tickets', { params })),
  setStatus: async (ticketId: string, status: 'OPEN' | 'CLOSED', reason: string) =>
    unwrap<{ ticket: SupportTicket }>(
      await api.patch(`/admin/support/tickets/${encodeURIComponent(ticketId)}/status`, { status, reason }),
    ).ticket,
};
