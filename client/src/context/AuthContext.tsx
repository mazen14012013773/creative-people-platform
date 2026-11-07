import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type LoginPayload, type RegisterPayload } from '@/services/auth.service';
import { tokenStorage } from '@/services/api';
import type { AuthResult, AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  impersonatedUserName: string | null;
  beginImpersonation: (token: string, name: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const IMPERSONATION_ADMIN_TOKEN = 'mabdeen_impersonation_admin_token';
const IMPERSONATION_NAME = 'mabdeen_impersonation_name';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(() => sessionStorage.getItem(IMPERSONATION_NAME));
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(tokenStorage.get()));

  useEffect(() => {
    const token = tokenStorage.get();

    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    authApi
      .me()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          tokenStorage.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.clear();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [queryClient]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authApi.login(payload);
      queryClient.clear();
      tokenStorage.set(result.token);
      setUser(result.user);
      return result;
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authApi.register(payload);
      queryClient.clear();
      tokenStorage.set(result.token);
      setUser(result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    const token = tokenStorage.get();
    tokenStorage.clear();
    sessionStorage.removeItem(IMPERSONATION_ADMIN_TOKEN);
    sessionStorage.removeItem(IMPERSONATION_NAME);
    setImpersonatedUserName(null);
    queryClient.clear();
    setUser(null);
    if (token) void authApi.logout(token).catch(() => undefined);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null);
      return;
    }

    const currentUser = await authApi.me();
    setUser(currentUser);
  }, []);

  const beginImpersonation = useCallback(async (token: string, name: string) => {
    const currentToken = tokenStorage.get();
    if (!currentToken || !user || user.role !== 'Admin') throw new Error('Admin session is required');
    sessionStorage.setItem(IMPERSONATION_ADMIN_TOKEN, currentToken);
    sessionStorage.setItem(IMPERSONATION_NAME, name);
    tokenStorage.set(token);
    queryClient.clear();
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      setImpersonatedUserName(name);
    } catch (error) {
      tokenStorage.set(currentToken);
      sessionStorage.removeItem(IMPERSONATION_ADMIN_TOKEN);
      sessionStorage.removeItem(IMPERSONATION_NAME);
      throw error;
    }
  }, [queryClient, user]);

  const endImpersonation = useCallback(async () => {
    const adminToken = sessionStorage.getItem(IMPERSONATION_ADMIN_TOKEN);
    if (!adminToken) return;
    tokenStorage.set(adminToken);
    sessionStorage.removeItem(IMPERSONATION_ADMIN_TOKEN);
    sessionStorage.removeItem(IMPERSONATION_NAME);
    queryClient.clear();
    setImpersonatedUserName(null);
    setUser(await authApi.me());
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser, impersonatedUserName, beginImpersonation, endImpersonation }),
    [user, isLoading, login, register, logout, refreshUser, impersonatedUserName, beginImpersonation, endImpersonation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
