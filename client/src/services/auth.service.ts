import type { AuthResult, AuthUser } from '@/types';
import { api, unwrap } from './api';


export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  accountType: 'Freelancer' | 'Buyer' | 'Parent';
  title?: string;
  location?: string;
}

export interface GoogleProfileCompletionPayload {
  name: string;
  accountType: 'Freelancer' | 'Buyer' | 'Parent';
  title?: string;
  location?: string;
}

export interface AccountProfilePayload {
  name: string;
  phone?: string;
  whatsappNumber?: string;
  isPrivate?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  googleNonce: async (): Promise<{ clientId: string; nonce: string }> => {
    const response = await api.get('/auth/google/nonce');
    return unwrap<{ clientId: string; nonce: string }>(response);
  },

  googleVerify: async (credential: string): Promise<AuthResult> => {
    const response = await api.post('/auth/google/verify', { credential });
    return unwrap<AuthResult>(response);
  },

  login: async (payload: LoginPayload): Promise<AuthResult> => {
    const response = await api.post('/auth/login', payload);
    return unwrap<AuthResult>(response);
  },

  register: async (payload: RegisterPayload): Promise<AuthResult> => {
    const response = await api.post('/auth/register', payload);
    return unwrap<AuthResult>(response);
  },

  me: async (): Promise<AuthUser> => {
    const response = await api.get('/auth/me');
    const data = unwrap<{ user: AuthUser }>(response);
    return data.user;
  },

  logout: async (token: string): Promise<void> => {
    await api.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } });
  },

  completeGoogleProfile: async (payload: GoogleProfileCompletionPayload): Promise<AuthUser> => {
    const response = await api.patch('/auth/google/complete-profile', payload);
    return unwrap<{ user: AuthUser }>(response).user;
  },

  updateAccount: async (payload: AccountProfilePayload): Promise<AuthUser> => {
    const response = await api.patch('/auth/account', payload);
    return unwrap<{ user: AuthUser }>(response).user;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.patch('/auth/account/password', payload);
  },
};
