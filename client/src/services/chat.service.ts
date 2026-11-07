import type { ChatConversation, ChatMessage } from '@/types';
import { api, unwrap } from './api';

export const chatApi = {
  conversations: async (): Promise<ChatConversation[]> => {
    const response = await api.get('/chat/conversations');
    return unwrap<{ items: ChatConversation[] }>(response).items;
  },
  messages: async (peerId: string, serviceId?: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/conversations/${peerId}/messages`, {
      params: serviceId ? { serviceId } : undefined,
    });
    return unwrap<{ items: ChatMessage[] }>(response).items;
  },
  send: async (input: { receiverId: string; serviceId?: string | null; content: string; file?: File }): Promise<ChatMessage> => {
    let body: FormData | Omit<typeof input, 'file'>;
    if (input.file) {
      const formData = new FormData();
      formData.append('receiverId', input.receiverId);
      if (input.serviceId) formData.append('serviceId', input.serviceId);
      if (input.content) formData.append('content', input.content);
      formData.append('file', input.file);
      body = formData;
    } else {
      body = { receiverId: input.receiverId, serviceId: input.serviceId, content: input.content };
    }
    const response = await api.post('/chat/messages', body, input.file ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
    return unwrap<{ message: ChatMessage }>(response).message;
  },
};
