import { randomUUID } from 'node:crypto';
import { getClient, query } from '../config/db';
import type {
  AdminAuditLog,
  AdminConversation,
  AdminConversationMessage,
  AdminOrder,
  AdminOrderDetail,
  AdminReport,
  AdminReview,
  AdminStats,
  AdminUnifiedReport,
  AdminUser,
} from '../types/admin';
import type { AdminOrdersQueryInput, AdminUsersQueryInput } from '../validators/admin.validator';
import { REVISION_LIMIT } from './orders.model';
import { awardPoints } from './rewards.model';
import { insertUserNotificationRecord } from './notification.model';
import { AppError } from '../utils/app-error';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
  account_status: 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';
  title: string | null;
  bio: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_active: number;
  is_available: number;
  is_featured: number;
  is_verified: number;
  featured_until: string | null;
  avg_response_hours: number | null;
  created_at: string;
  avg_rating: number;
  review_count: number;
  pending_flags: number;
}

interface AdminReportRow {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_email: string;
  reason: string;
  status: 'Pending' | 'Resolved';
  created_at: string;
}

interface AdminReviewRow {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  client_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface AdminConversationRow {
  participant_a_id: string;
  participant_a_name: string;
  participant_a_email: string;
  participant_a_avatar_url: string | null;
  participant_b_id: string;
  participant_b_name: string;
  participant_b_email: string;
  participant_b_avatar_url: string | null;
  service_id: string | null;
  service_title: string | null;
  last_message_at: string;
  message_count: number;
}

interface AdminMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

interface AdminOrderRow {
  id: string;
  service_id: string;
  service_title: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_email: string;
  status: AdminOrder['status'];
  price_amount: number;
  delivery_version: number;
  revision_notes: string | null;
  revisions_used: number;
  created_at: string;
  updated_at: string;
  due_at: string;
}

const ADMIN_USER_SELECT = `
  SELECT
    u.id, u.name, u.email, u.phone, u.whatsapp_number, u.role, u.account_status,
    u.title, u.bio, u.location, u.min_budget, u.hourly_rate, u.avatar_url,
    u.is_active, u.is_available, u.is_featured, u.is_verified,
    u.featured_until, u.avg_response_hours, u.created_at,
    COALESCE(s.avg_rating, 0) AS avg_rating,
    COALESCE(s.review_count, 0) AS review_count,
    (
      SELECT COUNT(*) FROM moderation_flags mf
      WHERE mf.user_id = u.id AND mf.status = 'Pending'
    ) AS pending_flags
  FROM users u
  LEFT JOIN freelancer_stats s ON s.freelancer_id = u.id
`;

const mapAdminUser = (row: AdminUserRow): AdminUser => {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    role: row.role,
    accountStatus: row.account_status,
    title: row.title,
    bio: row.bio,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isActive: Boolean(row.is_active),
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    isVerified: Boolean(row.is_verified),
    featuredUntil: row.featured_until,
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    createdAt: row.created_at,
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    pendingFlags: Number(row.pending_flags ?? 0),
  };
};

