import { findArticleBySlug, findArticles } from '../models/articles.model';
import { AppError } from '../utils/app-error';
import { getArticleInteractionState } from './post-interactions.service';

export const listArticles = async (query?: string, category?: string) => ({
  items: await findArticles({ query: query?.trim().slice(0, 120) || undefined, category: category?.trim().slice(0, 80) || undefined, limit: 100 }),
});

export const getArticle = async (slug: string, viewerId?: string) => {
  const article = await findArticleBySlug(slug);
  if (!article) throw new AppError('المقال غير موجود', 404);
  const sameCategory = (await findArticles({ category: article.category, limit: 10 })).filter((item) => item.id !== article.id);
  const related = [...sameCategory, ...(await findArticles({ limit: 10 })).filter((item) => item.id !== article.id && !sameCategory.some((relatedItem) => relatedItem.id === item.id))].slice(0, 3);
  return { article, relatedArticles: related, interactions: await getArticleInteractionState(slug, viewerId) };
};
