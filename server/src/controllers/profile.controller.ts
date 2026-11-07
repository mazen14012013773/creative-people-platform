import type { Request, Response } from 'express';
import {
  getProfile,
  setAvatar,
  updateProfile,
} from '../services/profile.service';
import { uploadImage } from '../services/upload.service';
import { AppError } from '../utils/app-error';
import type { UpdateProfileInput } from '../validators/freelancer.validator';

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await getProfile(req.user!.id);

  res.status(200).json({
    success: true,
    data: profile,
  });
};

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await updateProfile(
    req.user!.id,
    req.body as UpdateProfileInput,
  );

  res.status(200).json({
    success: true,
    message: 'تم تحديث الملف الشخصي بنجاح',
    data: profile,
  });
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError('لم يتم إرفاق صورة', 400);
  }

  const url = await uploadImage(req.user!.id, req.file, 'avatars');
  await setAvatar(req.user!.id, url);

  res.status(201).json({
    success: true,
    message: 'تم تحديث الصورة الشخصية بنجاح',
    data: { url },
  });
};
