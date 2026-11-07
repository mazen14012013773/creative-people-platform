import type {
  AuthUser,
  FreelancerStats,
  ProfileResult,
  UpdateProfilePayload,
} from '@/types';
import { api, unwrap } from './api';

export const profileApi = {
  updateBuyerAccount: async (name: string): Promise<AuthUser> => {
    const response = await api.patch('/profile/buyer', { name });
    return unwrap<{ user: AuthUser }>(response).user;
  },

  uploadBuyerAvatar: async (file: File): Promise<AuthUser> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/profile/buyer/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrap<{ user: AuthUser }>(response).user;
  },

  updateParentAccount: async (name: string): Promise<AuthUser> => {
    const response = await api.patch('/profile/parent', { name });
    return unwrap<{ user: AuthUser }>(response).user;
  },

  uploadParentAvatar: async (file: File): Promise<AuthUser> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/profile/parent/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrap<{ user: AuthUser }>(response).user;
  },

  getMine: async (): Promise<ProfileResult> => {
    const response = await api.get('/profile');
    return unwrap<ProfileResult>(response);
  },

  update: async (payload: UpdateProfilePayload): Promise<ProfileResult> => {
    const response = await api.patch('/profile', payload);
    return unwrap<ProfileResult>(response);
  },

  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = unwrap<{ url: string }>(response);
    return data.url;
  },

  getStats: async (): Promise<FreelancerStats> => {
    const response = await api.get('/freelancer/stats');
    const data = unwrap<{ stats: FreelancerStats }>(response);
    return data.stats;
  },
};
