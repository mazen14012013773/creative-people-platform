import type { AuthenticatedUser, TokenPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      authToken?: TokenPayload & { iat?: number; exp?: number };
    }
  }
}

export {};
