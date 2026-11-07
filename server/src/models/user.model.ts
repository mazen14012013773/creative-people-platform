import { randomUUID } from 'node:crypto';
import { getClient, query } from '../config/db';
import type { PoolClient } from 'pg';
import type { UserRole } from '../types/auth';
import type { PublicUser } from '../types/user';
import { getFreelancerLevel } from '../utils/freelancer-level';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  whatsapp_number: string | null;
  role: UserRole;
  bio: string | null;
  title: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  parent_phone: string | null;
  parent_photo: string | null;
  parent_approval_token: string | null;
  account_status: 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';
  is_available: number;
  is_featured: number;
  is_verified: number;
  featured_until: string | null;
  avg_response_hours: number | null;
  token_invalid_before: string | null;
  profile_complete: number;
  points_balance: number;
  account_suspended_until: string | null;
  is_active: number;
  is_deleted: number;
  deleted_at: string | null;
  is_private: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  passwordHash: string;
  role: Exclude<UserRole, 'Admin'>;
  title: string | null;
  location: string | null;
  bio: string | null;
  profileComplete?: boolean;
}

export const awardProfileCompletion = async (client: PoolClient, userId: string, sourceKey: string): Promise<void> => {
  const beforeResult = await client.query<{ points_balance: number }>(
    "SELECT points_balance FROM users WHERE id = $1 AND role = 'Freelancer' FOR UPDATE",
    [userId],
  );
  const before = Number(beforeResult.rows[0]?.points_balance ?? 0);
  const points = 30;
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO points_history (id, user_id, amount, reason, source_key)
     SELECT $1, id, $2, $3, $4 FROM users WHERE id = $5 AND role = 'Freelancer'
     ON CONFLICT (source_key) DO NOTHING RETURNING id`,
    [randomUUID(), points, 'إكمال الملف الشخصي بنسبة 100%', sourceKey, userId],
  );
  if (!inserted.rowCount) return;

  const after = before + points;
  await client.query(
    `UPDATE users SET points_balance = points_balance + $1,
       is_featured = CASE WHEN points_balance <= 500 AND points_balance + $1 > 500 THEN 1 ELSE is_featured END,
       featured_until = CASE WHEN points_balance <= 500 AND points_balance + $1 > 500
         THEN $2 ELSE featured_until END
     WHERE id = $3 AND role = 'Freelancer'`,
    [points, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), userId],
  );

  const previousLevel = getFreelancerLevel(before);
  const nextLevel = getFreelancerLevel(after);
  if (nextLevel.number > previousLevel.number) {
    await client.query(
      `INSERT INTO user_notifications (id, user_id, type, title, message, link)
       VALUES ($1, $2, 'REWARD_EARNED', $3, $4, '/dashboard')`,
      [randomUUID(), userId, `مبروك! وصلت إلى المستوى ${nextLevel.number}`, `وصلت إلى ${nextLevel.title}. استمر في إنجاز الطلبات والتقييمات لفتح مزايا جديدة.`],
    );
  }
};

export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  whatsappNumber: row.whatsapp_number,
  role: row.role,
  bio: row.bio,
  title: row.title,
  location: row.location,
  minBudget: row.min_budget,
  hourlyRate: row.hourly_rate,
  avatarUrl: row.avatar_url,
  isAvailable: Boolean(row.is_available),
  isFeatured: Boolean(row.is_featured) && (!row.featured_until || row.featured_until > new Date().toISOString()),
  isVerified: Boolean(row.is_verified),
  avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
  isActive: Boolean(row.is_active),
  profileComplete: Boolean(row.profile_complete),
  accountStatus: row.account_status,
  isPrivate: Boolean(row.is_private),
  createdAt: row.created_at,
  pointsBalance: row.role === 'Freelancer' ? Number(row.points_balance ?? 0) : 0,
});

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const result = await query<UserRow>(
    'SELECT * FROM users WHERE lower(email) = lower($1) AND is_deleted = 0 LIMIT 1',
    [email],
  );
  return result.rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<UserRow | null> => {
  const result = await query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND is_deleted = 0 LIMIT 1',
    [id],
  );
  return result.rows[0] ?? null;
};

export const invalidateUserTokens = async (userId: string): Promise<void> => {
  await query('UPDATE users SET token_invalid_before = $1 WHERE id = $2', [new Date().toISOString(), userId]);
};

export const restoreExpiredSuspension = async (user: UserRow): Promise<UserRow> => {
  if (user.is_active || !user.account_suspended_until || Date.parse(user.account_suspended_until) > Date.now()) return user;
  const result = await query<UserRow>(
    `UPDATE users SET is_active = 1, account_suspended_until = NULL
     WHERE id = $1 AND account_suspended_until = $2 RETURNING *`,
    [user.id, user.account_suspended_until],
  );
  return result.rows[0] ?? user;
};

export const updateAccountProfile = async (
  userId: string,
  input: { name: string; phone: string | null; whatsappNumber: string | null; isPrivate?: boolean },
): Promise<UserRow | null> => {
  const result = await query<UserRow>(
    `UPDATE users
       SET name = $1, phone = $2, whatsapp_number = $3, is_private = COALESCE($4, is_private),
           updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND is_deleted = 0
     RETURNING *`,
    [input.name, input.phone, input.whatsappNumber, input.isPrivate === undefined ? null : Number(input.isPrivate), userId],
  );
  return result.rows[0] ?? null;
};

export const updatePasswordHash = async (userId: string, passwordHash: string): Promise<boolean> => {
  const result = await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND is_deleted = 0',
    [passwordHash, userId],
  );
  return (result.rowCount ?? 0) > 0;
};

export const updateBuyerAccount = async (
  userId: string,
  input: { name?: string; avatarUrl?: string | null },
): Promise<UserRow | null> => {
  const assignments: string[] = [];
  const values: Array<string | null> = [];
  if (input.name !== undefined) { values.push(input.name); assignments.push(`name = $${values.length}`); }
  if (input.avatarUrl !== undefined) { values.push(input.avatarUrl); assignments.push(`avatar_url = $${values.length}`); }
  if (!assignments.length) return null;
  values.push(userId);
  const result = await query<UserRow>(
    `UPDATE users SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length} AND role IN ('Buyer', 'Parent') RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
};

