import { randomUUID } from 'node:crypto';
import { getClient, query } from '../config/db';
import type { PoolClient } from 'pg';
import type {
  FreelancerCard,
  FreelancerStats,
  PortfolioItem,
  PublicFreelancer,
  Review,
  Skill,
} from '../types/freelancer';
import { AppError } from '../utils/app-error';
import type {
  CreateReportInput,
  UpdateProfileInput,
} from '../validators/freelancer.validator';
import { listPortfolioByUser } from './portfolio.model';
import { getSkillsForUser } from './skill.model';
import { getFreelancerLevel } from '../utils/freelancer-level';
import { awardProfileCompletion } from './user.model';

interface FreelancerCardRow {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_available: number;
  is_featured: number;
  is_verified: number;
  featured_until: string | null;
  avg_response_hours: number | null;
  created_at: string;
  avg_rating: number;
  review_count: number;
  skills: string | Skill[] | null;
}

interface FreelancerProfileRow {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_available: number;
  is_featured: number;
  is_verified: number;
  featured_until: string | null;
  avg_response_hours: number | null;
  created_at: string;
  points_balance: number;
}

interface ReviewRow {
  id: string;
  client_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  service_title: string | null;
  freelancer_reply: string | null;
  replied_at: string | null;
}

interface StatsRow {
  view_count: number;
  review_count: number;
  avg_rating: number;
}

interface ReportRow {
  id: string;
  reason: string;
  status: 'Pending' | 'Resolved';
  created_at: string;
}

export interface SearchFreelancersFilters {
  q?: string;
  skillId?: string;
  location?: string;
  governorate?: string;
  budget?: number;
  minBudget?: number;
  maxBudget?: number;
  featured?: boolean;
  available?: boolean;
  verified?: boolean;
  minRating?: number;
  maxResponseHours?: number;
  sort?: 'featured' | 'newest' | 'rating' | 'budget_low' | 'response';
  page: number;
  limit: number;
}

const parseSkills = (value: string | Skill[] | null): Skill[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((skill): skill is Skill => {
      return (
        typeof skill === 'object' &&
        skill !== null &&
        typeof (skill as Skill).id === 'string' &&
        typeof (skill as Skill).name === 'string'
      );
    });
  } catch {
    return [];
  }
};

const mapCard = (row: FreelancerCardRow): FreelancerCard => {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured) && (!row.featured_until || row.featured_until > new Date().toISOString()),
    isVerified: Boolean(row.is_verified),
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    createdAt: row.created_at,
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    skills: parseSkills(row.skills),
  };
};

const mapPublicFreelancer = (row: FreelancerProfileRow): PublicFreelancer => {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured) && (!row.featured_until || row.featured_until > new Date().toISOString()),
    isVerified: Boolean(row.is_verified),
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    createdAt: row.created_at,
    level: getFreelancerLevel(Number(row.points_balance ?? 0)),
  };
};

const mapReview = (row: ReviewRow): Review => {
  return {
    id: row.id,
    clientName: row.client_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    serviceTitle: row.service_title,
    freelancerReply: row.freelancer_reply,
    repliedAt: row.replied_at,
  };
};

const mapStats = (row: StatsRow | undefined): Omit<FreelancerStats, 'sellerBadge' | 'fastDeliveryBadge'> => {
  return {
    viewCount: Number(row?.view_count ?? 0),
    reviewCount: Number(row?.review_count ?? 0),
    avgRating: Number(row?.avg_rating ?? 0),
  };
};

