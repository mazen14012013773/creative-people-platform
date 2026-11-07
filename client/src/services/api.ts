import axios from 'axios';

export const TOKEN_KEY = 'mabdeen_token';
const LEGACY_TOKEN_KEYS = ['saleka_token', 'mansa_token'];

export const tokenStorage = {
  get: (): string | null => {
    const current = localStorage.getItem(TOKEN_KEY);
    if (current) return current;
    const legacy = LEGACY_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ?? null;
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy);
      LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    }
    return legacy;
  },
  set: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
    LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  },
};

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Array<{ field: string; message: string }>;
}

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, ''),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get' && (url.startsWith('/admin/') || url.startsWith('/parent/admin/'))) {
    const defaultReason = 'Administrative action';
    if (config.data instanceof FormData) {
      if (!String(config.data.get('reason') ?? '').trim()) config.data.set('reason', defaultReason);
    } else if (config.data && typeof config.data === 'object') {
      const body = config.data as Record<string, unknown>;
      if (typeof body.reason !== 'string' || !body.reason.trim()) body.reason = defaultReason;
      if (typeof body.notes !== 'string' || !body.notes.trim()) body.notes = defaultReason;
    } else config.data = { reason: defaultReason };
  }

  return config;
});

const AUTH_ATTEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
];

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        const url = error.config?.url ?? '';
        const isAuthAttempt = AUTH_ATTEMPT_PATHS.some((path) => url.endsWith(path));

        if (!isAuthAttempt && tokenStorage.get()) {
          tokenStorage.clear();
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }

      if (status === 503) {
        const payload = error.response?.data as { code?: string } | undefined;

        if (payload?.code === 'MAINTENANCE') {
          window.dispatchEvent(new Event('system:maintenance'));
        }
      }
    }

    return Promise.reject(error);
  },
);

export const unwrap = <T>(response: { data: ApiResponse<T> }): T => response.data.data;
export const getErrorMessage = (
  error: unknown,
  fallback = 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: Array<{ field: string; message: string }> }
      | undefined;

    if (payload?.errors?.length) {
      return payload.errors
        .slice(0, 2)
        .map((item) => item.message)
        .join(' • ');
    }

    if (payload?.message) {
      return payload.message;
    }

    if (!error.response) {
      return 'تعذر الاتصال بالخادم، تأكد من تشغيله ثم حاول مرة أخرى';
    }
  }

  return fallback;
};
