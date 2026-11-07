import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
}

export interface ToastAction { label: string; onClick: () => void }

interface ToastApi {
  success: (message: string, action?: ToastAction) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string, action?: ToastAction) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, type, message, action }]);

      const timer = window.setTimeout(() => remove(id), 4500);
      timers.current.push(timer);
    },
    [remove],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, action) => add('success', message, action),
      error: (message) => add('error', message),
      info: (message) => add('info', message),
    }),
    [add],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 inset-s-4 z-120 flex w-[min(92vw,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-card animate-fade-up',
                STYLES[toast.type],
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" />
              <p className="flex-1 text-sm font-semibold leading-6">{toast.message}</p>
              {toast.action ? <button type="button" onClick={() => { toast.action?.onClick(); remove(toast.id); }} className="shrink-0 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-extrabold underline underline-offset-2">{toast.action.label}</button> : null}
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-lg p-1 transition hover:bg-black/5"
                aria-label="إغلاق التنبيه"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};
