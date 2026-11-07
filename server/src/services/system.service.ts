import { statSync } from 'node:fs';
import { isIP } from 'node:net';
import { getClient, query } from '../config/db';
import { invalidateUserSessions, recordAdminAudit } from '../models/admin.model';
import {
  blockIp,
  clearPendingFlagsForUser,
  countActiveBlockedIps,
  countPendingFlags,
  getSetting,
  isIpBlocked,
  listBlockedIps,
  listModerationFlags,
  listSessions,
  nowIso,
  pruneSessions,
  recordSession,
  replacePendingFlags,
  revokeSessionById,
  setModerationFlagStatus,
  setSetting,
  textFieldsForScan,
  unblockIp,
} from '../models/system.model';
import type { FlagDraft } from '../models/system.model';
import type { ModerationFlag, ModerationScanResult, SystemHealth, SystemStatus } from '../types/system';
import { readMetrics } from '../middlewares/metrics.middleware';
import { AppError } from '../utils/app-error';
import { isLocalOrPrivateIp, normalizeIpAddress } from '../utils/ip';
import { buildPagination } from '../utils/pagination';
import { buildCleanupSuggestion, moderateText } from '../utils/moderation';

const STATUS_TTL_MS = 1000;

const SETTINGS = {
  maintenance: 'maintenance_mode',
  maintenanceMessage: 'maintenance_message',
  maintenanceReturnsAt: 'maintenance_returns_at',
  registrationOpen: 'registration_open',
  blockedTerms: 'custom_blocked_terms',
} as const;

const boolSetting = async (key: string, fallback: boolean): Promise<boolean> => {
  const value = await getSetting(key);

  if (value === null) {
    return fallback;
  }

  return value === '1' || value === 'true';
};

let statusCache: { at: number; value: SystemStatus } | null = null;

const readStatus = async (): Promise<SystemStatus> => {
  const returnsAt = await getSetting(SETTINGS.maintenanceReturnsAt);
  const registrationOpen = await boolSetting(SETTINGS.registrationOpen, true);

  return {
    maintenanceEnabled: await boolSetting(SETTINGS.maintenance, false),
    maintenanceMessage:
      (await getSetting(SETTINGS.maintenanceMessage)) ??
      'المنصة قيد الصيانة الدورية، نعتذر عن أي تأخير. سنعود قريباً.',
    maintenanceReturnsAt: returnsAt ? returnsAt : null,
    registrationOpen,
    serverTime: nowIso(),
  };
};

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const now = Date.now();

  if (statusCache && now - statusCache.at < STATUS_TTL_MS) {
    return statusCache.value;
  }

  const value = await readStatus();

  statusCache = { at: now, value };

  return value;
};

export const getBlockedTerms = async (): Promise<string[]> => {
  const raw = await getSetting(SETTINGS.blockedTerms);

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
};

export const invalidateStatusCache = (): void => {
  statusCache = null;
};

let lastPruneAt = 0;

const pruneStaleSessions = async (): Promise<void> => {
  const now = Date.now();

  if (now - lastPruneAt < 6 * 60 * 60 * 1000) {
    return;
  }

  lastPruneAt = now;
  await pruneSessions(new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());
};

export interface SettingsPatch {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceReturnsAt?: string | null;
  registrationOpen?: boolean;
  blockedTerms?: string[];
}

export const updateSettings = async (
  adminId: string,
  patch: SettingsPatch,
  reason: string,
): Promise<SystemStatus> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    if (patch.maintenanceEnabled !== undefined) {
      await client.query('INSERT INTO app_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at', [SETTINGS.maintenance, patch.maintenanceEnabled ? '1' : '0', adminId, nowIso()]);
    }

    if (patch.maintenanceMessage !== undefined) {
      await client.query('INSERT INTO app_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at', [SETTINGS.maintenanceMessage, patch.maintenanceMessage, adminId, nowIso()]);
    }

    if (patch.maintenanceReturnsAt !== undefined) {
      await client.query('INSERT INTO app_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at', [SETTINGS.maintenanceReturnsAt, patch.maintenanceReturnsAt || '', adminId, nowIso()]);
    }

    if (patch.registrationOpen !== undefined) {
      await client.query('INSERT INTO app_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at', [SETTINGS.registrationOpen, patch.registrationOpen ? '1' : '0', adminId, nowIso()]);
    }

    if (patch.blockedTerms !== undefined) {
      await client.query('INSERT INTO app_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at', [SETTINGS.blockedTerms, patch.blockedTerms.join(','), adminId, nowIso()]);
    }

    await client.query('COMMIT');
    await recordAdminAudit(adminId, 'system_settings_update', 'system', 'app_settings', reason, {
      fields: Object.keys(patch).filter((key) => key !== 'reason'),
      maintenanceEnabled: patch.maintenanceEnabled,
      registrationOpen: patch.registrationOpen,
    });
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

  invalidateStatusCache();

  return getSystemStatus();
};