const buildSearchClauses = (filters: SearchFreelancersFilters) => {
  const clauses = ["u.role = 'Freelancer'", 'u.is_active = TRUE', "u.account_status = 'ACTIVE'", 'u.profile_complete = 1', 'u.is_private = 0'];
  const params: unknown[] = [];
  const parameter = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push(`(
      u.name ILIKE ${parameter(like)}
      OR u.title ILIKE ${parameter(like)}
      OR u.bio ILIKE ${parameter(like)}
      OR EXISTS (
        SELECT 1
        FROM user_skills qus
        JOIN skills qsk ON qsk.id = qus.skill_id
        WHERE qus.user_id = u.id AND qsk.name ILIKE ${parameter(like)}
      )
    )`);
  }

  if (filters.skillId) {
    clauses.push(`EXISTS (
      SELECT 1 FROM user_skills fus
      WHERE fus.user_id = u.id AND fus.skill_id = ${parameter(filters.skillId)}
    )`);
  }

  if (filters.location) {
    clauses.push(`u.location ILIKE ${parameter(`%${filters.location}%`)}`);
  }

  if (filters.governorate) {
    clauses.push(`u.location = ${parameter(filters.governorate)}`);
  }

  if (filters.verified === true) {
    clauses.push('u.is_verified = 1');
  }

  if (filters.minRating !== undefined) {
    clauses.push(`(
      SELECT COALESCE(AVG(r.rating), 0)
      FROM reviews r
      WHERE r.freelancer_id = u.id
    ) >= ${parameter(filters.minRating)}`);
  }

  if (filters.maxResponseHours !== undefined) {
    clauses.push(`u.avg_response_hours IS NOT NULL AND u.avg_response_hours <= ${parameter(filters.maxResponseHours)}`);
  }

  if (filters.budget !== undefined) {
    clauses.push(`u.min_budget IS NOT NULL AND u.min_budget <= ${parameter(filters.budget)}`);
  }

  if (filters.minBudget !== undefined) {
    clauses.push(`u.min_budget IS NOT NULL AND u.min_budget >= ${parameter(filters.minBudget)}`);
  }

  if (filters.maxBudget !== undefined) {
    clauses.push(`u.min_budget IS NOT NULL AND u.min_budget <= ${parameter(filters.maxBudget)}`);
  }

  if (filters.featured === true) {
    clauses.push(
      `(u.is_featured = TRUE AND (NULLIF(u.featured_until, '') IS NULL OR NULLIF(u.featured_until, '')::timestamptz > CURRENT_TIMESTAMP))`,
    );
  }

  if (filters.available === true) {
    clauses.push('u.is_available = 1');
  }

  return { clauses, params };
};

const sortClause = (sort: SearchFreelancersFilters['sort']): string => {
  switch (sort) {
    case 'newest':
      return `(u.is_featured = TRUE AND (NULLIF(u.featured_until, '') IS NULL OR NULLIF(u.featured_until, '')::timestamptz > CURRENT_TIMESTAMP)) DESC, u.created_at DESC`;
    case 'rating':
      return `(u.is_featured = TRUE AND (NULLIF(u.featured_until, '') IS NULL OR NULLIF(u.featured_until, '')::timestamptz > CURRENT_TIMESTAMP)) DESC, COALESCE(s.avg_rating, 0) DESC, COALESCE(s.review_count, 0) DESC, u.created_at DESC`;
    case 'budget_low':
      return `(u.is_featured = TRUE AND (NULLIF(u.featured_until, '') IS NULL OR NULLIF(u.featured_until, '')::timestamptz > CURRENT_TIMESTAMP)) DESC, CASE WHEN u.min_budget IS NULL THEN 1 ELSE 0 END ASC, u.min_budget ASC, u.created_at DESC`;
    case 'response':
      return `(u.is_featured = TRUE AND (NULLIF(u.featured_until, '') IS NULL OR NULLIF(u.featured_until, '')::timestamptz > CURRENT_TIMESTAMP)) DESC, CASE WHEN u.avg_response_hours IS NULL THEN 1 ELSE 0 END ASC, u.avg_response_hours ASC, u.created_at DESC`;
    default:
      return `(u.is_featured = TRUE AND (NULLIF(u.featured_until, '') IS NULL OR NULLIF(u.featured_until, '')::timestamptz > CURRENT_TIMESTAMP)) DESC, COALESCE(s.avg_rating, 0) DESC, u.created_at DESC`;
  }
};

