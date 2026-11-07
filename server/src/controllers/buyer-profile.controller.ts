import type { Request, Response } from 'express';
import { updateBuyerAvatar, updateBuyerProfile } from '../services/buyer-profile.service';
import { uploadImage } from '../services/upload.service';
import { AppError } from '../utils/app-error';
import type { UpdateBuyerProfileInput } from '../validators/buyer-profile.validator';

export const updateBuyerProfileHandler = async (req: Request, res: Response): Promise<void> => {
  const user = await updateBuyerProfile(req.user!.id, req.body as UpdateBuyerProfileInput);
  res.status(200).json({ success: true, data: { user } });
};

export const uploadBuyerAvatarHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError('اختر صورة للحساب أولاً', 400);
  const url = await uploadImage(req.user!.id, req.file, 'avatars');
  const user = await updateBuyerAvatar(req.user!.id, url);
  res.status(201).json({ success: true, data: { user, url } });
};
