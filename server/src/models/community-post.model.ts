import { randomUUID } from 'node:crypto';
import { query } from '../config/db';
import type { UserRole } from '../types/auth';

export type CommunityAuthorRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';
export type CommunityPostStatus = 'PUBLISHED' | 'DRAFT';

export interface CommunityPost {
  id: string; title: string; content: string; coverImage: string | null;
  authorId: string; authorName: string; authorAvatar: string | null;
  authorRole: CommunityAuthorRole; category: string; status: CommunityPostStatus;
  createdAt: string; viewsCount: number; likesCount: number;
}

interface PostRow {
  id: string; title: string; content: string; cover_image: string | null;
  author_id: string; author_name: string; author_avatar: string | null;
  author_role: CommunityAuthorRole; category: string; status: CommunityPostStatus;
  created_at: string; views_count: number; likes_count: number;
}

const columns = `p.id, p.title, p.content, p.cover_image, p.author_id, u.name AS author_name,
  u.avatar_url AS author_avatar, p.author_role, p.category, p.status, p.created_at,
  p.views_count, p.likes_count`;
const mapPost = (row: PostRow): CommunityPost => ({
  id: row.id, title: row.title, content: row.content, coverImage: row.cover_image,
  authorId: row.author_id, authorName: row.author_name, authorAvatar: row.author_avatar,
  authorRole: row.author_role, category: row.category, status: row.status,
  createdAt: row.created_at, viewsCount: row.views_count, likesCount: row.likes_count,
});

export const mapAuthorRole = (role: UserRole): CommunityAuthorRole =>
  role === 'Freelancer' ? 'FREELANCER' : role === 'Admin' ? 'ADMIN' : 'CLIENT';

export const listCommunityPosts = async (options: { query?: string; category?: string; authorId?: string; includeDrafts?: boolean }): Promise<CommunityPost[]> => {
  const where: string[] = [];
  const args: string[] = [];
  if (!options.includeDrafts) where.push("p.status = 'PUBLISHED'");
  if (options.category) { args.push(options.category); where.push(`p.category = $${args.length}`); }
  if (options.authorId) { args.push(options.authorId); where.push(`p.author_id = $${args.length}`); }
  if (options.query) { args.push(`%${options.query}%`, `%${options.query}%`); where.push(`(p.title ILIKE $${args.length-1} OR p.content ILIKE $${args.length})`); }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = (await query(`SELECT ${columns} FROM community_posts p JOIN users u ON u.id = p.author_id ${sqlWhere} ORDER BY p.created_at DESC LIMIT 100`, args)).rows as PostRow[];
  return rows.map(mapPost);
};

export const findCommunityPost = async (id: string): Promise<CommunityPost | null> => {
  const row = (await query(`SELECT ${columns} FROM community_posts p JOIN users u ON u.id = p.author_id WHERE p.id = $1`, [id])).rows[0] as PostRow | undefined;
  return row ? mapPost(row) : null;
};

export const createCommunityPost = async (input: {
  title: string; content: string; coverImage?: string; authorId: string;
  authorRole: CommunityAuthorRole; category: string; status: CommunityPostStatus;
}): Promise<CommunityPost> => {
  const id = randomUUID();
  await query(`INSERT INTO community_posts (id, title, content, cover_image, author_id, author_role, category, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [id, input.title, input.content, input.coverImage ?? null, input.authorId, input.authorRole, input.category, input.status]);
  const created = await findCommunityPost(id);
  if (!created) throw new Error('Failed to create community post');
  return created;
};

export const updateCommunityPost = async (id: string, authorId: string, input: {
  title?: string; content?: string; coverImage?: string | null; category?: string; status?: CommunityPostStatus;
}, allowAnyAuthor = false): Promise<CommunityPost | null> => {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  for (const [key, column] of [['title', 'title'], ['content', 'content'], ['coverImage', 'cover_image'], ['category', 'category'], ['status', 'status']] as const) {
    if (input[key] !== undefined) { values.push(input[key]!); fields.push(`${column} = $${values.length}`); }
  }
  if (!fields.length) return findCommunityPost(id);
  values.push(id); let where = `id = $${values.length}`;
  if (!allowAnyAuthor) { values.push(authorId); where += ` AND author_id = $${values.length}`; }
  const result = await query(`UPDATE community_posts SET ${fields.join(', ')} WHERE ${where} RETURNING id`, values);
  return result.rowCount ? findCommunityPost(id) : null;
};

export const deleteCommunityPost = async (id: string, authorId?: string): Promise<string | null | undefined> => {
  const existing = (await query('SELECT cover_image FROM community_posts WHERE id = $1', [id])).rows[0] as { cover_image: string | null } | undefined;
  if (!existing) return undefined;
  if (authorId) {
    const result = await query('DELETE FROM community_posts WHERE id = $1 AND author_id = $2 RETURNING id', [id, authorId]);
    if (!result.rowCount) return undefined;
  } else await query('DELETE FROM community_posts WHERE id = $1 RETURNING id', [id]);
  return existing.cover_image;
};

export const incrementCommunityPostViews = async (id: string): Promise<void> => {
  await query("UPDATE community_posts SET views_count = views_count + 1 WHERE id = $1 AND status = 'PUBLISHED'", [id]);
};

