import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';
import {
  changeAccountPassword,
  getCurrentUser,
  completeGoogleProfile as completeGoogleProfileService,
  login as loginService,
  loginWithGoogle,
  loginWithOAuth,
  logout as logoutService,
  registerAccount,
  updateAccountSettings,
} from '../services/auth.service';
import { AppError } from '../utils/app-error';
import { verifyGoogleIdentityToken } from '../services/google-identity.service';
import { findUserById, toPublicUser } from '../models/user.model';
import { signToken } from '../utils/jwt';
import { recordAdminAudit } from '../models/admin.model';
import type {
  AccountProfileInput,
  ChangePasswordInput,
  GoogleProfileCompletionInput,
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

export const completeGoogleProfile = async (
  req: Request<unknown, unknown, GoogleProfileCompletionInput>,
  res: Response,
): Promise<void> => {
  const user = await completeGoogleProfileService(req.user!.id, req.body);
  res.status(200).json({ success: true, data: { user } });
};

const GOOGLE_STATE_COOKIE = 'mabdeen_google_oauth_state';
const GOOGLE_STATE_COOKIE_PATH = '/api/auth/google/callback';
const GOOGLE_NONCE_COOKIE = 'mabdeen_google_gsi_nonce';
const GOOGLE_VERIFY_COOKIE_PATH = '/api/auth/google/verify';
const GITHUB_STATE_COOKIE = 'mabdeen_github_oauth_state';
const GITHUB_STATE_COOKIE_PATH = '/api/auth/github/callback';

const googleClientId = (): string => {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError('تسجيل الدخول باستخدام Google غير مهيأ على هذا الخادم', 503);
  return env.GOOGLE_CLIENT_ID;
};

const googleConfig = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    throw new AppError('تسجيل الدخول باستخدام Google غير مهيأ على هذا الخادم', 503);
  }
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackUrl: GOOGLE_CALLBACK_URL };
};

const githubConfig = () => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL } = env;
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_CALLBACK_URL) {
    throw new AppError('GitHub OAuth is not configured on this server', 503);
  }
  return { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET, callbackUrl: GITHUB_CALLBACK_URL };
};

const cookieValue = (req: Request, name: string): string | undefined => {
  const prefix = `${name}=`;
  const entry = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!entry) return undefined;
  try { return decodeURIComponent(entry.slice(prefix.length)); } catch { return undefined; }
};

const safeReturnPath = (value: unknown): string => {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const parsed = new URL(value, env.OAUTH_FRONTEND_URL);
    return parsed.origin === new URL(env.OAUTH_FRONTEND_URL).origin ? `${parsed.pathname}${parsed.search}` : '/';
  } catch { return '/'; }
};

const clearGoogleStateCookie = (res: Response) => res.clearCookie(GOOGLE_STATE_COOKIE, {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: GOOGLE_STATE_COOKIE_PATH,
});

const clearGoogleNonceCookie = (res: Response) => res.clearCookie(GOOGLE_NONCE_COOKIE, {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: GOOGLE_VERIFY_COOKIE_PATH,
});

const clearGithubStateCookie = (res: Response) => res.clearCookie(GITHUB_STATE_COOKIE, {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: GITHUB_STATE_COOKIE_PATH,
});

