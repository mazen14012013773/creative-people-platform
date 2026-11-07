import type { Express } from 'express';
import { findArticleBySlug, findArticleSlugById } from '../models/articles.model';
import { findCommunityPost } from '../models/community-post.model';
import {
  findPostOwner, getInteractionCounts, hasPostLike, insertPostComment,
  interactionTargetExists, listPostComments, removePostComment, togglePostLike,
  type CommentAttachmentType, type InteractionTarget,
} from '../models/post-interaction.model';
import { createUserNotification } from '../models/notification.model';
import { emitRealtimeEventToAll } from './realtime.service';
import { deleteLocalImage, saveCommunityCommentAttachment } from './upload.service';
import { AppError } from '../utils/app-error';
import { moderateText } from '../utils/moderation';
import { sanitizePlainText } from '../utils/sanitize';

const resolveArticle = async (slug: string) => {
  const article = await findArticleBySlug(slug);
  if (!article) throw new AppError('المقال غير موجود', 404);
  return article;
};

const assertTarget = async (target: InteractionTarget): Promise<void> => {
  if (!await interactionTargetExists(target)) throw new AppError('المحتوى غير موجود أو غير منشور', 404);
};

export const getPostComments = async (target: InteractionTarget) => {
  await assertTarget(target);
  return listPostComments(target);
};

export const getArticleComments = async (slug: string) => getPostComments({ kind: 'article', id: (await resolveArticle(slug)).id });

export const addPostComment = async (
  target: InteractionTarget,
  author: { id: string; name: string },
  content: string,
  file?: Express.Multer.File,
) => {
  await assertTarget(target);
  const trimmed = content.trim();
  if (!trimmed && !file) throw new AppError('اكتب تعليقًا أو أرفق ملفًا.', 400);
  if (trimmed) {
    const moderation = moderateText(trimmed);
    if (moderation.blocked || moderation.hits.some((hit) => hit.severity === 'medium')) {
      throw new AppError('يرجى إزالة معلومات التواصل أو البيانات الشخصية من التعليق.', 400);
    }
  }
  let attachment: { url: string; type: CommentAttachmentType } | undefined;
  if (file) attachment = await saveCommunityCommentAttachment(author.id, file);
  let comment;
  try {
    comment = await insertPostComment(target, author.id, sanitizePlainText(trimmed), attachment);
  } catch (error) {
    if (attachment) await deleteLocalImage(attachment.url);
    throw error;
  }
  const ownerId = await findPostOwner(target);
  if (ownerId && ownerId !== author.id) {
    const slug = target.kind === 'article' ? await findArticleSlugById(target.id) : null;
    const link = target.kind === 'post' ? `/community/posts/${target.id}` : `/blog/${encodeURIComponent(slug ?? '')}`;
    await createUserNotification(ownerId, 'NEW_POST_COMMENT', 'تعليق جديد على محتواك',
      `${author.name}: ${trimmed.slice(0, 140) || 'أرفق ملفًا في تعليق.'}`, link);
  }
  emitRealtimeEventToAll('community');
  return comment;
};

export const addArticleComment = async (slug: string, author: { id: string; name: string }, content: string, file?: Express.Multer.File) =>
  addPostComment({ kind: 'article', id: (await resolveArticle(slug)).id }, author, content, file);

export const removeComment = async (commentId: string, userId: string, isAdmin: boolean): Promise<void> => {
  const attachmentUrl = await removePostComment(commentId, userId, isAdmin);
  if (attachmentUrl === undefined) throw new AppError('التعليق غير موجود أو لا تملك صلاحية حذفه.', 404);
  if (attachmentUrl) await deleteLocalImage(attachmentUrl);
  emitRealtimeEventToAll('community');
};

export const toggleLike = async (target: InteractionTarget, user: { id: string; name: string }) => {
  await assertTarget(target);
  const postWasLiked = await hasPostLike(target, user.id);
  const result = await togglePostLike(target, user.id);
  if (!postWasLiked) {
    const ownerId = await findPostOwner(target);
    if (ownerId && ownerId !== user.id) {
      const slug = target.kind === 'article' ? await findArticleSlugById(target.id) : null;
      const link = target.kind === 'post' ? `/community/posts/${target.id}` : `/blog/${encodeURIComponent(slug ?? '')}`;
      await createUserNotification(ownerId, 'NEW_POST_LIKE', 'إعجاب جديد على محتواك', `أعجب ${user.name} بمنشورك.`, link);
    }
  }
  emitRealtimeEventToAll('community');
  return result;
};

export const toggleArticleLike = async (slug: string, user: { id: string; name: string }) =>
  toggleLike({ kind: 'article', id: (await resolveArticle(slug)).id }, user);

export const getInteractionState = async (target: InteractionTarget, userId?: string) => ({
  ...await getInteractionCounts(target),
  likedByMe: userId ? await hasPostLike(target, userId) : false,
});

export const getArticleInteractionState = async (slug: string, userId?: string) =>
  getInteractionState({ kind: 'article', id: (await resolveArticle(slug)).id }, userId);