const mapReport = (row: AdminReportRow): AdminReport => {
  return {
    id: row.id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    freelancerEmail: row.freelancer_email,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
};

const mapReview = (row: AdminReviewRow): AdminReview => {
  return {
    id: row.id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    clientName: row.client_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
};

const mapAdminOrder = (row: AdminOrderRow): AdminOrder => {
  const revisionsUsed = Number(row.revisions_used ?? 0);
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceTitle: row.service_title,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    freelancerEmail: row.freelancer_email,
    status: row.status,
    priceAmount: Number(row.price_amount ?? 0),
    deliveryVersion: Number(row.delivery_version ?? 0),
    revisionNotes: row.revision_notes,
    revisionsUsed,
    revisionLimit: REVISION_LIMIT,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueAt: row.due_at,
  };
};

const ADMIN_ORDER_SELECT = `
  SELECT o.id, o.service_id, o.service_title,
    o.buyer_id, b.name AS buyer_name, b.email AS buyer_email,
    o.freelancer_id, f.name AS freelancer_name, f.email AS freelancer_email,
    o.status, o.price_amount, o.delivery_version, o.revision_notes,
    o.created_at, o.updated_at, o.due_at,
    (SELECT COUNT(*) FROM order_events e WHERE e.order_id = o.id AND e.event_type = 'REVISION_REQUESTED') AS revisions_used
  FROM orders o
  JOIN users b ON b.id = o.buyer_id
  JOIN users f ON f.id = o.freelancer_id
`;

export const getAdminUserById = async (userId: string): Promise<AdminUser | null> => {
  const row = (await query(`${ADMIN_USER_SELECT} WHERE u.id = $1 AND u.is_deleted = FALSE LIMIT 1`, [userId])).rows[0] as AdminUserRow | undefined;

  return row ? mapAdminUser(row) : null;
};

export const listAdminUsers = async (
  filters: AdminUsersQueryInput,
): Promise<{ items: AdminUser[]; total: number }> => {
  const clauses: string[] = ['u.is_deleted = 0'];
  const params: unknown[] = [];

  if (filters.role) {
    clauses.push(`u.role = $${params.length + 1}`);
    params.push(filters.role);
  }

  if (filters.status) {
    clauses.push(`u.is_active = $${params.length + 1}`);
    params.push(filters.status === 'active');
  }

  if (filters.featured !== undefined) {
    clauses.push(`u.is_featured = $${params.length + 1}`);
    params.push(filters.featured);
  }

  if (filters.verified !== undefined) {
    clauses.push(`u.is_verified = $${params.length + 1}`);
    params.push(filters.verified);
  }

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push(`(u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 2} OR u.phone ILIKE $${params.length + 3} OR u.whatsapp_number ILIKE $${params.length + 4})`);
    params.push(like, like, like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = (await query(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params)).rows[0] as { total: number } | undefined;

  const offset = (filters.page - 1) * filters.limit;

  const rows = (await query(
      `${ADMIN_USER_SELECT}
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.limit, offset])).rows as AdminUserRow[];

  return {
    items: rows.map(mapAdminUser),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const setUserStatus = async (
  userId: string,
  isActive: boolean,
  expectedIsActive?: boolean,
): Promise<AdminUser | null> => {
  const result = await query(
    `UPDATE users SET is_active = $1 WHERE id = $2 AND is_deleted = FALSE AND role IN ('Freelancer', 'Buyer', 'Parent') AND ($3::boolean IS NULL OR is_active = $4)`,
    [isActive, userId, expectedIsActive ?? null, expectedIsActive ?? null],
  );

  return result.rowCount ? getAdminUserById(userId) : null;
};

export const setUserFeatured = async (
  userId: string,
  isFeatured: boolean,
  featuredUntil: string | null = null,
): Promise<AdminUser | null> => {
  const result = await query(`UPDATE users SET is_featured = $1, featured_until = $2 WHERE id = $3 AND is_deleted = FALSE AND role = 'Freelancer'`, [isFeatured, isFeatured ? featuredUntil : null, userId]);

  return result.rowCount ? getAdminUserById(userId) : null;
};

export const setUserVerified = async (
  userId: string,
  isVerified: boolean,
): Promise<AdminUser | null> => {
  const result = await query('UPDATE users SET is_verified = $1 WHERE id = $2 AND is_deleted = FALSE', [isVerified, userId]);

  return result.rowCount ? getAdminUserById(userId) : null;
};

export const setUserRole = async (
  userId: string,
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin',
): Promise<AdminUser | null> => {
  const result = await query("UPDATE users SET role = $1 WHERE id = $2 AND is_deleted = FALSE AND role != 'Admin'", [role, userId]);

  return result.rowCount ? getAdminUserById(userId) : null;
};

const MANAGED_USER_COLUMNS: Record<string, string> = {
  name: 'name',
  title: 'title',
  bio: 'bio',
  location: 'location',
  minBudget: 'min_budget',
  hourlyRate: 'hourly_rate',
  avatarUrl: 'avatar_url',
  avgResponseHours: 'avg_response_hours',
};

export interface ManagedUserFields {
  name?: string;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  minBudget?: number | null;
  hourlyRate?: number | null;
  avatarUrl?: string | null;
  avgResponseHours?: number | null;
}

export const updateManagedUser = async (
  userId: string,
  fields: ManagedUserFields,
): Promise<AdminUser | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of Object.entries(MANAGED_USER_COLUMNS)) {
    const value = fields[field as keyof ManagedUserFields];

    if (value !== undefined) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    return getAdminUserById(userId);
  }

  values.push(userId);
  const result = await query(`UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length} AND is_deleted = FALSE`, values);

  return result.rowCount ? getAdminUserById(userId) : null;
};

export const setUserPassword = async (userId: string, passwordHash: string): Promise<boolean> => {
  const result = await query("UPDATE users SET password_hash = $1 WHERE id = $2 AND is_deleted = FALSE AND role != $3", [passwordHash, userId, 'Admin']);

  return (result.rowCount ?? 0) > 0;
};

export const invalidateUserSessions = async (userId: string, cutoff: string): Promise<number> => {
  await query('UPDATE users SET token_invalid_before = $1 WHERE id = $2', [cutoff, userId]);

  const result = await query(`UPDATE user_sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`, [cutoff, userId]);

  return result.rowCount ?? 0;
};

export const deleteManagedUser = async (
  userId: string,
): Promise<{ deleted: true; archived: boolean }> => {
  try {
    const result = await query("DELETE FROM users WHERE id = $1 AND role != 'Admin' AND is_deleted = FALSE", [userId]);

    if ((result.rowCount ?? 0) > 0) {
      return { deleted: true, archived: false };
    }
  } catch (error) {
    // Users with orders/chat history cannot be hard-deleted while foreign keys
    // are enforced; fall back to an archive that preserves those records.
    if (!(error instanceof Error) || !/FOREIGN KEY constraint failed/i.test(error.message)) {
      throw error;
    }
  }

  const now = new Date().toISOString();
  const archived = await query(
    `UPDATE users SET is_deleted = TRUE, deleted_at = $1, is_active = FALSE, email = $2,
      token_invalid_before = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND role != 'Admin' AND is_deleted = FALSE`,
    [now, `deleted+${userId}@removed.invalid`, now, userId],
  );

  if (!archived.rowCount) {
    throw new AppError('تعذر حذف الحساب أو أرشفته', 500);
  }

  return { deleted: true, archived: true };
};

export const listAdminReports = async (
  page: number,
  limit: number,
  status?: 'Pending' | 'Resolved',
): Promise<{ items: AdminReport[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (status) {
    clauses.push(`r.status = $${params.length + 1}`);
    params.push(status);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = (await query(`SELECT COUNT(*) AS total FROM reports r ${whereSql}`, params)).rows[0] as { total: number } | undefined;

  const offset = (page - 1) * limit;

  const rows = (await query(
      `SELECT
         r.id, r.freelancer_id, u.name AS freelancer_name, u.email AS freelancer_email,
         r.reason, r.status, r.created_at
       FROM reports r
       JOIN users u ON u.id = r.freelancer_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset])).rows as AdminReportRow[];

  return {
    items: rows.map(mapReport),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const setReportStatus = async (
  reportId: string,
  status: 'Pending' | 'Resolved' | 'Dismissed',
): Promise<AdminReport | null> => {
  const result = await query('UPDATE reports SET status = $1 WHERE id = $2', [status, reportId]);

  if (!result.rowCount) {
    return null;
  }

  const row = (await query(
      `SELECT
         r.id, r.freelancer_id, u.name AS freelancer_name, u.email AS freelancer_email,
         r.reason, r.status, r.created_at
       FROM reports r
       JOIN users u ON u.id = r.freelancer_id
       WHERE r.id = $1`,
    [reportId])).rows[0] as AdminReportRow | undefined;

  return row ? mapReport(row) : null;
};

interface UnifiedReportRow {
  id: string;
  kind: 'account' | 'content';
  reporter_name: string | null;
  reporter_email: string | null;
  target_id: string;
  target_name: string;
  target_email: string;
  target_role: string;
  category: string;
  description: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  admin_action_notes: string | null;
  action_type: string | null;
  proof_files: string;
  created_at: string;
}

const mapUnifiedReport = (row: UnifiedReportRow): AdminUnifiedReport => {
  let proofFiles: AdminUnifiedReport['proofFiles'] = [];

  try {
    const parsed = JSON.parse(row.proof_files) as unknown;
    if (Array.isArray(parsed)) {
      proofFiles = parsed as AdminUnifiedReport['proofFiles'];
    }
  } catch {
    proofFiles = [];
  }

  return {
    id: row.id,
    kind: row.kind,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    targetId: row.target_id,
    targetName: row.target_name,
    targetEmail: row.target_email,
    targetRole: row.target_role,
    category: row.category,
    description: row.description,
    status: row.status,
    adminActionNotes: row.admin_action_notes,
    actionType: row.action_type,
    proofFiles,
    createdAt: row.created_at,
  };
};

export const listUnifiedAdminReports = async (
  page: number,
  limit: number,
  status?: 'PENDING' | 'RESOLVED' | 'DISMISSED',
): Promise<{ items: AdminUnifiedReport[]; total: number }> => {
  const sourceSql = `
    SELECT ar.id, 'account' AS kind, reporter.name AS reporter_name, reporter.email AS reporter_email,
      target.id AS target_id, target.name AS target_name, target.email AS target_email, target.role AS target_role,
      ar.reason_category AS category, ar.description, ar.status, ar.admin_action_notes, ar.action_type,
      ar.proof_files, ar.created_at
    FROM account_reports ar
    JOIN users reporter ON reporter.id = ar.reporter_id
    JOIN users target ON target.id = ar.reported_user_id
    UNION ALL
    SELECT r.id, 'content' AS kind, NULL AS reporter_name, NULL AS reporter_email,
      u.id AS target_id, u.name AS target_name, u.email AS target_email, u.role AS target_role,
      r.reason AS category, r.reason AS description,
      CASE r.status WHEN 'Pending' THEN 'PENDING' WHEN 'Dismissed' THEN 'DISMISSED' ELSE 'RESOLVED' END AS status,
      NULL AS admin_action_notes, NULL AS action_type, '[]' AS proof_files, r.created_at
    FROM reports r
    JOIN users u ON u.id = r.freelancer_id
  `;

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (status) {
    clauses.push(`q.status = $${params.length + 1}`);
    params.push(status);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = (await query(`SELECT COUNT(*) AS total FROM (${sourceSql}) q ${whereSql}`, params)).rows[0] as { total: number } | undefined;

  const rows = (await query(
      `SELECT * FROM (${sourceSql}) q ${whereSql}
       ORDER BY CASE q.status WHEN 'PENDING' THEN 0 WHEN 'RESOLVED' THEN 1 ELSE 2 END,
         q.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit])).rows as UnifiedReportRow[];

  return {
    items: rows.map(mapUnifiedReport),
    total: Number(countRow?.total ?? 0),
  };
};

export const listAdminReviews = async (
  page: number,
  limit: number,
  q?: string,
): Promise<{ items: AdminReview[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (q) {
    const like = `%${q}%`;
    clauses.push(`(rv.client_name ILIKE $${params.length + 1} OR u.name ILIKE $${params.length + 2})`);
    params.push(like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = (await query(
      `SELECT COUNT(*) AS total
       FROM reviews rv
       JOIN users u ON u.id = rv.freelancer_id
       ${whereSql}`,
    params)).rows[0] as { total: number } | undefined;

  const offset = (page - 1) * limit;

  const rows = (await query(
      `SELECT
         rv.id, rv.freelancer_id, u.name AS freelancer_name,
         rv.client_name, rv.rating, rv.comment, rv.created_at
       FROM reviews rv
       JOIN users u ON u.id = rv.freelancer_id
       ${whereSql}
       ORDER BY rv.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset])).rows as AdminReviewRow[];

  return {
    items: rows.map(mapReview),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const deleteReview = async (reviewId: string): Promise<boolean> => {
  const result = await query('DELETE FROM reviews WHERE id = $1', [reviewId]);
  return (result.rowCount ?? 0) > 0;
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const totals = (await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_deleted = FALSE) AS freelancers,
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_active = TRUE AND is_deleted = FALSE) AS active_freelancers,
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_featured = TRUE AND is_deleted = FALSE) AS featured_freelancers,
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_verified = TRUE AND is_deleted = FALSE) AS verified_freelancers,
         (SELECT COUNT(*) FROM reviews rv JOIN users u ON u.id = rv.freelancer_id WHERE u.is_deleted = FALSE) AS reviews,
         ((SELECT COUNT(*) FROM reports WHERE status = 'Pending') + (SELECT COUNT(*) FROM account_reports WHERE status = 'PENDING')) AS pending_reports,
         (SELECT COUNT(*) FROM moderation_flags WHERE status = 'Pending') AS pending_flags,
         (SELECT COUNT(*) FROM ip_blocks WHERE expires_at IS NULL OR expires_at > NOW()) AS blocked_ips,
         (SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL AND user_id IS NOT NULL AND last_seen > NOW() - INTERVAL '30 minutes') AS live_sessions,
         (SELECT COUNT(*) FROM profile_events WHERE event_type = 'View') AS profile_views`,
    )).rows[0] as
    | {
        freelancers: number;
        active_freelancers: number;
        featured_freelancers: number;
        verified_freelancers: number;
        reviews: number;
        pending_reports: number;
        pending_flags: number;
        blocked_ips: number;
        live_sessions: number;
        profile_views: number;
      }
    | undefined;

  const topSkills = (await query(
      `SELECT sk.id, sk.name, COUNT(DISTINCT us.user_id) AS freelancers
       FROM skills sk
       JOIN user_skills us ON us.skill_id = sk.id
       JOIN users u ON u.id = us.user_id
       WHERE u.role = 'Freelancer' AND u.is_active = TRUE AND u.is_deleted = FALSE
       GROUP BY sk.id, sk.name
       ORDER BY freelancers DESC, sk.name ASC
       LIMIT 8`,
    )).rows as Array<{
    id: string;
    name: string;
    freelancers: number;
  }>;

  return {
    freelancers: Number(totals?.freelancers ?? 0),
    activeFreelancers: Number(totals?.active_freelancers ?? 0),
    featuredFreelancers: Number(totals?.featured_freelancers ?? 0),
    verifiedFreelancers: Number(totals?.verified_freelancers ?? 0),
    reviews: Number(totals?.reviews ?? 0),
    pendingReports: Number(totals?.pending_reports ?? 0),
    pendingFlags: Number(totals?.pending_flags ?? 0),
    blockedIps: Number(totals?.blocked_ips ?? 0),
    liveSessions: Number(totals?.live_sessions ?? 0),
    profileViews: Number(totals?.profile_views ?? 0),
    topSkills: topSkills.map((skill) => ({
      ...skill,
      freelancers: Number(skill.freelancers),
    })),
  };
};

export const listAdminConversations = async (
  page: number,
  limit: number,
  q?: string,
): Promise<{ items: AdminConversation[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q) {
    const like = `%${q}%`;
    clauses.push(`(a.name ILIKE $${params.length + 1} OR a.email ILIKE $${params.length + 2} OR b.name ILIKE $${params.length + 3} OR b.email ILIKE $${params.length + 4} OR s.title ILIKE $${params.length + 5})`);
    params.push(like, like, like, like, like);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const normalized = `
    WITH normalized AS (
      SELECT
        CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END AS participant_a_id,
        CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END AS participant_b_id,
        service_id, created_at
      FROM messages
    ), grouped AS (
      SELECT participant_a_id, participant_b_id, service_id,
        COUNT(*) AS message_count, MAX(created_at) AS last_message_at
      FROM normalized
      GROUP BY participant_a_id, participant_b_id, service_id
    )
  `;
  const count = (await query(`${normalized}
    SELECT COUNT(*) AS total FROM grouped g
    JOIN users a ON a.id = g.participant_a_id
    JOIN users b ON b.id = g.participant_b_id
    LEFT JOIN services s ON s.id = g.service_id
    ${whereSql}`, params)).rows[0] as { total: number } | undefined;
  const offset = (page - 1) * limit;
  const rows = (await query(`${normalized}
    SELECT g.participant_a_id, a.name AS participant_a_name, a.email AS participant_a_email,
      a.avatar_url AS participant_a_avatar_url,
      g.participant_b_id, b.name AS participant_b_name, b.email AS participant_b_email,
      b.avatar_url AS participant_b_avatar_url,
      g.service_id, s.title AS service_title, g.message_count, g.last_message_at
    FROM grouped g
    JOIN users a ON a.id = g.participant_a_id
    JOIN users b ON b.id = g.participant_b_id
    LEFT JOIN services s ON s.id = g.service_id
    ${whereSql}
    ORDER BY g.last_message_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])).rows as AdminConversationRow[];

  return {
    items: rows.map((row) => ({
      participantAId: row.participant_a_id,
      participantAName: row.participant_a_name,
      participantAEmail: row.participant_a_email,
      participantAAvatarUrl: row.participant_a_avatar_url,
      participantBId: row.participant_b_id,
      participantBName: row.participant_b_name,
      participantBEmail: row.participant_b_email,
      participantBAvatarUrl: row.participant_b_avatar_url,
      serviceId: row.service_id,
      serviceTitle: row.service_title,
      lastMessageAt: row.last_message_at,
      messageCount: Number(row.message_count),
    })),
    total: Number(count?.total ?? 0),
  };
};

