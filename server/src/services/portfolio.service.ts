import {
  countPortfolioItems,
  createPortfolioItem,
  deletePortfolioItem,
  listPortfolioByUser,
} from '../models/portfolio.model';
import { AppError } from '../utils/app-error';
import { sanitizePlainText } from '../utils/sanitize';
import type { CreatePortfolioInput } from '../validators/portfolio.validator';
import { deleteLocalImage } from './upload.service';
import { emitRealtimeEventToAll } from './realtime.service';

const MAX_PORTFOLIO_ITEMS = 24;

export const getMyPortfolio = async (userId: string) => {
  return listPortfolioByUser(userId);
};

export const addPortfolioItem = async (
  userId: string,
  input: CreatePortfolioInput,
) => {
  const count = await countPortfolioItems(userId);

  if (count >= MAX_PORTFOLIO_ITEMS) {
    throw new AppError(
      `وصلت للحد الأقصى (${MAX_PORTFOLIO_ITEMS} مشروعاً). احذف مشروعاً قديماً لإضافة جديد.`,
      400,
    );
  }

  const item = await createPortfolioItem(userId, {
    ...input,
    title: sanitizePlainText(input.title),
    description: input.description ? sanitizePlainText(input.description) : undefined,
  });
  emitRealtimeEventToAll('profile');
  return item;
};

export const removePortfolioItem = async (itemId: string, userId: string) => {
  const imageUrl = await deletePortfolioItem(itemId, userId);

  if (imageUrl === undefined) {
    throw new AppError('المشروع غير موجود أو لا تملك صلاحية حذفه', 404);
  }

  if (imageUrl) {
    try {
      await deleteLocalImage(imageUrl);
    } catch (error) {
      console.error('Failed to delete portfolio image:', error);
    }
  }
  emitRealtimeEventToAll('profile');
};
