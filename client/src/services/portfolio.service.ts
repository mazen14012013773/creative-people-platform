import type { CreatePortfolioPayload, PortfolioItem } from '@/types';
import { api, unwrap } from './api';

export const portfolioApi = {
  listMine: async (): Promise<PortfolioItem[]> => {
    const response = await api.get('/portfolio');
    const data = unwrap<{ items: PortfolioItem[] }>(response);
    return data.items;
  },

  create: async (payload: CreatePortfolioPayload): Promise<PortfolioItem> => {
    const response = await api.post('/portfolio', payload);
    const data = unwrap<{ item: PortfolioItem }>(response);
    return data.item;
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/portfolio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = unwrap<{ url: string }>(response);
    return data.url;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/portfolio/${id}`);
  },
};
