import type { Request, Response } from 'express';
import {
  createNotification,
  listActiveNotifications,
  listNotificationsForAdmin,
  setNotificationActive,
  listUserNotifications,
  countUnreadNotifications,
  markUserNotificationRead,
  markAllUserNotificationsRead,
} from '../models/notification.model';
import type { CreateNotificationInput } from '../validators/notification.validator';
import type { AdminPaginationInput } from '../validators/common.validator';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import { recordAdminAudit } from '../models/admin.model';

export const activeNotifications = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await listActiveNotifications() } });
};

export const inbox = async (req: Request, res: Response): Promise<void> => {
  const [items, unreadCount] = await Promise.all([listUserNotifications(req.user!.id), countUnreadNotifications(req.user!.id)]);
  res.status(200).json({ success: true, data: { items, unreadCount } });
};

export const unreadCount = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { count: await countUnreadNotifications(req.user!.id) } });
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  const updated = await markUserNotificationRead(req.user!.id, String(req.params.id));
  if (!updated) throw new AppError('الإشعار غير موجود.', 404);
  res.status(200).json({ success: true, data: { updated: true } });
};

export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  await markAllUserNotificationsRead(req.user!.id);
  res.status(200).json({ success: true, data: { updated: true } });
};

export const adminNotifications = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminPaginationInput;
  const result = await listNotificationsForAdmin(input);

  res.status(200).json({
    success: true,
    data: {
      items: result.items,
      pagination: buildPagination(input.page, input.limit, result.total),
    },
  });
};

export const createSiteNotification = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as CreateNotificationInput;
  const notification = await createNotification(input.title, input.message, req.user!.id);
  recordAdminAudit(req.user!.id, 'notification_create', 'notification', notification.id, input.reason, {
    title: notification.title,
  });
  res.status(201).json({ success: true, message: 'تم إنشاء إشعار المنصة', data: { notification } });
};

export const updateSiteNotification = async (req: Request, res: Response): Promise<void> => {
  const isActive = req.body.isActive as boolean;
  const result = await setNotificationActive(String(req.params.id), isActive);
  if (!result) throw new AppError('الإشعار غير موجود', 404);
  recordAdminAudit(req.user!.id, 'notification_update', 'notification', result.id, String(req.body.reason), {
    isActive,
  });
  res.status(200).json({
    success: true,
    message: isActive ? 'تم تفعيل الإشعار' : 'تم إيقاف الإشعار',
    data: { notification: result },
  });
};
