import { createHash, randomUUID } from 'node:crypto';
import { query } from '../config/db';
import { describeAgent } from '../utils/agent';
import type { ActiveSession, IpBlock, ModerationFlag } from '../types/system';

export const nowIso = (): string => new Date().toISOString();

const agentHash = (userAgent: string): string =>
  createHash('sha1').update(userAgent).digest('hex').slice(0, 16);

interface SessionRow {
  id: number;
  user_id: string | null;
  name: string | null;
  email: string | null;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin' | null;
  ip: string;
  user_agent: string;
  route_count: number;
  first_seen: string;
  last_seen: string;
  revoked_at: string | null;
}

const mapSession = (row: SessionRow): ActiveSession => {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    ip: row.ip,
    userAgent: row.user_agent,
    device: describeAgent(row.user_agent),
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    routeCount: Number(row.route_count),
    revokedAt: row.revoked_at,
  };
};

export const getSetting = async (key: string): Promise<string | null> => {
  const row = (await query('SELECT value FROM app_settings WHERE key = $1', [key])).rows[0] as { value: string } | undefined;

  return row?.value ?? null;
};

export const setSetting = async (key: string, value: string, updatedBy: string | null): Promise<void> => {
  await query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       value = excluded.value,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`,
    [key, value, updatedBy, nowIso()],
  );
};

export const recordSession = async (input: {
  userId: string | null;
  ip: string;
  userAgent: string;
  issuedAtMs?: number | null;
}): Promise<void> => {
  const hash = agentHash(input.userAgent);
  const sessionKey = `${input.userId ?? 'anon'}|${input.ip}|${hash}`;
  const seen = nowIso();

  await query(
    `INSERT INTO user_sessions (session_key, user_id, ip, user_agent, agent_hash, last_seen)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_key) DO UPDATE SET
       route_count = user_sessions.route_count + 1,
       last_seen = excluded.last_seen`,
    [sessionKey, input.userId, input.ip, input.userAgent.slice(0, 300), hash, seen],
  );

  // A token issued after the revocation is a fresh login on the same device,
  // so the row becomes active again without ever trusting an older token.
  if (input.issuedAtMs) {
    await query(
      `UPDATE user_sessions SET revoked_at = NULL
       WHERE session_key = $1 AND revoked_at IS NOT NULL AND EXTRACT(EPOCH FROM revoked_at) * 1000 < $2`,
      [sessionKey, input.issuedAtMs],
    );
  }
};

export const isSessionRevoked = async (input: {
  userId: string;
  ip: string;
  userAgent: string;
  issuedAtMs: number;
}): Promise<boolean> => {
  const hash = agentHash(input.userAgent);

  const row = (await query(
      `SELECT MAX(revoked_at) AS revoked_at FROM user_sessions
       WHERE user_id = $1 AND ip = $2 AND agent_hash = $3 AND revoked_at IS NOT NULL`,
    [input.userId, input.ip, hash])).rows[0] as { revoked_at: string | null } | undefined;

  if (!row?.revoked_at) {
    return false;
  }

  const revokedAtMs = Date.parse(row.revoked_at);

  return Number.isFinite(revokedAtMs) && input.issuedAtMs <= revokedAtMs;
};

export const revokeSessionById = async (
  sessionId: number,
  revokedAt: string,
): Promise<{ userId: string | null; ip: string; userAgent: string } | null> => {
  const row = (await query('SELECT user_id, ip, user_agent FROM user_sessions WHERE id = $1', [sessionId])).rows[0] as { user_id: string | null; ip: string; user_agent: string } | undefined;

  if (!row) {
    return null;
  }

  await query('UPDATE user_sessions SET revoked_at = $1 WHERE id = $2', [revokedAt, sessionId]);

  return { userId: row.user_id, ip: row.ip, userAgent: row.user_agent };
};

export interface SessionFilters {
  q?: string;
  userId?: string;
  includeRevoked?: boolean;
  limit: number;
  offset: number;
}

export const listSessions = async (
  filters: SessionFilters,
): Promise<{ items: ActiveSession[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (!filters.includeRevoked) {
    clauses.push('s.revoked_at IS NULL');
  }

  if (filters.userId) {
    clauses.push(`s.user_id = $${params.length + 1}`);
    params.push(filters.userId);
  }

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push(`(s.ip ILIKE $${params.length + 1} OR u.name ILIKE $${params.length + 2} OR u.email ILIKE $${params.length + 3})`);
    params.push(like, like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = (await query(
      `SELECT COUNT(*) AS total FROM user_sessions s LEFT JOIN users u ON u.id = s.user_id ${whereSql}`,
      params,
  )).rows[0] as { total: number } | undefined;

  const rows = (await query(
      `SELECT
         s.id, s.user_id, u.name, u.email, u.role, s.ip, s.user_agent,
         s.route_count, s.first_seen, s.last_seen, s.revoked_at
       FROM user_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       ${whereSql}
       ORDER BY s.last_seen DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.limit, filters.offset])).rows as SessionRow[];

  return { items: rows.map(mapSession), total: Number(countRow?.total ?? 0) };
};

