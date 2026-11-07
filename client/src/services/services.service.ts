import type { MicroService, MicroServicePayload } from '@/types';
import { api, unwrap } from './api';

export const servicesApi = {
  listAll: async (): Promise<MicroService[]> => {
    const response = await api.get('/services');
    return unwrap<{ items: MicroService[] }>(response).items;
  },
  uploadMedia: async (file: File): Promise<{ url: string; type: 'image' | 'video' }> => {
    const formData = new FormData();
    formData.append('media', file);
    // Clear the instance-wide JSON content type so Axios keeps FormData intact
    // and the browser can add its multipart boundary for Multer.
    const response = await api.post('/services/upload', formData, { headers: { 'Content-Type': null } });
    return unwrap<{ media: { url: string; type: 'image' | 'video' } }>(response).media;
  },
  listUploadedMedia: async (): Promise<Array<{ url: string; type: 'image' | 'video' }>> => {
    const response = await api.get('/services/uploads/mine');
    return unwrap<{ media: Array<{ url: string; type: 'image' | 'video' }> }>(response).media;
  },
  deleteUploadedMedia: async (fileName: string): Promise<void> => {
    await api.delete(`/services/uploads/mine/${encodeURIComponent(fileName)}`);
  },
  listForFreelancer: async (freelancerId: string): Promise<MicroService[]> => {
    const response = await api.get('/services', { params: { freelancerId } });
    return unwrap<{ items: MicroService[] }>(response).items;
  },
  listMine: async (): Promise<MicroService[]> => {
    const response = await api.get('/services/mine');
    return unwrap<{ items: MicroService[] }>(response).items;
  },
  create: async (payload: MicroServicePayload): Promise<MicroService> => {
    const response = await api.post('/services', payload);
    return unwrap<{ service: MicroService }>(response).service;
  },
  update: async (id: string, payload: Partial<MicroServicePayload> & { status?: 'active' | 'inactive' }): Promise<MicroService> => {
    const response = await api.patch(`/services/${id}`, payload);
    return unwrap<{ service: MicroService }>(response).service;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`);
  },
};
