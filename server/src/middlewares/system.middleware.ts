import type { NextFunction, Request, Response } from 'express';
import { getSystemStatus, isRequestBlocked, trackRequestSession } from '../services/system.service';
import { verifyToken } from '../utils/jwt';
import { isLocalOrPrivateIp, normalizeIpAddress } from '../utils/ip';

const TRACKED_PREFIX = '/api/';
const WRITE_COOLDOWN_MS = 30_000;

const exemptPaths = new Set(['/api/health', '/api/system/status']);

const lastWriteAt = new Map<string, number>();

const readToken = (req: Request): string | null => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice(7).trim() || null;
};

const readPayload = (req: Request) => {
  const token = readToken(req);

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
};

export const ipBlockMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = normalizeIpAddress(req.ip ?? '');

  if (ip && !isLocalOrPrivateIp(ip) && await await isRequestBlocked(ip)) {
    res.status(403).json({
      success: false,
      code: 'IP_BLOCKED',
      message: 'تم حظر هذا العنوان من الوصول للمنصة. تواصل مع الإدارة.',
    });
    return;
  }

  next();
};

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const status = await getSystemStatus();

  if (!status.maintenanceEnabled) {
    next();
    return;
  }

  const path = req.path;

  if (exemptPaths.has(path) || path.startsWith('/api/auth/') || path.startsWith('/uploads/')) {
    next();
    return;
  }

  const payload = readPayload(req);

  if (payload?.role === 'Admin') {
    next();
    return;
  }

  if (path.startsWith(TRACKED_PREFIX)) {
    res.status(503).json({
      success: false,
      code: 'MAINTENANCE',
      message: status.maintenanceMessage,
      data: { returnsAt: status.maintenanceReturnsAt },
    });
    return;
  }

  next();
};

export const sessionTrackingMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (req.method === 'OPTIONS' || !req.path.startsWith(TRACKED_PREFIX)) {
    next();
    return;
  }

  const payload = readPayload(req);
  const userId = payload?.sub ?? null;
  const ip = normalizeIpAddress(req.ip ?? '') || 'unknown';
  const userAgent = req.get('user-agent') ?? '';
  const key = `${userId ?? 'anon'}|${ip}`;
  const now = Date.now();
  const last = lastWriteAt.get(key);

  if (last !== undefined && now - last < WRITE_COOLDOWN_MS) {
    next();
    return;
  }

  if (lastWriteAt.size > 2000) {
    lastWriteAt.clear();
  }

  lastWriteAt.set(key, now);

  try {
    await trackRequestSession({
      userId,
      ip,
      userAgent,
      issuedAtMs: payload?.iat ? payload.iat * 1000 : null,
    });
  } catch (error) {
    console.error('Failed to track session:', error);
  }

  next();
};