export const trackRequestSession = (input: {
  userId: string | null;
  ip: string;
  userAgent: string;
  issuedAtMs?: number | null;
}): Promise<void> => {
  return recordSession(input);
};

const scalar = async (sql: string, ...params: Array<string | number>): Promise<number> => {
  const row = (await query(sql, params)).rows[0] as { total: number } | undefined;

  return Number(row?.total ?? 0);
};

const probeDatabaseLatency = async (): Promise<number> => {
  const startedAt = process.hrtime.bigint();
  await query('SELECT 1');

  return Math.round((Number(process.hrtime.bigint() - startedAt) / 1_000_000) * 100) / 100;
};

export const getSystemHealth = async (): Promise<SystemHealth> => {
  await pruneStaleSessions();

  const metrics = readMetrics();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let databaseOnline = true; let databaseLatencyMs = -1;
  try { databaseLatencyMs = await probeDatabaseLatency(); } catch { databaseOnline = false; }
  const sizeMb = 0;

  const liveSessions = await scalar(
    "SELECT COUNT(*) AS total FROM user_sessions WHERE revoked_at IS NULL AND user_id IS NOT NULL AND last_seen > $1",
    cutoff,
  );
  const anonymousSessions = await scalar(
    'SELECT COUNT(*) AS total FROM user_sessions WHERE user_id IS NULL',
  );
  const revokedSessions = await scalar('SELECT COUNT(*) AS total FROM user_sessions WHERE revoked_at IS NOT NULL');
  const databaseErrors = metrics.statusCounts.fiveXx + metrics.uncaughtErrors;
  const degraded = !databaseOnline || metrics.latency.p95Ms > 1500 || databaseErrors > 50;

  return {
    status: degraded ? 'degraded' : 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    nodeVersion: process.version,
    uptimeSeconds: metrics.uptimeSeconds,
    startedAt: metrics.startedAt,
    now: nowIso(),
    memory: metrics.memory,
    eventLoop: metrics.eventLoop,
    database: {
      latencyMs: databaseLatencyMs,
      sizeMb,
      users: await scalar('SELECT COUNT(*) AS total FROM users'),
      sessions: await scalar('SELECT COUNT(*) AS total FROM user_sessions'),
    },
    latency: metrics.latency,
    traffic: {
      windowSize: metrics.latency.samples,
      requests: metrics.requests,
      statusCounts: metrics.statusCounts,
      errors: databaseErrors,
      topRoutes: metrics.routes.slice(0, 6).map((route) => ({
        route: `${route.method} ${route.path}`,
        count: route.count,
        avgMs: route.avgMs,
      })),
    },
    routes: metrics.routes.map((route) => ({
      method: route.method,
      path: route.path,
      count: route.count,
      avgMs: route.avgMs,
      maxMs: Math.round(route.maxMs * 100) / 100,
    })),
    security: {
      blockedIps: await countActiveBlockedIps(),
      liveSessions,
      anonymousSessions,
      revokedSessions,
      pendingFlags: await countPendingFlags(),
    },
    growth: {
      signups24h: await scalar('SELECT COUNT(*) AS total FROM users WHERE created_at > $1', cutoff),
      profileViews24h: await scalar(
        "SELECT COUNT(*) AS total FROM profile_events WHERE event_type = 'View' AND created_at > $1",
        cutoff,
      ),
    },
  };
};

