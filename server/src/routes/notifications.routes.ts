import { Router } from 'express';
import { activeNotifications, inbox, markAllRead, markRead, unreadCount } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { uuidParamSchema } from '../validators/common.validator';

export const notificationsRouter = Router();
notificationsRouter.get('/active', activeNotifications);
notificationsRouter.get('/', authenticate, asyncHandler(inbox));
notificationsRouter.get('/unread-count', authenticate, asyncHandler(unreadCount));
notificationsRouter.post('/read-all', authenticate, asyncHandler(markAllRead));
notificationsRouter.patch('/:id/read', authenticate, validate({ params: uuidParamSchema }), asyncHandler(markRead));