export const readAdminConversation = async (
  adminId: string,
  participantAId: string,
  participantBId: string,
  serviceId: string | null,
  reason: string,
): Promise<AdminConversationMessage[] | null> => {
  const [a, b] = [participantAId, participantBId].sort();
  const rows = (await query(`SELECT id, sender_id, receiver_id, content, created_at,
      attachment_name, attachment_mime, attachment_size
    FROM messages
    WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))
      AND service_id IS NOT DISTINCT FROM $5
    ORDER BY created_at ASC, id ASC
    LIMIT 500`, [a, b, b, a, serviceId])).rows as AdminMessageRow[];
  if (rows.length === 0) return null;

  const auditId = randomUUID();
  const subjectId = `${a}:${b}:${serviceId ?? 'direct'}`;
  await query(`INSERT INTO admin_audit_logs
    (id, admin_id, action, subject_type, subject_id, reason, metadata_json)
    VALUES ($1, $2, 'view_conversation', 'conversation', $3, $4, $5)`, [auditId, adminId, subjectId, reason, JSON.stringify({ participantAId: a, participantBId: b, serviceId, messageCount: rows.length })]);

  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at,
    attachment: row.attachment_name && row.attachment_mime
      ? { name: row.attachment_name, mimeType: row.attachment_mime, size: Number(row.attachment_size ?? 0) }
      : null,
  }));
};

