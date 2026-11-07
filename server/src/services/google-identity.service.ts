import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { AppError } from '../utils/app-error';

interface GoogleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
}

interface GoogleIdentityClaims {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nonce?: string;
  exp?: number;
  iat?: number;
}

let cachedKeys: GoogleJwk[] = [];
let keysExpireAt = 0;

const getGoogleSigningKey = async (kid: string): Promise<GoogleJwk> => {
  if (Date.now() >= keysExpireAt || !cachedKeys.some((key) => key.kid === kid)) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);
    if (!response?.ok) throw new AppError('تعذر التحقق من مفاتيح Google حالياً', 503);

    const payload = await response.json() as { keys?: GoogleJwk[] };
    if (!Array.isArray(payload.keys)) throw new AppError('استجابة مفاتيح Google غير صالحة', 503);
    cachedKeys = payload.keys;
    const maxAge = response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1];
    keysExpireAt = Date.now() + (maxAge ? Number(maxAge) : 3600) * 1000;
  }

  const key = cachedKeys.find((candidate) => candidate.kid === kid && candidate.kty === 'RSA' && (!candidate.use || candidate.use === 'sig'));
  if (!key) throw new AppError('رمز Google غير صالح أو منتهي', 401);
  return key;
};

export const verifyGoogleIdentityToken = async (
  token: string,
  expectedAudience: string,
  expectedNonce: string,
): Promise<GoogleIdentityClaims> => {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 12_000) throw new AppError('رمز Google غير صالح', 401);

  let header: { alg?: string; kid?: string };
  let claims: GoogleIdentityClaims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string; kid?: string };
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as GoogleIdentityClaims;
  } catch {
    throw new AppError('رمز Google غير صالح', 401);
  }
  if (header.alg !== 'RS256' || !header.kid) throw new AppError('توقيع Google غير صالح', 401);

  const jwk = await getGoogleSigningKey(header.kid);
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' } as Parameters<typeof createPublicKey>[0]);
  const signedData = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');
  if (!verifySignature('RSA-SHA256', signedData, publicKey, signature)) {
    throw new AppError('توقيع Google غير صالح', 401);
  }

  const audienceMatches = Array.isArray(claims.aud)
    ? claims.aud.includes(expectedAudience)
    : claims.aud === expectedAudience;
  const now = Math.floor(Date.now() / 1000);
  if (
    !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss ?? '') ||
    !audienceMatches ||
    (claims.azp !== undefined && claims.azp !== expectedAudience) ||
    typeof claims.exp !== 'number' || claims.exp <= now ||
    typeof claims.iat !== 'number' || claims.iat > now + 60 ||
    claims.nonce !== expectedNonce ||
    !claims.sub || !claims.email || claims.email_verified !== true
  ) {
    throw new AppError('تعذر التحقق من حساب Google أو البريد الإلكتروني', 401);
  }

  return claims;
};
