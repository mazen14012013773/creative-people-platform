export type UserRole = 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  impersonatorId?: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