export const getAdminSessions = async (input: {
  q?: string;
  includeRevoked?: boolean;
  page: number;
  limit: number;
}) => {
  await pruneStaleSessions();

  const result = await listSessions({
    q: input.q,
    includeRevoked: input.includeRevoked,
    limit: input.limit,
    offset: (input.page - 1) * input.limit,
  });

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const forceLogoutUser = async (
  adminId: string,
  userId: string,
  reason: string,
): Promise<{ revoked: number }> => {
  const revoked = await invalidateUserSessions(userId, nowIso());

  if (revoked === 0 && !(await userExists(userId))) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  recordAdminAudit(adminId, 'session_evict_all', 'user', userId, reason, { revoked });

  return { revoked };
};

export const revokeSingleSession = async (
  adminId: string,
  sessionId: number,
  reason: string,
): Promise<{ revoked: boolean; userId: string | null }> => {
  const session = await revokeSessionById(sessionId, nowIso());

  if (!session) {
    throw new AppError('الجلسة غير موجودة', 404);
  }

  recordAdminAudit(adminId, 'session_evict', 'session', String(sessionId), reason, {
    userId: session.userId,
    ip: session.ip,
    userAgent: session.userAgent.slice(0, 160),
  });

  return { revoked: true, userId: session.userId };
};

const userExists = async (userId: string): Promise<boolean> => {
  return (await query('SELECT id FROM users WHERE id = $1', [userId])).rows.length > 0;
};

export const banIpAddress = async (input: {
  ip: string;
  reason: string;
  hours: number | null;
  adminId: string;
  requesterIp?: string | null;
}) => {
  const ip = normalizeIpAddress(input.ip);

  if (!ip || isIP(ip) === 0) {
    throw new AppError('عنوان IP غير صالح', 422);
  }

  if (isLocalOrPrivateIp(ip)) {
    throw new AppError('لا يمكن حظر العناوين المحلية أو الخاصة', 422);
  }

  const requesterIp = input.requesterIp ? normalizeIpAddress(input.requesterIp) : '';

  if (requesterIp && requesterIp === ip) {
    throw new AppError('لا يمكن حظر عنوان IP الذي تستخدمه حاليًا للوصول للوحة', 422);
  }

  const expiresAt =
    input.hours === null ? null : new Date(Date.now() + input.hours * 60 * 60 * 1000).toISOString();

  const block = await blockIp({ ip, reason: input.reason, userId: input.adminId, expiresAt });

  recordAdminAudit(input.adminId, 'ip_block', 'ip', ip, input.reason, { hours: input.hours, expiresAt });

  return block;
};

export const unbanIpAddress = async (ip: string, adminId: string): Promise<void> => {
  const target = normalizeIpAddress(ip);

  if (!(await unblockIp(target))) {
    throw new AppError('العنوان غير موجود في قائمة الحظر', 404);
  }

  recordAdminAudit(adminId, 'ip_unblock', 'ip', target, 'رفع الحظر عن العنوان من لوحة الإدارة');
};

export const getBlockedIpList = async (input: { page: number; limit: number }) => {
  const cutoff = nowIso();

  await query('DELETE FROM ip_blocks WHERE expires_at IS NOT NULL AND expires_at < $1', [cutoff]);

  const result = await listBlockedIps(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const isRequestBlocked = (ip: string): Promise<boolean> => isIpBlocked(ip);

const SCAN_FIELDS: Array<'bio' | 'title'> = ['bio', 'title'];

export const buildDraftsForProfile = async (
  fields: Partial<Record<'bio' | 'title' | 'name' | 'location', string | null | undefined>>,
): Promise<FlagDraft[]> => {
  const drafts: FlagDraft[] = [];
  const extraTerms = await getBlockedTerms();

  for (const field of SCAN_FIELDS) {
    const value = fields[field];

    if (!value) {
      continue;
    }

    const result = moderateText(value, { extraTerms });

    for (const hit of result.hits) {
      drafts.push({
        field,
        rule: hit.rule,
        severity: hit.severity,
        excerpt: hit.excerpt,
        suggestion: result.suggestion,
      });
    }
  }

  return drafts;
};

export const moderateProfileWrite = async (
  userId: string,
  fields: Partial<Record<'bio' | 'title' | 'name' | 'location', string | null | undefined>>,
): Promise<{ blockedMessage: string | null }> => {
  const drafts = await buildDraftsForProfile(fields);

  await replacePendingFlags(userId, drafts);

  const blocked = drafts.find((draft) => draft.severity === 'high');

  if (blocked) {
    return { blockedMessage: `البيانات تحتوي على محتوى محظور: ${blocked.excerpt}` };
  }

  return { blockedMessage: null };
};

export const rescanAllProfiles = async (adminId: string, reason: string): Promise<ModerationScanResult> => {
  const fields = await textFieldsForScan();
  const grouped = new Map<string, FlagDraft[]>();
  const extraTerms = await getBlockedTerms();
  let flagged = 0;

  for (const entry of fields) {
    const result = moderateText(entry.value, { extraTerms });

    if (result.hits.length === 0) {
      continue;
    }

    const drafts = grouped.get(entry.id) ?? [];

    for (const hit of result.hits) {
      drafts.push({
        field: entry.field,
        rule: hit.rule,
        severity: hit.severity,
        excerpt: hit.excerpt,
        suggestion: buildCleanupSuggestion(entry.value),
      });
    }

    grouped.set(entry.id, drafts);
    flagged += 1;
  }

  const client = await getClient();
  try { await client.query('BEGIN');
    for (const [userId, drafts] of grouped.entries()) {
      await replacePendingFlags(userId, drafts);
    }
    await recordAdminAudit(adminId, 'moderation_rescan', 'moderation', 'all', reason, {
      scanned: new Set(fields.map((field) => field.id)).size,
      flagged,
    });
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

  return {
    scanned: new Set(fields.map((field) => field.id)).size,
    flagged,
    skipped: new Set(fields.map((field) => field.id)).size - flagged,
  };
};

export const getModerationFlags = async (input: {
  status?: 'Pending' | 'Resolved' | 'Dismissed';
  severity?: 'low' | 'medium' | 'high';
  page: number;
  limit: number;
}) => {
  const result = await listModerationFlags(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

const FLAG_COLUMNS: Record<string, string> = {
  bio: 'bio',
  title: 'title',
  name: 'name',
  location: 'location',
};

const getFlagById = async (id: string): Promise<ModerationFlag | null> => {
  const row = (await query(
      `SELECT
         mf.id, mf.user_id, u.name AS user_name, u.email AS user_email,
         mf.field, mf.rule, mf.severity, mf.excerpt, mf.suggestion,
         mf.status, mf.created_at, mf.resolved_at
       FROM moderation_flags mf
       JOIN users u ON u.id = mf.user_id
       WHERE mf.id = $1`,
    [id])).rows[0] as
    | {
        id: string;
        user_id: string;
        user_name: string;
        user_email: string;
        field: string;
        rule: string;
        severity: 'low' | 'medium' | 'high';
        excerpt: string;
        suggestion: string | null;
        status: 'Pending' | 'Resolved' | 'Dismissed';
        created_at: string;
        resolved_at: string | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    field: row.field,
    rule: row.rule,
    severity: row.severity,
    excerpt: row.excerpt,
    suggestion: row.suggestion,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
};

export const reviewModerationFlag = async (
  id: string,
  status: 'Pending' | 'Resolved' | 'Dismissed',
  adminId: string,
  reason: string,
): Promise<ModerationFlag> => {
  const flag = await setModerationFlagStatus(id, status, adminId);

  if (!flag) {
    throw new AppError('البلاغ غير موجود', 404);
  }

  recordAdminAudit(adminId, 'moderation_flag_status', 'moderation_flag', id, reason, {
    status,
    userId: flag.userId,
    severity: flag.severity,
  });

  return flag;
};

/** Applies the stored cleanup suggestion straight onto the user's profile column. */
export const applyModerationCleanup = async (
  id: string,
  adminId: string,
  reason: string,
): Promise<{ flag: ModerationFlag; updated: boolean }> => {
  const flag = await getFlagById(id);

  if (!flag) {
    throw new AppError('البلاغ غير موجود', 404);
  }

  const column = FLAG_COLUMNS[flag.field];

  if (!column || !flag.suggestion) {
    throw new AppError('لا يوجد اقتراح تنظيف صالح لهذا البلاغ', 422);
  }

  const client = await getClient();
  try { await client.query('BEGIN');
    await client.query(`UPDATE users SET ${column} = $1 WHERE id = $2`, [flag.suggestion, flag.userId]);
    await setModerationFlagStatus(id, 'Resolved', adminId);
    await recordAdminAudit(adminId, 'profile_cleanup', 'user', flag.userId, reason, {
      flagId: id,
      field: flag.field,
      rule: flag.rule,
    });
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

  const updatedFlag = await getFlagById(id);

  return { flag: updatedFlag ?? flag, updated: true };
};

export const clearUserFlags = (userId: string): Promise<number> => {
  return clearPendingFlagsForUser(userId);
};
