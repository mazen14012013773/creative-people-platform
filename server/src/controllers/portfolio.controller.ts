import type { Request, Response } from 'express';
import {
  addPortfolioItem,
  getMyPortfolio,
  removePortfolioItem,
} from '../services/portfolio.service';
import { uploadImage } from '../services/upload.service';
import { AppError } from '../utils/app-error';
import type { CreatePortfolioInput } from '../validators/portfolio.validator';

export const listMine = async (req: Request, res: Response): Promise<void> => {
  const items = await getMyPortfolio(req.user!.id);

  res.status(200).json({
    success: true,
    data: { items },
  });
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const item = await addPortfolioItem(
    req.user!.id,
    req.body as CreatePortfolioInput,
  );

  res.status(201).json({
    success: true,
    message: 'تم إضافة المشروع إلى معرض الأعمال',
    data: { item },
  });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await removePortfolioItem(String(req.params.id), req.user!.id);

  res.status(200).json({
    success: true,
    message: 'تم حذف المشروع من معرض الأعمال',
  });
};

export const upload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError('لم يتم إرفاق صورة', 400);
  }

  const url = await uploadImage(req.user!.id, req.file, 'portfolio');

  res.status(201).json({
    success: true,
    message: 'تم رفع الصورة بنجاح',
    data: { url },
  });
};
