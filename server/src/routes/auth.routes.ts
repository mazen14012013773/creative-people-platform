import { Router } from 'express';
import { changePasswordHandler, completeGoogleProfile, githubCallback, githubStart, googleCallback, googleNonce, googleStart, googleVerify, login, logout, me, register, updateAccountHandler } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { accountProfileSchema, changePasswordSchema, googleCredentialSchema, googleProfileCompletionSchema, loginSchema, registerSchema } from '../validators/auth.validator';

export const authRouter = Router();

authRouter.get('/google', authLimiter, googleStart);
authRouter.get('/google/callback', googleCallback);
authRouter.get('/google/nonce', authLimiter, googleNonce);
authRouter.post('/google/verify', authLimiter, validate({ body: googleCredentialSchema }), asyncHandler(googleVerify));
authRouter.get('/github', authLimiter, githubStart);
authRouter.get('/github/callback', githubCallback);
authRouter.patch(
  '/google/complete-profile',
  authenticate,
  validate({ body: googleProfileCompletionSchema }),
  asyncHandler(completeGoogleProfile),
);

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
