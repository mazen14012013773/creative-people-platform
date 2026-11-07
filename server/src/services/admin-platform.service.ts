import {
  deleteArticleById,
  findArticleById,
  listArticlesForAdmin,
  updateArticleById,
} from '../models/articles.model';
import { recordAdminAudit } from '../models/admin.model';
import { getAdminPointsOverview } from '../models/rewards.model';
import {
  countSkillUsage,
  deleteSkillById,
  findSkillById,
  findSkillByName,
  insertSkill,
  listSkillsForAdmin,
  updateSkillName,
} from '../models/skill.model';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import type {
  AdminContentArticleUpdateInput,
  AdminContentArticlesQueryInput,
} from '../validators/admin.validator';

export const getAdminArticles = async (input: AdminContentArticlesQueryInput) => {
  const result = await listArticlesForAdmin({
    query: input.q?.trim() || undefined,
    status: input.status,
    page: input.page,
    limit: input.limit,
  });

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const updateArticleByAdmin = async (
  adminId: string,
  articleId: string,
  input: AdminContentArticleUpdateInput,
) => {
  const existing = await findArticleById(articleId);
  if (!existing) throw new AppError('المقال غير موجود', 404);

  const { reason, ...patch } = input;
  const article = await updateArticleById(articleId, patch);
  if (!article) throw new AppError('تعذر تحديث المقال', 500);

  recordAdminAudit(
    adminId,
    patch.status && Object.keys(patch).length === 1 ? 'article_status_change' : 'article_update',
    'article',
    articleId,
    reason,
    { patch: Object.keys(patch), status: article.status, title: article.title },
  );

  return article;
};

export const deleteArticleByAdmin = async (adminId: string, articleId: string, reason: string) => {
  const existing = await findArticleById(articleId);
  if (!existing) throw new AppError('المقال غير موجود', 404);

  const deleted = await deleteArticleById(articleId);
  if (!deleted) throw new AppError('تعذر حذف المقال', 500);

  recordAdminAudit(adminId, 'article_delete', 'article', articleId, reason, {
    title: existing.title,
    slug: existing.slug,
  });
};

export const getAdminSkills = async () => listSkillsForAdmin();

export const createSkillByAdmin = async (adminId: string, name: string, reason: string) => {
  const trimmed = name.trim();
  if (await findSkillByName(trimmed)) throw new AppError('توجد مهارة بهذا الاسم بالفعل', 409);

  const skill = await insertSkill(trimmed);
  recordAdminAudit(adminId, 'skill_create', 'skill', skill.id, reason, { name: skill.name });

  return skill;
};

export const updateSkillByAdmin = async (adminId: string, skillId: string, name: string, reason: string) => {
  const existing = await findSkillById(skillId);
  if (!existing) throw new AppError('المهارة غير موجودة', 404);

  const trimmed = name.trim();
  const duplicate = await findSkillByName(trimmed);
  if (duplicate && duplicate.id !== skillId) throw new AppError('توجد مهارة بهذا الاسم بالفعل', 409);

  const updated = await updateSkillName(skillId, trimmed);
  if (!updated) throw new AppError('تعذر تحديث المهارة', 500);

  recordAdminAudit(adminId, 'skill_update', 'skill', skillId, reason, {
    previousName: existing.name,
    nextName: trimmed,
  });

  return (await findSkillById(skillId))!;
};

export const deleteSkillByAdmin = async (adminId: string, skillId: string, reason: string) => {
  const existing = await findSkillById(skillId);
  if (!existing) throw new AppError('المهارة غير موجودة', 404);

  const usage = await countSkillUsage(skillId);
  if (usage > 0) {
    throw new AppError(`لا يمكن حذف المهارة لأن ${usage} مستقل يستخدمها، عدّل الاسم بدلاً من الحذف`, 409);
  }

  const deleted = await deleteSkillById(skillId);
  if (!deleted) throw new AppError('تعذر حذف المهارة', 500);

  recordAdminAudit(adminId, 'skill_delete', 'skill', skillId, reason, { name: existing.name });
};

export const getAdminPoints = () => getAdminPointsOverview();
