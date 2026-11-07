import { randomUUID } from 'node:crypto';
import { query } from '../config/db';
import type { Service, ServiceDraft, ServiceMedia, ServiceSource, ServiceStatus } from '../types/service';

interface ServiceRow {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_avatar_url: string | null;
  title: string;
  description: string;
  category: string;
  price: number;
  avg_rating: number;
  review_count: number;
  media_json: string;
  sources_json: string;
  status: ServiceStatus;
  is_featured: number;
  featured_until: string | null;
  created_at: string;
}

const SELECT_SERVICES = `
  SELECT s.id, s.freelancer_id, u.name AS freelancer_name,
         u.avatar_url AS freelancer_avatar_url, s.title, s.description,
         s.category, s.price, s.media_json, s.sources_json, s.status, s.is_featured, s.featured_until, s.created_at,
         COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN orders o ON o.id = r.order_id WHERE o.service_id = s.id), 0) AS avg_rating,
         (SELECT COUNT(*) FROM reviews r JOIN orders o ON o.id = r.order_id WHERE o.service_id = s.id) AS review_count
  FROM services s
  JOIN users u ON u.id = s.freelancer_id
`;

const mapService = (row: ServiceRow): Service => ({
  id: row.id,
  freelancerId: row.freelancer_id,
  freelancerName: row.freelancer_name,
  freelancerAvatarUrl: row.freelancer_avatar_url,
  title: row.title,
  description: row.description,
  category: row.category,
  price: Number(row.price ?? 0),
  avgRating: Number(row.avg_rating ?? 0),
  reviewCount: Number(row.review_count ?? 0),
  media: JSON.parse(row.media_json || '[]') as ServiceMedia[],
  sources: JSON.parse(row.sources_json || '[]') as ServiceSource[],
  status: row.status,
  isFeatured: Boolean(row.is_featured) && (!row.featured_until || row.featured_until > new Date().toISOString()),
  featuredUntil: row.featured_until,
  createdAt: row.created_at,
});

export const listActiveServices = async (freelancerId?: string): Promise<Service[]> => {
  const sql = freelancerId
    ? `${SELECT_SERVICES} WHERE s.status = 'active' AND s.freelancer_id = $1 AND u.is_active = TRUE AND u.account_status = 'ACTIVE'
       ORDER BY (s.is_featured = 1 AND NULLIF(s.featured_until, '')::timestamptz > CURRENT_TIMESTAMP) DESC, s.created_at DESC`
    : `${SELECT_SERVICES} WHERE s.status = 'active' AND u.is_active = TRUE AND u.account_status = 'ACTIVE'
       ORDER BY (s.is_featured = 1 AND NULLIF(s.featured_until, '')::timestamptz > CURRENT_TIMESTAMP) DESC, s.created_at DESC`;
  const result = await query<ServiceRow>(sql, freelancerId ? [freelancerId] : []);
  return result.rows.map(mapService);
};

export const listServicesByFreelancer = async (freelancerId: string): Promise<Service[]> => {
  const result = await query<ServiceRow>(`${SELECT_SERVICES} WHERE s.freelancer_id = $1 ORDER BY s.created_at DESC`, [freelancerId]);
  return result.rows.map(mapService);
};

export const findServiceById = async (id: string): Promise<Service | null> => {
  const result = await query<ServiceRow>(`${SELECT_SERVICES} WHERE s.id = $1 LIMIT 1`, [id]);
  return result.rows[0] ? mapService(result.rows[0]) : null;
};

export const createService = async (freelancerId: string, draft: ServiceDraft): Promise<Service> => {
  const id = randomUUID();
  await query(
    `INSERT INTO services
       (id, freelancer_id, title, description, price, category, media_json, sources_json, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [id, freelancerId, draft.title, draft.description, draft.price ?? 0, draft.category,
      JSON.stringify(draft.media ?? []), JSON.stringify(draft.sources ?? []), draft.status ?? 'active'],
  );
  const service = await findServiceById(id);
  if (!service) throw new Error('Failed to create service');
  return service;
};

export const updateService = async (
  id: string,
  freelancerId: string,
  patch: Partial<ServiceDraft>,
): Promise<Service | null> => {
  const columns: Record<keyof ServiceDraft, string> = {
    title: 'title', description: 'description', category: 'category', price: 'price',
    media: 'media_json', sources: 'sources_json', status: 'status',
  };
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const [field, column] of Object.entries(columns) as Array<[keyof ServiceDraft, string]>) {
    const value = patch[field];
    if (value !== undefined) {
      values.push(field === 'media' || field === 'sources' ? JSON.stringify(value) : value);
      assignments.push(`${column} = $${values.length}`);
    }
  }
  if (assignments.length) {
    values.push(id, freelancerId);
    await query(
      `UPDATE services SET ${assignments.join(', ')} WHERE id = $${values.length - 1} AND freelancer_id = $${values.length}`,
      values,
    );
  }
  return findServiceById(id);
};

export const deleteService = async (id: string, freelancerId: string): Promise<boolean> => {
  const result = await query('DELETE FROM services WHERE id = $1 AND freelancer_id = $2', [id, freelancerId]);
  return (result.rowCount ?? 0) > 0;
};

export const serviceHasOrders = async (id: string): Promise<boolean> => {
  const result = await query('SELECT 1 FROM orders WHERE service_id = $1 LIMIT 1', [id]);
  return result.rowCount !== null && result.rowCount > 0;
};