export const pruneSessions = async (cutoffIso: string): Promise<number> => {
  return (await query('DELETE FROM user_sessions WHERE last_seen < $1', [cutoffIso])).rowCount ?? 0;
};

interface BlockedIpRow {
  ip: string;
  reason: string;
  created_at: string;
  expires_at: string | null;
  created_by_name: string | null;
}

const mapIpBlock = (row: BlockedIpRow): IpBlock => {
  return {
    ip: row.ip,
    reason: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    createdByName: row.created_by_name,
  };
};

export const isIpBlocked = async (ip: string): Promise<boolean> => {
  const row = (await query(
      `SELECT ip FROM ip_blocks
       WHERE lower(ip) = lower($1) AND (expires_at IS NULL OR expires_at > $2)
       LIMIT 1`,
      [ip, nowIso()],
  )).rows[0];

  return row !== undefined;
};

export const blockIp = async (input: {
  ip: string;
  reason: string;
  userId: string;
  expiresAt: string | null;
}): Promise<IpBlock> => {
  await query(
    `INSERT INTO ip_blocks (ip, reason, created_by, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (ip) DO UPDATE SET
       reason = excluded.reason,
       created_by = excluded.created_by,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`,
    [input.ip, input.reason, input.userId, nowIso(), input.expiresAt],
  );

  const row = (await query(
      `SELECT b.ip, b.reason, b.created_at, b.expires_at, u.name AS created_by_name
       FROM ip_blocks b
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.ip = $1`,
    [input.ip])).rows[0] as BlockedIpRow;

  return mapIpBlock(row);
};

export const unblockIp = async (ip: string): Promise<boolean> => {
  return (await query('DELETE FROM ip_blocks WHERE lower(ip) = lower($1)', [ip])).rowCount! > 0;
};