interface AdminAuditRow {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  subject_type: string;
  subject_id: string;
  reason: string;
  metadata_json: string;
  created_at: string;
}

export interface AdminAuditFilters {
  adminId?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const recordAdminAudit = async (
  adminId: string | null,
  action: string,
  subjectType: string,
  subjectId: string,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<void> => {
  await query(`INSERT INTO admin_audit_logs
    (id, admin_id, action, subject_type, subject_id, reason, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, [randomUUID(), adminId, action, subjectType, subjectId, reason, metadata ? JSON.stringify(metadata) : '{}']);
};

export const listAdminOrders = async (
  filters: AdminOrdersQueryInput,
): Promise<{ items: AdminOrder[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    clauses.push(`o.status = $${params.length + 1}`);
    params.push(filters.status);
  }

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push(`(o.id ILIKE $${params.length + 1} OR o.service_title ILIKE $${params.length + 2} OR b.name ILIKE $${params.length + 3} OR b.email ILIKE $${params.length + 4} OR f.name ILIKE $${params.length + 5} OR f.email ILIKE $${params.length + 6})`);
    params.push(like, like, like, like, like, like);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const countRow = (await query(`SELECT COUNT(*) AS total FROM orders o
    JOIN users b ON b.id = o.buyer_id JOIN users f ON f.id = o.freelancer_id ${whereSql}`, params)).rows[0] as { total: number } | undefined;
  const offset = (filters.page - 1) * filters.limit;
  const rows = (await query(`${ADMIN_ORDER_SELECT} ${whereSql}
    ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.limit, offset])).rows as AdminOrderRow[];

