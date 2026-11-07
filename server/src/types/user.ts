import type { UserRole } from './auth';

export type AccountStatus = 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  role: UserRole;
  bio: string | null;
  title: string | null;
  location: string | null;
  minBudget: number | null;
  hourlyRate: number | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  isActive: boolean;
  profileComplete: boolean;
  accountStatus: AccountStatus;
  isPrivate: boolean;
  createdAt: string;
  pointsBalance: number;
}
