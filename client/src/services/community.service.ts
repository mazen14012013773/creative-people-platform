import { api, unwrap } from './api';
import type { CommunityPost, CommunityPostComment, CommunityPostPayload } from '@/types';

export const communityApi = {
  list: async (options: { q?: string; category?: string } = {}): Promise<CommunityPost[]> => {
    const response = await api.get('/community/posts', { params: options });
    return unwrap<{ items: CommunityPost[] }>(response).items;
  },
  mine: async (): Promise<CommunityPost[]> => {
    const response = await api.get('/community/posts/mine');
    return unwrap<{ items: CommunityPost[] }>(response).items;
  },
  manage: async (): Promise<CommunityPost[]> => {
    const response = await api.get('/community/posts/manage');
    return unwrap<{ items: CommunityPost[] }>(response).items;
  },
  get: async (id: string): Promise<CommunityPost> => {
    const response = await api.get(`/community/posts/${id}`);
    return unwrap<{ post: CommunityPost }>(response).post;
  },
  comments: async (id: string): Promise<CommunityPostComment[]> => {
    const response = await api.get(`/community/posts/${id}/comments`);
    return unwrap<{ items: CommunityPostComment[] }>(response).items;
  },
  comment: async (id: string, content: string, file?: File): Promise<CommunityPostComment> => {
    const body = new FormData();
    body.append('content', content);
    if (file) body.append('file', file);
    const response = await api.post(`/community/posts/${id}/comments`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrap<{ comment: CommunityPostComment }>(response).comment;
  },
  toggleLike: async (id: string): Promise<{ liked: boolean; likesCount: number }> => {
    const response = await api.post(`/community/posts/${id}/like`);
    return unwrap<{ liked: boolean; likesCount: number }>(response);
  },
  removeComment: async (id: string): Promise<void> => { await api.delete(`/community/comments/${id}`); },
  create: async (payload: CommunityPostPayload): Promise<CommunityPost> => {
    const response = await api.post('/community/posts', payload);
    return unwrap<{ post: CommunityPost }>(response).post;
  },
  update: async (id: string, payload: Partial<CommunityPostPayload>): Promise<CommunityPost> => {
    const response = await api.patch(`/community/posts/${id}`, payload);
    return unwrap<{ post: CommunityPost }>(response).post;
  },
  remove: async (id: string): Promise<void> => { await api.delete(`/community/posts/${id}`); },
  uploadCover: async (file: File): Promise<string> => {
    const data = new FormData();
    data.append('image', file);
    const response = await api.post('/community/posts/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrap<{ url: string }>(response).url;
  },
};
