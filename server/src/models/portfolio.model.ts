import { randomUUID } from 'node:crypto';
import { query } from '../config/db';
import type { PortfolioItem } from '../types/freelancer';
import type { CreatePortfolioInput } from '../validators/portfolio.validator';

interface PortfolioRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  created_at: string;
}

const mapPortfolioItem = (row: PortfolioRow): PortfolioItem => ({
  id: row.id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  projectUrl: row.project_url,
  createdAt: row.created_at,
});

export const listPortfolioByUser = async (userId: string): Promise<PortfolioItem[]> => {
  const result = await query<PortfolioRow>(
    `SELECT id, title, description, image_url, project_url, created_at
     FROM portfolio_items WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows.map(mapPortfolioItem);
};

export const countPortfolioItems = async (userId: string): Promise<number> => {
  const result = await query<{ total: string }>('SELECT COUNT(*) AS total FROM portfolio_items WHERE user_id = $1', [userId]);
  return Number(result.rows[0]?.total ?? 0);
};

export const createPortfolioItem = async (
  userId: string,
  input: CreatePortfolioInput,
): Promise<PortfolioItem> => {
  const id = randomUUID();
  const inserted = await query<{ id: string }>(
    `INSERT INTO portfolio_items (id, user_id, title, description, image_url, project_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [id, userId, input.title, input.description ?? null, input.imageUrl ?? null, input.projectUrl ?? null],
  );
  const returnedId = inserted.rows[0]?.id;
  if (!returnedId) throw new Error('Failed to create portfolio item');
  const result = await query<PortfolioRow>(
    `SELECT id, title, description, image_url, project_url, created_at
     FROM portfolio_items WHERE id = $1`,
    [returnedId],
  );
  if (!result.rows[0]) throw new Error('Failed to load created portfolio item');
  return mapPortfolioItem(result.rows[0]);
};

export const deletePortfolioItem = async (
  itemId: string,
  userId: string,
): Promise<string | null | undefined> => {
  const result = await query<{ image_url: string | null }>(
    'DELETE FROM portfolio_items WHERE id = $1 AND user_id = $2 RETURNING image_url',
    [itemId, userId],
  );
  return result.rows[0]?.image_url;
};
