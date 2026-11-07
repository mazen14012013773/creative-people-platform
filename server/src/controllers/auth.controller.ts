import type { Request, Response } from 'express';
import {
  changeAccountPassword,
  getCurrentUser,
  login as loginService,
  logout as logoutService,
  registerAccount,
  updateAccountSettings,
} from '../services/auth.service';
import type {
  AccountProfileInput,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '../validators/auth.validator';

export const register = async (
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
): Promise<void> => {
  const result = await registerAccount(req.body);

  res.status(201).json({
    success: true,
    message: 'تم إنشاء الحساب بنجاح',
    data: { ...result, welcomePoints: 100 },
  });
};

export const login = async (
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
): Promise<void> => {
  const result = await loginService(req.body);

  res.status(200).json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    data: result,
  });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await getCurrentUser(req.user!.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  logoutService(req.user!.id);
  res.status(200).json({ success: true, message: 'تم تسجيل الخروج وإنهاء الجلسة على الخادم' });
};

export const updateAccountHandler = async (
  req: Request<unknown, unknown, AccountProfileInput>,
  res: Response,
): Promise<void> => {
  const user = await updateAccountSettings(req.user!.id, req.body);

  res.status(200).json({
    success: true,
    message: 'تم حفظ إعدادات الحساب بنجاح',
    data: { user },
  });
};

export const changePasswordHandler = async (
  req: Request<unknown, unknown, ChangePasswordInput>,
  res: Response,
): Promise<void> => {
  const result = await changeAccountPassword(req.user!.id, req.body);

  res.status(200).json({
    success: true,
    message: 'تم تغيير كلمة المرور. سجّل الدخول مجددًا بكلمة المرور الجديدة.',
    data: result,
  });
};
