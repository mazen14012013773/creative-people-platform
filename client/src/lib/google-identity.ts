import { authApi } from '@/services/auth.service';

interface GoogleCredentialResponse { credential?: string; }
interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (options: { client_id: string; nonce: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
      cancel: () => void;
    };
  };
}

declare global { interface Window { google?: GoogleIdentityApi; } }

let configPromise: ReturnType<typeof authApi.googleNonce> | null = null;
let scriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let activeCallback: ((response: GoogleCredentialResponse) => void) | null = null;
const renderedElements = new WeakSet<HTMLElement>();

const loadScript = (): Promise<void> => {
  if (window.google?.accounts.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.querySelector<HTMLScriptElement>('script[data-google-identity]') ?? document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error('تعذر تحميل خدمة Google')); };
    if (!script.isConnected) document.head.appendChild(script);
  });
  return scriptPromise;
};

export const renderGoogleSignInButton = async (
  element: HTMLElement,
  callback: (response: GoogleCredentialResponse) => void,
  width: number,
): Promise<() => void> => {
  activeCallback = callback;
  configPromise ??= authApi.googleNonce();
  const { clientId, nonce } = await configPromise;
  await loadScript();
  const identity = window.google?.accounts.id;
  if (!identity) throw new Error('تعذر تهيئة تسجيل الدخول باستخدام Google');
  if (initializedClientId && initializedClientId !== clientId) throw new Error('إعداد Google تغير. أعد تحميل الصفحة للمتابعة.');
  if (!initializedClientId) {
    identity.initialize({ client_id: clientId, nonce, callback: (response) => activeCallback?.(response) });
    initializedClientId = clientId;
  }
  if (!renderedElements.has(element)) {
    identity.renderButton(element, {
      type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with',
      shape: 'pill', logo_alignment: 'left', locale: 'ar', width: Math.min(width, element.clientWidth || width),
    });
    renderedElements.add(element);
  }
  return () => {
    if (activeCallback === callback) activeCallback = null;
    identity.cancel();
  };
};
