import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mabdeen:recently-viewed';
const LEGACY_STORAGE_KEYS = ['saleka:recently-viewed', 'mansa:recently-viewed'];
const CHANGE_EVENT = 'mabdeen:recently-viewed-changed';
const MAX_ITEMS = 8;

export interface RecentlyViewedProfile {
  id: string;
  viewedAt: number;
}

const readRecentlyViewed = (): RecentlyViewedProfile[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const items = parsed
      .filter(
        (value): value is RecentlyViewedProfile =>
          typeof value === 'object' &&
          value !== null &&
          typeof (value as RecentlyViewedProfile).id === 'string' &&
          typeof (value as RecentlyViewedProfile).viewedAt === 'number',
      )
      .slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    return items;
  } catch {
    return [];
  }
};

const writeRecentlyViewed = (items: RecentlyViewedProfile[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    return;
  }
};

export const useRecentlyViewed = () => {
  const [items, setItems] = useState<RecentlyViewedProfile[]>(readRecentlyViewed);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const sync = () => setItems(readRecentlyViewed());

    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const recordView = useCallback((id: string) => {
    const next = [
      { id, viewedAt: Date.now() },
      ...itemsRef.current.filter((item) => item.id !== id),
    ].slice(0, MAX_ITEMS);

    itemsRef.current = next;
    writeRecentlyViewed(next);
    setItems(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    itemsRef.current = [];
    writeRecentlyViewed([]);
    setItems([]);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    recentProfiles: items,
    recentCount: items.length,
    recordView,
    clearRecentlyViewed,
  };
};
