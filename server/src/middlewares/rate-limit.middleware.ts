import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const windowMs = 15 * 60 * 1000;

export const authLimiter = rateLimit({
  windowMs,
  limit: env.NODE_ENV === 'production' ? 20 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد المحاولات كبير، يرجى المحاولة بعد قليل',
  },
});

export const publicActionLimiter = rateLimit({
  windowMs,
  limit: env.NODE_ENV === 'production' ? 30 : 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد المحاولات كبير، يرجى المحاولة بعد قليل',
  },
});

export const uploadLimiter = rateLimit({
  windowMs,
  limit: env.NODE_ENV === 'production' ? 80 : 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تجاوزت الحد المسموح لعمليات الرفع أو تنزيل الأرشيف. يرجى المحاولة بعد قليل.',
  },
});