export const createAccount = async (input: CreateAccountInput): Promise<UserRow> => {
  const id = randomUUID();
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query<UserRow>(
      `INSERT INTO users
         (id, name, email, password_hash, role, title, location, bio, profile_complete, account_status, points_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)
       RETURNING *`,
      [id, input.name, input.email, input.passwordHash, input.role, input.title, input.location, input.bio,
        input.profileComplete === false ? 0 : 1,
        input.role === 'Freelancer' ? 'PENDING_PARENT_APPROVAL' : 'ACTIVE'],
    );
    let created = result.rows[0];
    if (!created) throw new Error('Failed to create account');
    if (created.role === 'Freelancer' && created.profile_complete) {
      await awardProfileCompletion(client, id, `profile-complete:${id}`);
      created = (await client.query<UserRow>('SELECT * FROM users WHERE id = $1', [id])).rows[0] ?? created;
    }
    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const completeGoogleProfileForUser = async (
  userId: string,
  input: { name: string; role: Exclude<UserRole, 'Admin'>; title: string | null; location: string | null },
): Promise<UserRow | null> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query<UserRow>(
      `UPDATE users SET name = $1, role = $2, title = $3, location = $4, profile_complete = 1,
          account_status = CASE WHEN $5 = 'Freelancer' THEN account_status ELSE 'ACTIVE' END
       WHERE id = $6 AND profile_complete = 0 RETURNING *`,
      [input.name, input.role, input.title, input.location, input.role, userId],
    );
    let updated = result.rows[0] ?? null;
    if (updated?.role === 'Freelancer') {
      await awardProfileCompletion(client, userId, `profile-complete:${userId}`);
      updated = (await client.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId])).rows[0] ?? updated;
    }
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