  return { items: rows.map(mapAdminOrder), total: Number(countRow?.total ?? 0) };
};

export const getAdminOrderDetail = async (orderId: string): Promise<AdminOrderDetail | null> => {
  const row = (await query(`${ADMIN_ORDER_SELECT} WHERE o.id = $1 LIMIT 1`, [orderId])).rows[0] as AdminOrderRow | undefined;

  if (!row) {
    return null;
  }

  const events = (await query(`SELECT e.id, e.actor_id AS actorId, u.name AS actorName,
      e.event_type AS eventType, e.details, e.created_at AS createdAt
    FROM order_events e LEFT JOIN users u ON u.id = e.actor_id
    WHERE e.order_id = $1 ORDER BY e.created_at ASC, e.id ASC`, [orderId])).rows as AdminOrderDetail['events'];

  const deliveries = (await query(`SELECT d.id, d.version_number AS versionNumber, d.original_filename AS originalFilename,
      d.mime_type AS mimeType, d.file_size AS fileSize, d.relative_path AS relativePath, d.sha256,
      d.freelancer_notes AS freelancerNotes, d.created_at AS createdAt
    FROM order_deliveries d WHERE d.order_id = $1 ORDER BY d.version_number DESC, d.created_at DESC`, [orderId])).rows as AdminOrderDetail['deliveries'];

  const messages = (await query(`SELECT m.id, m.sender_id AS senderId, u.name AS senderName, m.content, m.created_at AS createdAt
    FROM order_messages m JOIN users u ON u.id = m.sender_id
    WHERE m.order_id = $1 ORDER BY m.created_at ASC, m.id ASC LIMIT 500`, [orderId])).rows as AdminOrderDetail['messages'];

  return {
    order: mapAdminOrder(row),
    events,
    deliveries,
    messages,
  };
};

