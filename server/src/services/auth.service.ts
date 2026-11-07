import bcrypt from 'bcrypt';
import { query } from '../config/db';
import {
  createAccount,
  findUserByEmail,
  findUserById,
  invalidateUserTokens,
  restoreExpiredSuspension,
  toPublicUser,
  updateAccountProfile,
  updatePasswordHash,
  type UserRow,
} from '../models/user.model';
import { AppError } from '../utils/app-error';
import { signToken } from '../utils/jwt';
import { emitRealtimeEvent } from './realtime.service';
import type {
  AccountProfileInput,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '../validators/auth.validator';

const BCRYPT_ROUNDS = 12;

const assertRegistrationOpen = async (): Promise<void> => {
  const result = await query<{ value: string }>("SELECT value FROM app_settings WHERE key = 'registration_open'");
  const setting = result.rows[0]?.value;
  if (setting !== undefined && setting !== '1' && setting !== 'true') {
    throw new AppError('التسجيل مغلق حاليًا بقرار من إدارة المنصة. يرجى المحاولة لاحقًا.', 403);
  }
};

const isUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    'code' in error && error.code === '23505'
  );
};

const buildAuthResult = (user: UserRow) => {
  return {
    user: toPublicUser(user),
    token: signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
  };
};

export const registerAccount = async (input: RegisterInput) => {
  await assertRegistrationOpen();
  const email = input.email.toLowerCase();

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError('البريد الإلكتروني مسجل بالفعل', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await createAccount({
      name: input.name,
      email,
      passwordHash,
      role: input.accountType,
      title: input.title ?? null,
      location: input.location ?? null,
      bio: null,
    });

    return buildAuthResult(user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('البريد الإلكتروني مسجل بالفعل', 409);
    }

    throw error;
  }
};

export const login = async (input: LoginInput) => {
  const email = input.email.toLowerCase();
  const foundUser = await findUserByEmail(email);
  const user = foundUser ? await restoreExpiredSuspension(foundUser) : null;

  if (!user) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordMatches) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  if (!user.is_active) {
    throw new AppError('تم تجميد هذا الحساب، يرجى التواصل مع الإدارة', 403);
  }

  return buildAuthResult(user);
};

export const updateAccountSettings = async (userId: string, input: AccountProfileInput) => {
  const user = await findUserById(userId);
  if (!user) throw new AppError('الحساب غير موجود', 404);

  const updated = await updateAccountProfile(userId, {
    name: input.name,
    phone: input.phone ?? null,
    whatsappNumber: input.whatsappNumber ?? null,
    isPrivate: user.role === 'Freelancer' ? input.isPrivate : undefined,
  });

  if (!updated) throw new AppError('تعذر تحديث بيانات الحساب', 500);

  emitRealtimeEvent(userId, 'data');
  return toPublicUser(updated);
};

export const changeAccountPassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await findUserById(userId);
  if (!user) throw new AppError('الحساب غير موجود', 404);

  const matches = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!matches) throw new AppError('كلمة المرور الحالية غير صحيحة', 422);

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  if (!await updatePasswordHash(userId, passwordHash)) {
    throw new AppError('تعذر تحديث كلمة المرور', 500);
  }

  await invalidateUserTokens(userId);
  return { signedOut: true as const };
};

export const logout = async (userId: string): Promise<void> => {
  await invalidateUserTokens(userId);
};

export const getCurrentUser = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('الحساب غير موجود', 404);
  }

  return toPublicUser(user);
};
