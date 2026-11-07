import type { Request, Response } from 'express';
import { addService, editService, getMyServices, getServices, removeService } from '../services/services.service';
import type { ServiceCreateInput, ServiceUpdateInput } from '../validators/service.validator';
import { AppError } from '../utils/app-error';
import { deleteUploadedServiceMedia, listUploadedServiceMedia, uploadServiceMedia as saveServiceMedia } from '../services/upload.service';

export const list = async (req: Request, res: Response): Promise<void> => {
  const freelancerId = typeof req.query.freelancerId === 'string' ? req.query.freelancerId : undefined;
  res.status(200).json({ success: true, data: { items: await getServices(freelancerId) } });
};

export const mine = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await getMyServices(req.user!.id) } });
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const service = await addService(req.user!.id, req.body as ServiceCreateInput);
  res.status(201).json({ success: true, message: 'تمت إضافة الخدمة', data: { service } });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const service = await editService(String(req.params.id), req.user!.id, req.body as ServiceUpdateInput);
  res.status(200).json({ success: true, message: 'تم تحديث الخدمة', data: { service } });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await removeService(String(req.params.id), req.user!.id);
  res.status(200).json({ success: true, message: 'تم حذف الخدمة' });
};

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    const isMultipart = req.is('multipart/form-data');
    throw new AppError(isMultipart
      ? 'وصل طلب الرفع بدون ملف. أعد اختيار الصورة أو الفيديو ثم حاول مرة أخرى.'
      : 'تعذر تجهيز الملف للإرسال. حدّث الصفحة وحاول رفعه مرة أخرى.', 400);
  }
  const media = await saveServiceMedia(req.user!.id, req.file);
  res.status(201).json({ success: true, data: { media } });
};

export const uploadedMedia = async (req: Request, res: Response): Promise<void> => {
  const media = await listUploadedServiceMedia(req.user!.id);
  res.status(200).json({ success: true, data: { media } });
};

export const deleteUploadedMedia = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const fileName = String(req.params.filename);
  const mediaUrl = `/uploads/services/${userId}/${fileName}`;
  if ((await getMyServices(userId)).some((service) => service.media.some((item) => item.url === mediaUrl))) {
    throw new AppError('احذف الوسيط من الخدمة واحفظ التعديل قبل حذفه نهائيًا.', 409);
  }
  await deleteUploadedServiceMedia(userId, fileName);
  res.status(200).json({ success: true, message: 'تم حذف الملف نهائيًا.' });
};