export const listBlockedIps = async (input: { page: number; limit: number }): Promise<{
  items: IpBlock[];
  total: number;
}> => {
  const countRow = (await query('SELECT COUNT(*) AS total FROM ip_blocks')).rows[0] as { total: number } | undefined;

  const rows = (await query(
      `SELECT b.ip, b.reason, b.created_at, b.expires_at, u.name AS created_by_name
       FROM ip_blocks b
       LEFT JOIN users u ON u.id = b.created_by
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
    [input.limit, (input.page - 1) * input.limit])).rows as BlockedIpRow[];

  return { items: rows.map(mapIpBlock), total: Number(countRow?.total ?? 0) };
};

export const countActiveBlockedIps = async (): Promise<number> => {
  const row = (await query('SELECT COUNT(*) AS total FROM ip_blocks WHERE expires_at IS NULL OR expires_at > $1', [nowIso()])).rows[0] as { total: number } | undefined;

  return Number(row?.total ?? 0);
};

export interface FlagDraft {
  field: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
  excerpt: string;
  suggestion: string | null;
}

export const replacePendingFlags = async (userId: string, drafts: FlagDraft[]): Promise<void> => {
  await query("DELETE FROM moderation_flags WHERE user_id = $1 AND status = 'Pending'", [userId]);
  for (const draft of drafts) {
    await query(
      'INSERT INTO moderation_flags (id, user_id, field, rule, severity, excerpt, suggestion) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
      randomUUID(),
      userId,
      draft.field,
      draft.rule,
      draft.severity,
      draft.excerpt.slice(0, 400),
      draft.suggestion ? draft.suggestion.slice(0, 400) : null,
    ]);
  }
};

interface ModerationFlagRow {
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

const mapFlag = (row: ModerationFlagRow): ModerationFlag => {
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

export const listModerationFlags = async (input: {
  status?: 'Pending' | 'Resolved' | 'Dismissed';
  severity?: 'low' | 'medium' | 'high';
  page: number;
  limit: number;
}): Promise<{ items: ModerationFlag[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (input.status) {
    clauses.push(`mf.status = $${params.length + 1}`);
    params.push(input.status);
  }

  if (input.severity) {
    clauses.push(`mf.severity = $${params.length + 1}`);
    params.push(input.severity);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = (await query(`SELECT COUNT(*) AS total FROM moderation_flags mf ${whereSql}`, params)).rows[0] as { total: number } | undefined;

  const rows = (await query(
      `SELECT
         mf.id, mf.user_id, u.name AS user_name, u.email AS user_email,
         mf.field, mf.rule, mf.severity, mf.excerpt, mf.suggestion,
         mf.status, mf.created_at, mf.resolved_at
       FROM moderation_flags mf
       JOIN users u ON u.id = mf.user_id
       ${whereSql}
       ORDER BY CASE mf.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
         mf.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, input.limit, (input.page - 1) * input.limit])).rows as ModerationFlagRow[];

  return { items: rows.map(mapFlag), total: Number(countRow?.total ?? 0) };
};

export const setModerationFlagStatus = async (
  id: string,
  status: 'Pending' | 'Resolved' | 'Dismissed',
  resolvedBy: string,
): Promise<ModerationFlag | null> => {
  const result = await query(
      `UPDATE moderation_flags
       SET status = $1, resolved_by = $2, resolved_at = CASE WHEN $3 = 'Pending' THEN NULL ELSE $4 END
       WHERE id = $5`,
    [status, resolvedBy, status, nowIso(), id]);

  if (!result.rowCount) {
    return null;
  }

  const row = (await query(
      `SELECT
         mf.id, mf.user_id, u.name AS user_name, u.email AS user_email,
         mf.field, mf.rule, mf.severity, mf.excerpt, mf.suggestion,
         mf.status, mf.created_at, mf.resolved_at
       FROM moderation_flags mf
       JOIN users u ON u.id = mf.user_id
       WHERE mf.id = $1`,
    [id])).rows[0] as ModerationFlagRow | undefined;

  return row ? mapFlag(row) : null;
};

export const clearPendingFlagsForUser = async (userId: string): Promise<number> => {
  return (await query("DELETE FROM moderation_flags WHERE user_id = $1 AND status = 'Pending'", [userId])).rowCount ?? 0;
};

export const countPendingFlags = async (): Promise<number> => {
  const row = (await query("SELECT COUNT(*) AS total FROM moderation_flags WHERE status = 'Pending'")).rows[0] as { total: number } | undefined;

  return Number(row?.total ?? 0);
};

export const textFieldsForScan = async (): Promise<Array<{ id: string; name: string; email: string; field: string; value: string }>> => {
  const rows = (await query(
      `SELECT id, name, email, bio, title, location
       FROM users
       WHERE role = 'Freelancer' AND is_active = TRUE`)).rows as Array<{
    id: string;
    name: string;
    email: string;
    bio: string | null;
    title: string | null;
    location: string | null;
  }>;

  const fields: Array<{ id: string; name: string; email: string; field: string; value: string }> = [];

  for (const row of rows) {
    if (row.bio) {
      fields.push({ id: row.id, name: row.name, email: row.email, field: 'bio', value: row.bio });
    }

    if (row.title) {
      fields.push({ id: row.id, name: row.name, email: row.email, field: 'title', value: row.title });
    }
  }

  return fields;
};
