import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { TokenPayload } from '../types/auth';

const JWT_ALGORITHM = 'HS256' as const;
const JWT_ISSUER = 'mabdeen';
const JWT_AUDIENCE = 'mabdeen-api';

export const signToken = (payload: TokenPayload, expiresIn?: SignOptions['expiresIn']): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: expiresIn ?? env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

export const verifyToken = (token: string): TokenPayload & JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as TokenPayload & JwtPayload;
};
