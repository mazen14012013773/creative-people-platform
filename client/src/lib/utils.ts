import { clsx, type ClassValue } from 'clsx';
import type { Role } from '@/types';

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

export const getDashboardPath = (role: Role): string => {
  if (role === 'Admin') {
    return '/admin';
  }

  if (role === 'Buyer') {
    return '/buyer';
  }

  if (role === 'Parent') return '/parent';

  return '/dashboard';
};

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('ar-EG').format(value);

export const formatPrice = (value: number): string =>
  value > 0 ? `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value)} ج.م` : 'حسب الاتفاق';


export const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

export const getInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
};

