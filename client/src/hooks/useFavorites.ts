import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { freelancersApi } from '@/services/freelancers.service';

const STORAGE_KEY = 'mabdeen:favorites';
const LEGACY_STORAGE_KEYS = ['saleka:favorites', 'mansa:favorites'];
const CHANGE_EVENT = 'mabdeen:favorites-changed';

const readFavorites = (): string[] => {
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

    const ids = Array.from(
      new Set(parsed.filter((value): value is string => typeof value === 'string')),
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    return ids;
  } catch {
    return [];
  }
};

const writeFavorites = (ids: string[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    return;
  }
};

export const useFavorites = () => {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>(readFavorites);
  const idsRef = useRef(ids);

  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  useEffect(() => {
    const sync = () => setIds(readFavorites());

    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    const adding = !idsRef.current.includes(id);
    const next = idsRef.current.includes(id)
      ? idsRef.current.filter((item) => item !== id)
      : [id, ...idsRef.current];

    idsRef.current = next;
    writeFavorites(next);
    setIds(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    if (adding && user?.role === 'Buyer') void freelancersApi.notifyFavorite(id).catch(() => undefined);
  }, [user?.id, user?.role]);

  const removeFavorite = useCallback((id: string) => {
    if (!idsRef.current.includes(id)) {
      return;
    }

    const next = idsRef.current.filter((item) => item !== id);
    idsRef.current = next;
    writeFavorites(next);
    setIds(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    favoriteIds: ids,
    favoriteCount: ids.length,
    isFavorite: (id: string) => ids.includes(id),
    toggleFavorite,
    removeFavorite,
  };
};
