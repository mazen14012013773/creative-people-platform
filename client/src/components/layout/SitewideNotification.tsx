import { useQuery } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { sanitizeText } from '@/lib/sanitize';
import { notificationsApi } from '@/services/notifications.service';

const STORAGE_KEY = 'mabdeen:dismissed-notifications';
const LEGACY_STORAGE_KEY = 'saleka:dismissed-notifications';

const getDismissedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]';
    const value = JSON.parse(raw) as unknown;
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, raw);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const SitewideNotification = () => {
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);
  const query = useQuery({
    queryKey: ['sitewide-notification'],
    queryFn: notificationsApi.active,
    staleTime: 60_000,
  });
  const notification = query.data?.[0];

  if (!notification || dismissedIds.includes(notification.id)) return null;

  const dismiss = () => {
    const next = [...new Set([...dismissedIds, notification.id])];
    setDismissedIds(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage may be disabled */ }
  };

  return (
    <aside className="border-b border-brand-200 bg-brand-50" aria-live="polite">
      <div className="container-page flex items-start gap-3 py-3 text-brand-950">
        <Bell className="mt-0.5 size-5 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{sanitizeText(notification.title)}</p>
          <p className="mt-0.5 whitespace-pre-line text-sm leading-6 text-brand-900">{sanitizeText(notification.message)}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="إغلاق الإشعار" className="rounded-lg p-1 text-brand-700 hover:bg-brand-100">
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
};