export const searchFreelancers = async (
  filters: SearchFreelancersFilters,
): Promise<{ items: FreelancerCard[]; total: number }> => {
  const { clauses, params } = buildSearchClauses(filters);
  const whereSql = clauses.join(' AND ');

  const countResult = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`, params);

  const offset = (filters.page - 1) * filters.limit;

  const pageParams = [...params, filters.limit, offset];
  const rowsResult = await query<FreelancerCardRow>(
      `SELECT
         u.id,
         u.name,
         u.title,
         u.bio,
         u.location,
         u.min_budget,
         u.hourly_rate,
         u.avatar_url,
         u.is_available,
         u.is_featured,
         u.is_verified,
         u.featured_until,
         u.avg_response_hours,
         u.created_at,
         COALESCE(s.avg_rating, 0) AS avg_rating,
         COALESCE(s.review_count, 0) AS review_count,
         COALESCE((
           SELECT json_agg(json_build_object('id', sk.id, 'name', sk.name))
           FROM user_skills us
           JOIN skills sk ON sk.id = us.skill_id
           WHERE us.user_id = u.id
         ), '[]'::json) AS skills
       FROM users u
       LEFT JOIN freelancer_stats s ON s.freelancer_id = u.id
       WHERE ${whereSql}
       ORDER BY ${sortClause(filters.sort)}
       LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams,
  );

  return {
    items: rowsResult.rows.map(mapCard),
    total: Number(countResult.rows[0]?.total ?? 0),
  };
};

export const findPublicFreelancerById = async (
  id: string,
): Promise<PublicFreelancer | null> => {
  const result = await query<FreelancerProfileRow>(
      `SELECT id, name, title, bio, location,
              min_budget, hourly_rate, avatar_url,
              is_available, is_featured, is_verified, featured_until, points_balance,
              avg_response_hours, created_at
       FROM users
       WHERE id = $1 AND role = 'Freelancer' AND is_active = TRUE AND account_status = 'ACTIVE' AND profile_complete = 1
         AND is_private = 0
       LIMIT 1`,
      [id],
  );

  return result.rows[0] ? mapPublicFreelancer(result.rows[0]) : null;
};

export const findFreelancerForEvent = async (
  id: string,
): Promise<{ id: string; name: string } | null> => {
  const result = await query<{ id: string; name: string }>(`SELECT id, name FROM users
    WHERE id = $1 AND role = 'Freelancer' AND is_active = TRUE AND account_status = 'ACTIVE' AND profile_complete = 1 AND is_private = 0 LIMIT 1`, [id]);
  return result.rows[0] ?? null;
};

export const getPublicPortfolio = async (userId: string): Promise<PortfolioItem[]> => {
  return listPortfolioByUser(userId);
};

export const getPublicReviews = async (freelancerId: string): Promise<Review[]> => {
  const result = await query<ReviewRow>(
      `SELECT r.id, r.client_name, r.rating, r.comment, r.created_at,
              s.title AS service_title, r.freelancer_reply, r.replied_at
       FROM reviews r LEFT JOIN orders o ON o.id = r.order_id
       LEFT JOIN services s ON s.id = o.service_id
       WHERE r.freelancer_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [freelancerId],
  );

  return result.rows.map(mapReview);
};

export const getFreelancerStats = async (
  freelancerId: string,
): Promise<FreelancerStats> => {
  const [statsResult, latestFiveStars, latestFiveCount, fastDelivery] = await Promise.all([
    query<StatsRow>('SELECT view_count, review_count, avg_rating FROM freelancer_stats WHERE freelancer_id = $1', [freelancerId]),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM (
      SELECT rating FROM reviews WHERE freelancer_id = $1 ORDER BY created_at DESC LIMIT 5
    ) AS latest WHERE rating = 5`, [freelancerId]),
    query<{ count: string }>('SELECT COUNT(*) AS count FROM (SELECT id FROM reviews WHERE freelancer_id = $1 ORDER BY created_at DESC LIMIT 5) AS latest', [freelancerId]),
    query('SELECT 1 FROM orders o JOIN order_deliveries d ON d.order_id = o.id WHERE o.freelancer_id = $1 AND d.created_at <= o.due_at LIMIT 1', [freelancerId]),
  ]);
  return {
    ...mapStats(statsResult.rows[0]),
    sellerBadge: Number(latestFiveCount.rows[0]?.count ?? 0) === 5 && Number(latestFiveStars.rows[0]?.count ?? 0) === 5,
    fastDeliveryBadge: fastDelivery.rowCount !== null && fastDelivery.rowCount > 0,
  };
};

