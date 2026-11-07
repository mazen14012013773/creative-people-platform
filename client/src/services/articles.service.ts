import { api, unwrap } from './api';
import type { Article, CommunityPostComment, InteractionSummary } from '@/types';

export interface ArticlesResult { items: Article[] }
export interface ArticleDetailResult { article: Article; relatedArticles: Article[]; interactions: InteractionSummary }

export const getArticles = async (options: { q?: string; category?: string } = {}): Promise<ArticlesResult> => {
  const response = await api.get('/articles', { params: options });
  return unwrap<ArticlesResult>(response);
};

export const getArticle = async (slug: string): Promise<ArticleDetailResult> => {
  const response = await api.get(`/articles/${encodeURIComponent(slug)}`);
  return unwrap<ArticleDetailResult>(response);
};

export const articleInteractionsApi = {
  comments: async (slug: string): Promise<CommunityPostComment[]> => {
    const response = await api.get(`/articles/${encodeURIComponent(slug)}/comments`);
    return unwrap<{ items: CommunityPostComment[] }>(response).items;
  },
  comment: async (slug: string, content: string, file?: File): Promise<CommunityPostComment> => {
    const body = new FormData();
    body.append('content', content);
    if (file) body.append('file', file);
    const response = await api.post(`/articles/${encodeURIComponent(slug)}/comments`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrap<{ comment: CommunityPostComment }>(response).comment;
  },
  toggleLike: async (slug: string): Promise<{ liked: boolean; likesCount: number }> => {
    const response = await api.post(`/articles/${encodeURIComponent(slug)}/like`);
    return unwrap<{ liked: boolean; likesCount: number }>(response);
  },
  removeComment: async (id: string): Promise<void> => { await api.delete(`/community/comments/${id}`); },
};
