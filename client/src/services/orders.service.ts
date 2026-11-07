import { api, unwrap } from './api';

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'REVISION_REQUESTED' | 'AWAITING_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface OrderDelivery {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  relativePath: string;
  sha256: string;
  versionNumber: number;
  freelancerNotes: string | null;
  createdAt: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface PlatformOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  buyerId: string;
  buyerName: string;
  freelancerId: string;
  freelancerName: string;
  status: OrderStatus;
  priceAmount: number;
  deliveryVersion: number;
  revisionNotes: string | null;
  revisionsUsed: number;
  revisionLimit: number;
  revisionsRemaining: number;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  review?: {
    id: string;
    clientName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    freelancerReply: string | null;
    repliedAt: string | null;
  } | null;
  deliveries?: OrderDelivery[];
}

export const ordersApi = {
  list: async (): Promise<PlatformOrder[]> => {
    const response = await api.get('/orders');
    return unwrap<{ items: PlatformOrder[] }>(response).items;
  },
  get: async (id: string): Promise<PlatformOrder> => {
    const response = await api.get(`/orders/${encodeURIComponent(id)}`);
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  messages: async (id: string): Promise<OrderMessage[]> => {
    const response = await api.get(`/orders/${encodeURIComponent(id)}/messages`);
    return unwrap<{ items: OrderMessage[] }>(response).items;
  },
  sendMessage: async (id: string, content: string): Promise<OrderMessage> => {
    const response = await api.post(`/orders/${encodeURIComponent(id)}/messages`, { content });
    return unwrap<{ message: OrderMessage }>(response).message;
  },
  create: async (serviceId: string, idempotencyKey: string): Promise<{ order: PlatformOrder; replayed: boolean }> => {
    const response = await api.post('/orders', { serviceId }, { headers: { 'Idempotency-Key': idempotencyKey } });
    return unwrap<{ order: PlatformOrder; replayed: boolean }>(response);
  },
  deliver: async (orderId: string, files: File[], notes: string, link?: string): Promise<PlatformOrder> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name));
    if (notes.trim()) form.append('notes', notes.trim());
    if (link?.trim()) form.append('link', link.trim());
    const response = await api.post(`/orders/${encodeURIComponent(orderId)}/deliver`, form, { headers: { 'Content-Type': null } });
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  revise: async (orderId: string, notes: string): Promise<PlatformOrder> => {
    const response = await api.post(`/orders/${encodeURIComponent(orderId)}/revise`, { notes });
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  start: async (orderId: string): Promise<PlatformOrder> => {
    const response = await api.post(`/orders/${encodeURIComponent(orderId)}/start`);
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  accept: async (orderId: string): Promise<PlatformOrder> => {
    const response = await api.post(`/orders/${encodeURIComponent(orderId)}/accept`);
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  review: async (orderId: string, rating: number, comment: string): Promise<PlatformOrder> => {
    const response = await api.post(`/orders/${encodeURIComponent(orderId)}/review`, { rating, comment });
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  reply: async (orderId: string, reply: string): Promise<void> => {
    await api.post(`/orders/${encodeURIComponent(orderId)}/reply`, { reply });
  },
  cancel: async (orderId: string): Promise<PlatformOrder> => {
    const response = await api.post(`/orders/${encodeURIComponent(orderId)}/cancel`);
    return unwrap<{ order: PlatformOrder }>(response).order;
  },
  download: async (orderId: string, deliveryId: string): Promise<Blob> => {
    const response = await api.get(`/orders/${encodeURIComponent(orderId)}/download/${encodeURIComponent(deliveryId)}`, { responseType: 'blob' });
    return response.data as Blob;
  },
  downloadAll: async (orderId: string): Promise<void> => {
    const response = await api.get(`/orders/${encodeURIComponent(orderId)}/vault/download-all`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mabdeen-order-${orderId}-files.zip`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  preview: async (orderId: string, deliveryId: string): Promise<Blob> => {
    const response = await api.get(`/orders/${encodeURIComponent(orderId)}/vault/preview/${encodeURIComponent(deliveryId)}`, { responseType: 'blob' });
    return response.data as Blob;
  },
};
