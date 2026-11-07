import { Router } from 'express';
import { changePasswordHandler, login, logout, me, register, updateAccountHandler } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { accountProfileSchema, changePasswordSchema, loginSchema, registerSchema } from '../validators/auth.validator';

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(register),
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(login),
);


authRouter.get('/me', authenticate, asyncHandler(me));
authRouter.post('/logout', authenticate, asyncHandler(logout));

authRouter.patch(
  '/account',
  authenticate,
  validate({ body: accountProfileSchema }),
  asyncHandler(updateAccountHandler),
);

authRouter.patch(
  '/account/password',
  authenticate,
  authLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(changePasswordHandler),
);
