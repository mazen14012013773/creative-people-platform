import { api, unwrap } from './api';
import type { InboxNotification, SiteNotification } from '@/types';

export const notificationsApi = {
  inbox: async (): Promise<{ items: InboxNotification[]; unreadCount: number }> => {
    const response = await api.get('/notifications');
    return unwrap<{ items: InboxNotification[]; unreadCount: number }>(response);
  },
  markRead: async (id: string): Promise<void> => { await api.patch(`/notifications/${id}/read`); },
  markAllRead: async (): Promise<void> => { await api.post('/notifications/read-all'); },
  active: async (): Promise<SiteNotification[]> => {
    const response = await api.get('/notifications/active');
    return unwrap<{ items: SiteNotification[] }>(response).items;
  },
};