export const forceAdminOrderAction = async (
  orderId: string,
  adminId: string,
  action: 'CANCEL' | 'CLOSE',
  reason: string,
  grantCompletionPoints = false,
): Promise<AdminOrder> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const row = (await client.query(`${ADMIN_ORDER_SELECT} WHERE o.id = $1 LIMIT 1`, [orderId])).rows[0] as AdminOrderRow | undefined;
    if (!row) throw new AppError('الطلب غير موجود.', 404);
    if (row.status === 'COMPLETED' || row.status === 'CANCELLED') {
      throw new AppError('لا يمكن تعديل طلب مكتمل أو ملغى.', 409);
    }

    const nextStatus = action === 'CANCEL' ? 'CANCELLED' : 'COMPLETED';
    const changed = await client.query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3`, [nextStatus, orderId, row.status]);
    if (!changed.rowCount) throw new AppError('تغيرت حالة الطلب قبل تنفيذ الإجراء.', 409);

    await client.query('INSERT INTO order_events (id, order_id, actor_id, event_type, details) VALUES ($1, $2, $3, $4, $5)', [randomUUID(), orderId, adminId,
        action === 'CANCEL' ? 'ADMIN_ORDER_CANCELLED' : 'ADMIN_ORDER_CLOSED',
        reason]);

    const title = action === 'CANCEL' ? 'ألغت الإدارة الطلب' : 'أغلقت الإدارة الطلب';
    const message = action === 'CANCEL'
      ? `أُلغى الطلب «${row.service_title}» بقرار من إدارة المنصة. سبب القرار: ${reason}`
      : `أُغلق الطلب «${row.service_title}» بقرار من إدارة المنصة. سبب القرار: ${reason}`;
    await insertUserNotificationRecord(row.buyer_id, 'ORDER_UPDATE', title, message, `/orders/${orderId}`);
    await insertUserNotificationRecord(row.freelancer_id, 'ORDER_UPDATE', title, message, `/orders/${orderId}`);

    if (action === 'CLOSE' && grantCompletionPoints) {
      await awardPoints(row.freelancer_id, 50, `إغلاق الطلب بقرار الإدارة (${orderId})`, `order:${orderId}:complete`);
    }

    await recordAdminAudit(
      adminId,
      action === 'CANCEL' ? 'force_cancel_order' : 'force_close_order',
      'order',
      orderId,
      reason,
      { previousStatus: row.status, nextStatus, grantedCompletionPoints: action === 'CLOSE' && grantCompletionPoints },
    );

    const updated = (await client.query(`${ADMIN_ORDER_SELECT} WHERE o.id = $1 LIMIT 1`, [orderId])).rows[0] as AdminOrderRow | undefined;
    if (!updated) throw new AppError('تعذر تحديث حالة الطلب', 500);
    await client.query('COMMIT');
    return mapAdminOrder(updated);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};

export const listAdminAuditLogs = async (
  page: number,
  limit: number,
  filters: AdminAuditFilters = {},
): Promise<{ items: AdminAuditLog[]; total: number }> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.adminId) {
    clauses.push(`l.admin_id = $${params.length + 1}`);
    params.push(filters.adminId);
  }

  if (filters.entityId) {
    clauses.push(`(l.subject_id = $${params.length + 1} OR l.metadata_json ILIKE $${params.length + 2})`);
    params.push(filters.entityId, `%${filters.entityId}%`);
  }

  if (filters.action) {
    clauses.push(`l.action = $${params.length + 1}`);
    params.push(filters.action);
  }

  if (filters.from) {
    clauses.push(`l.created_at >= $${params.length + 1}`);
    params.push(filters.from);
  }

  if (filters.to) {
    clauses.push(`l.created_at <= $${params.length + 1}`);
    params.push(filters.to);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = (await query(`SELECT COUNT(*) AS total FROM admin_audit_logs l ${whereSql}`, params)).rows[0] as { total: number };
  const rows = (await query(`SELECT l.id, l.admin_id, u.name AS admin_name, l.action,
      l.subject_type, l.subject_id, l.reason, l.metadata_json, l.created_at
    FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.admin_id
    ${whereSql}
    ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit])).rows as AdminAuditRow[];

  return {
    items: rows.map((row) => {
      let metadata: Record<string, unknown> = {};

      try {
        const parsed = JSON.parse(row.metadata_json) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          metadata = parsed as Record<string, unknown>;
        }
      } catch {
        metadata = {};
      }

      return {
        id: row.id,
        adminId: row.admin_id,
        adminName: row.admin_name,
        action: row.action,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        reason: row.reason,
        metadata,
        createdAt: row.created_at,
      };
    }),
    total: Number(total.total),
  };
};