export const recordProfileEvent = async (freelancerId: string): Promise<number> => {
  await query('INSERT INTO profile_events (freelancer_id, event_type) VALUES ($1, $2) RETURNING id', [freelancerId, 'View']);
  const result = await query<{ count: string }>("SELECT COUNT(*) AS count FROM profile_events WHERE freelancer_id = $1 AND event_type = 'View'", [freelancerId]);
  return Number(result.rows[0]?.count ?? 0);
};

export const createReport = async (
  freelancerId: string,
  input: CreateReportInput,
): Promise<{ id: string; status: string; createdAt: string }> => {
  const id = randomUUID();

  const result = await query<ReportRow>(
    'INSERT INTO reports (id, freelancer_id, reason) VALUES ($1, $2, $3) RETURNING id, reason, status, created_at',
    [id, freelancerId, input.reason],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to create report');
  }

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
  };
};

export const getOwnProfile = async (userId: string) => {
  const user = await findFreelancerById(userId);
  const skills = await getSkillsForUser(userId);
  const stats = await getFreelancerStats(userId);

  return { user, skills, stats };
};

export const findFreelancerById = async (
  userId: string,
): Promise<PublicFreelancer | null> => {
  const result = await query<FreelancerProfileRow>(
       `SELECT id, name, title, bio, location,
              min_budget, hourly_rate, avatar_url,
              is_available, is_featured, is_verified, featured_until, points_balance,
              avg_response_hours, created_at
       FROM users
       WHERE id = $1 AND role = 'Freelancer'
       LIMIT 1`,
      [userId],
  );

  return result.rows[0] ? mapPublicFreelancer(result.rows[0]) : null;
};

const PROFILE_COLUMNS: Record<string, string> = {
  name: 'name',
  bio: 'bio',
  title: 'title',
  location: 'location',
  minBudget: 'min_budget',
  hourlyRate: 'hourly_rate',
  avatarUrl: 'avatar_url',
};

export const updateFreelancerProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<void> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query<{ name: string; title: string | null; location: string | null; profile_complete: number }>(
      "SELECT name, title, location, profile_complete FROM users WHERE id = $1 AND role = 'Freelancer' FOR UPDATE",
      [userId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new AppError('Freelancer account not found.', 404);
    const completesProfile = (input.name ?? current.name).trim().length >= 2
      && (input.title ?? current.title ?? '').trim().length >= 2
      && (input.location ?? current.location ?? '').trim().length >= 2;
    const assignments: string[] = [];
    const values: unknown[] = [];

    for (const [field, column] of Object.entries(PROFILE_COLUMNS)) {
      const value = input[field as keyof UpdateProfileInput];
      if (value !== undefined && !Array.isArray(value) && typeof value !== 'boolean') {
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (input.isAvailable !== undefined) {
      values.push(input.isAvailable ? 1 : 0);
      assignments.push(`is_available = $${values.length}`);
    }

    if (assignments.length) {
      values.push(userId);
      await client.query(`UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length}`, values);
    }

    if (!current.profile_complete && completesProfile) {
      await client.query("UPDATE users SET profile_complete = 1 WHERE id = $1 AND role = 'Freelancer'", [userId]);
      await awardProfileCompletion(client, userId, `profile-complete:${userId}`);
    }

    if (input.skillIds !== undefined) {
      if (input.skillIds.length) {
        const result = await client.query<{ id: string }>('SELECT id FROM skills WHERE id = ANY($1::text[])', [input.skillIds]);
        if (result.rows.length !== input.skillIds.length) {
          throw new AppError('??? ???????? ??????? ??? ??????', 400);
        }
      }

      await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
      if (input.skillIds.length) {
        await client.query(
          'INSERT INTO user_skills (user_id, skill_id) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING',
          [userId, input.skillIds],
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