export const githubStart = (req: Request, res: Response): void => {
  const { clientId, callbackUrl } = githubConfig();
  const state = randomBytes(32).toString('base64url');
  const returnPath = safeReturnPath(req.query.returnTo);
  res.cookie(GITHUB_STATE_COOKIE, `${state}.${Buffer.from(returnPath).toString('base64url')}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: GITHUB_STATE_COOKIE_PATH,
    maxAge: 10 * 60 * 1000,
  });

  const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  }).toString();
  res.redirect(302, authorizationUrl.toString());
};

interface GithubUser {
  id?: number;
  login?: string;
  name?: string | null;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  const returnToLogin = (reason: 'cancelled' | 'failed' | 'configuration') => {
    clearGithubStateCookie(res);
    const loginUrl = new URL('/login', env.OAUTH_FRONTEND_URL);
    loginUrl.searchParams.set('github_error', reason);
    res.redirect(303, loginUrl.toString());
  };

  if (req.query.error) {
    returnToLogin('cancelled');
    return;
  }

  let failureReason: 'failed' | 'configuration' = 'failed';
  try {
    const { clientId, clientSecret, callbackUrl } = githubConfig();
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const storedState = cookieValue(req, GITHUB_STATE_COOKIE);
    if (!code || !state || !storedState) throw new AppError('Invalid GitHub OAuth state', 400);

    const [expectedState, encodedReturnPath] = storedState.split('.');
    const stateBytes = Buffer.from(state);
    const expectedBytes = Buffer.from(expectedState ?? '');
    if (stateBytes.length !== expectedBytes.length || !timingSafeEqual(stateBytes, expectedBytes)) {
      throw new AppError('Invalid GitHub OAuth state', 400);
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mabdeen-Platform-OAuth',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const tokenData = await tokenResponse.json().catch(() => ({})) as {
      access_token?: string;
      token_type?: string;
      error?: string;
    };
    if (!tokenResponse.ok || !tokenData.access_token || tokenData.token_type?.toLowerCase() !== 'bearer') {
      const providerError = tokenData.error || `http_${tokenResponse.status}`;
      console.error(`[GitHub OAuth] Token exchange failed (${providerError}).`);
      if (tokenResponse.status === 404 || ['incorrect_client_credentials', 'redirect_uri_mismatch'].includes(tokenData.error ?? '')) {
        failureReason = 'configuration';
      }
      throw new AppError('GitHub token exchange failed', 401);
    }

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const [userResponse, emailResponse] = await Promise.all([
      fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(10_000) }),
      fetch('https://api.github.com/user/emails', { headers, signal: AbortSignal.timeout(10_000) }),
    ]);
    if (!userResponse.ok || !emailResponse.ok) throw new AppError('GitHub profile verification failed', 401);

    const githubUser = await userResponse.json() as GithubUser;
    const emails = await emailResponse.json() as GithubEmail[];
    const email = emails.find((entry) => entry.primary && entry.verified)?.email ??
      emails.find((entry) => entry.verified)?.email;
    if (!githubUser.id || !githubUser.login || !email) {
      throw new AppError('GitHub account has no verified email', 401);
    }

    const result = await loginWithOAuth(email, githubUser.name?.trim() || githubUser.login);
    clearGithubStateCookie(res);
    const redirectUrl = new URL('/auth/github/callback', env.OAUTH_FRONTEND_URL);
    const returnPath = safeReturnPath(Buffer.from(encodedReturnPath ?? '', 'base64url').toString('utf8'));
    if (returnPath) redirectUrl.searchParams.set('returnTo', returnPath);
    redirectUrl.hash = new URLSearchParams({ token: result.token }).toString();
    res.redirect(303, redirectUrl.toString());
  } catch (error) {
    console.error('[GitHub OAuth] Callback failed:', error instanceof AppError ? `status=${error.statusCode}` : error instanceof Error ? error.name : 'unknown_error');
    returnToLogin(failureReason);
  }
};

export const googleStart = (req: Request, res: Response): void => {
  const { clientId, callbackUrl } = googleConfig();
  const state = randomBytes(32).toString('base64url');
  const returnPath = safeReturnPath(req.query.returnTo);
  const cookiePayload = `${state}.${Buffer.from(returnPath).toString('base64url')}`;

  res.cookie(GOOGLE_STATE_COOKIE, cookiePayload, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: GOOGLE_STATE_COOKIE_PATH,
    maxAge: 10 * 60 * 1000,
  });

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();
  res.redirect(302, authorizationUrl.toString());
};

export const googleNonce = (req: Request, res: Response): void => {
  const clientId = googleClientId();
  const nonce = randomBytes(32).toString('base64url');
  res.setHeader('Cache-Control', 'no-store');
  res.cookie(GOOGLE_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: GOOGLE_VERIFY_COOKIE_PATH,
    maxAge: 10 * 60 * 1000,
  });
  res.status(200).json({ success: true, data: { clientId, nonce } });
};

export const googleVerify = async (
  req: Request<Record<string, string>, unknown, { credential: string }>,
  res: Response,
): Promise<void> => {
  const nonce = cookieValue(req, GOOGLE_NONCE_COOKIE);
  if (!nonce) throw new AppError('انتهت جلسة التحقق؛ أعد المحاولة', 401);

  const claims = await verifyGoogleIdentityToken(req.body.credential, googleClientId(), nonce);
  clearGoogleNonceCookie(res);
  const result = await loginWithGoogle(claims.email!, claims.name || claims.email!.split('@')[0]);
  res.status(200).json({ success: true, data: result });
};

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const returnToLogin = (reason: 'cancelled' | 'failed' | 'invalid_client') => {
    clearGoogleStateCookie(res);
    const loginUrl = new URL('/login', env.OAUTH_FRONTEND_URL);
    loginUrl.searchParams.set('google_error', reason);
    res.redirect(303, loginUrl.toString());
  };

  if (req.query.error) {
    returnToLogin('cancelled');
    return;
  }

  try {
    const { clientId, clientSecret, callbackUrl } = googleConfig();
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const storedState = cookieValue(req, GOOGLE_STATE_COOKIE);
    if (!code || !state || !storedState) throw new AppError('Invalid OAuth state', 400);

    const [expectedState, encodedReturnPath] = storedState.split('.');
    const receivedBytes = Buffer.from(state);
    const expectedBytes = Buffer.from(expectedState ?? '');
    if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) {
      throw new AppError('Invalid OAuth state', 400);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) {
      const providerError = await tokenResponse.json().catch(() => ({})) as { error?: string };
      if (providerError.error === 'invalid_client') {
        console.error('[Google OAuth] Google rejected the configured OAuth client credentials (invalid_client).');
        returnToLogin('invalid_client');
        return;
      }
      console.error(`[Google OAuth] Token exchange failed (${providerError.error || tokenResponse.status}).`);
      throw new AppError('Google token exchange failed', 401);
    }
    const tokenData = await tokenResponse.json() as { access_token?: string; token_type?: string };
    if (!tokenData.access_token || tokenData.token_type?.toLowerCase() !== 'bearer') {
      throw new AppError('Google access token is missing', 401);
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!profileResponse.ok) throw new AppError('Google profile request failed', 401);
    const profile = await profileResponse.json() as GoogleUserInfo;
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      throw new AppError('Google account does not have a verified email', 401);
    }

    const result = await loginWithGoogle(profile.email, profile.name || profile.email.split('@')[0]);
    clearGoogleStateCookie(res);
    const redirectUrl = new URL('/auth/google/callback', env.OAUTH_FRONTEND_URL);
    const returnPath = safeReturnPath(Buffer.from(encodedReturnPath ?? '', 'base64url').toString('utf8'));
    if (returnPath) redirectUrl.searchParams.set('returnTo', returnPath);
    redirectUrl.hash = new URLSearchParams({ token: result.token }).toString();
    res.redirect(303, redirectUrl.toString());
  } catch {
    returnToLogin('failed');
  }
};

