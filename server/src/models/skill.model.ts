import { randomUUID } from 'node:crypto';
import { query } from '../config/db';
import type { Skill } from '../types/freelancer';

interface SkillRow { id: string; name: string; }
export interface AdminSkill extends Skill { usageCount: number; }

export const listSkills = async (): Promise<Skill[]> => {
  const result = await query<SkillRow>('SELECT id, name FROM skills ORDER BY lower(name) ASC');
  return result.rows;
};

export const listSkillsForAdmin = async (): Promise<AdminSkill[]> => {
  const result = await query<AdminSkill>(
    `SELECT sk.id, sk.name,
        (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = sk.id)::int AS "usageCount"
     FROM skills sk ORDER BY "usageCount" DESC, lower(sk.name) ASC`,
  );
  return result.rows;
};

export const findSkillById = async (id: string): Promise<Skill | null> => {
  const result = await query<SkillRow>('SELECT id, name FROM skills WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const findSkillByName = async (name: string): Promise<Skill | null> => {
  const result = await query<SkillRow>('SELECT id, name FROM skills WHERE lower(name) = lower($1)', [name]);
  return result.rows[0] ?? null;
};

export const insertSkill = async (name: string): Promise<Skill> => {
  const result = await query<SkillRow>(
    'INSERT INTO skills (id, name) VALUES ($1, $2) RETURNING id, name',
    [randomUUID(), name],
  );
  if (!result.rows[0]) throw new Error('Failed to create skill');
  return result.rows[0];
};

export const updateSkillName = async (id: string, name: string): Promise<boolean> => {
  const result = await query('UPDATE skills SET name = $1 WHERE id = $2', [name, id]);
  return (result.rowCount ?? 0) > 0;
};

export const countSkillUsage = async (id: string): Promise<number> => {
  const result = await query<{ total: string }>('SELECT COUNT(*) AS total FROM user_skills WHERE skill_id = $1', [id]);
  return Number(result.rows[0]?.total ?? 0);
};

export const deleteSkillById = async (id: string): Promise<boolean> => {
  const result = await query('DELETE FROM skills WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const getSkillsForUser = async (userId: string): Promise<Skill[]> => {
  const result = await query<SkillRow>(
    `SELECT sk.id, sk.name FROM user_skills us
     JOIN skills sk ON sk.id = us.skill_id
     WHERE us.user_id = $1 ORDER BY lower(sk.name) ASC`,
    [userId],
  );
  return result.rows;
};
