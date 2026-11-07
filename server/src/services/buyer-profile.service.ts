import { findUserById, toPublicUser, updateBuyerAccount } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { deleteLocalImage } from './upload.service';
import { emitRealtimeEvent } from './realtime.service';
import type { UpdateBuyerProfileInput } from '../validators/buyer-profile.validator';

const requireBuyer = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user || !['Buyer', 'Parent'].includes(user.role) || !user.is_active) throw new AppError('حساب المستخدم غير متاح', 404);
  return user;
};

export const updateBuyerProfile = async (userId: string, input: UpdateBuyerProfileInput) => {
  const existing = await requireBuyer(userId);
  const updated = await updateBuyerAccount(userId, { name: input.name });
  if (!updated) throw new AppError('تعذر تحديث بيانات الحساب', 400);
  emitRealtimeEvent(userId, 'data');
  return toPublicUser(updated);
};

export const updateBuyerAvatar = async (userId: string, avatarUrl: string) => {
  const existing = await requireBuyer(userId);
  const updated = await updateBuyerAccount(userId, { avatarUrl });
  if (!updated) throw new AppError('تعذر تحديث الصورة الشخصية', 400);
  emitRealtimeEvent(userId, 'data');
  if (existing.avatar_url && existing.avatar_url !== avatarUrl) {
    try { await deleteLocalImage(existing.avatar_url); }
    catch (error) { console.error('Failed to remove the previous buyer avatar:', error); }
  }
  return toPublicUser(updated);
};
