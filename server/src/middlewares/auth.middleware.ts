import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { query } from '../config/db';
import { findUserById, restoreExpiredSuspension } from '../models/user.model';
import type { UserRole } from '../types/auth';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { verifyToken } from '../utils/jwt';

const agentHash = (userAgent: string): string =>
  createHash('sha1').update(userAgent).digest('hex').slice(0, 16);

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError('يجب تسجيل الدخول أولاً', 401);
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new AppError('يجب تسجيل الدخول أولاً', 401);
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('الجلسة غير صالحة أو منتهية، يرجى تسجيل الدخول مجدداً', 401);
  }

  let user = await findUserById(payload.sub);

  if (!user) {
    throw new AppError('الحساب غير موجود', 401);
  }

  user = await restoreExpiredSuspension(user);

  const requestPath = req.originalUrl.split('?')[0];
  if (!user.is_active) {
    throw new AppError('تم تجميد هذا الحساب، يرجى التواصل مع الإدارة', 403);
  }

  const allowedForPendingAccount = requestPath.endsWith('/auth/me') ||
    requestPath.endsWith('/parent/start-verification') ||
    requestPath.includes('/support/') ||
    requestPath.endsWith('/realtime/stream');
  if (user.role === 'Freelancer' && user.account_status !== 'ACTIVE' && !allowedForPendingAccount) {
    const message = user.account_status === 'REJECTED'
      ? 'لم يُعتمد توثيقك السابق. يمكنك إعادة إرسال طلب التوثيق ببيانات صحيحة من بوابة التوثيق.'
      : user.account_status === 'PENDING_ADMIN_REVIEW'
        ? 'أرسل ولي الأمر طلب التوثيق بنجاح. انتظر موافقة الإدارة لتفعيل حسابك.'
        : 'حسابك جديد ويحتاج إلى توثيق ولي الأمر وموافقة الإدارة قبل استخدام المنصة.';
    throw new AppError(message, 403, { code: 'ACCOUNT_VERIFICATION_REQUIRED', accountStatus: user.account_status });
  }

  if (user.token_invalid_before && payload.iat !== undefined) {
    const issuedAtMs = payload.iat * 1000;

    if (issuedAtMs < Date.parse(user.token_invalid_before)) {
      throw new AppError('تم إنهاء هذه الجلسة من الإدارة، يرجى تسجيل الدخول مجدداً', 401);
    }
  }

  if (payload.iat !== undefined) {
    const revoked = await query<{ revoked_at: string | null }>(
      `SELECT MAX(revoked_at) AS revoked_at FROM user_sessions
       WHERE user_id = $1 AND ip = $2 AND agent_hash = $3 AND revoked_at IS NOT NULL`,
      [user.id, req.ip ?? 'unknown', agentHash(req.get('user-agent') ?? '')],
    );
    const revokedAt = revoked.rows[0]?.revoked_at;
    if (revokedAt && payload.iat * 1000 <= Date.parse(revokedAt)) {
      throw new AppError('Session was revoked. Please sign in again.', 401);
    }
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  req.authToken = payload;


  next();
});

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) { next(); return; }

  try {
    const payload = verifyToken(authorization.slice(7).trim());
    let user = await findUserById(payload.sub);
    if (user?.is_active && (!user.token_invalid_before || payload.iat === undefined || payload.iat * 1000 >= Date.parse(user.token_invalid_before))) {
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    }
  } catch {
    // Public pages remain available if a saved optional session has expired.
  }
  next();
});

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('يجب تسجيل الدخول أولاً', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('ليس لديك صلاحية للوصول إلى هذا المورد', 403);
    }

    next();
  };
};
