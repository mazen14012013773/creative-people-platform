import { deleteCommunityPost, findCommunityPost, listCommunityPosts, mapAuthorRole, updateCommunityPost, createCommunityPost, incrementCommunityPostViews } from '../models/community-post.model';
import type { CommunityPostStatus } from '../models/community-post.model';
import type { UserRole } from '../types/auth';
import { AppError } from '../utils/app-error';
import { moderateText } from '../utils/moderation';
import { sanitizePlainText } from '../utils/sanitize';
import { deleteLocalImage } from './upload.service';
import { emitRealtimeEventToAll } from './realtime.service';
import { hasPostLike } from '../models/post-interaction.model';
import { addPostComment, getPostComments, toggleLike } from './post-interactions.service';
import type { CommunityPostInput, CommunityPostUpdateInput } from '../validators/community-post.validator';
import { env } from '../config/env';

const isOwnedCommunityImage = (url: string, userId: string): boolean => {
  try { return new URL(url).pathname.includes(`/storage/v1/object/public/${env.SUPABASE_PUBLIC_STORAGE_BUCKET}/community/${userId}/`); }
  catch { return false; }
};

const clean = (text: string, field: string): string => {
  const moderation = moderateText(text);
  if (moderation.blocked || moderation.hits.some((hit) => hit.severity === 'medium')) {
    throw new AppError(`يرجى إزالة روابط التواصل أو المعلومات الشخصية من ${field} حفاظاً على سلامة المجتمع.`, 400);
  }
  return sanitizePlainText(text);
};

export const getCommunityFeed = (query?: string, category?: string) => listCommunityPosts({ query: query?.trim().slice(0, 100), category });
export const getMyCommunityPosts = (authorId: string) => listCommunityPosts({ authorId, includeDrafts: true });
export const getCommunityPostsForAdmin = () => listCommunityPosts({ includeDrafts: true });
export const getCommunityPost = async (id: string, viewerId?: string) => {
  const post = await findCommunityPost(id);
  if (!post || (post.status !== 'PUBLISHED' && post.authorId !== viewerId)) throw new AppError('المنشور غير موجود', 404);
  await incrementCommunityPostViews(id);
  return { ...post, viewsCount: post.viewsCount + (post.status === 'PUBLISHED' ? 1 : 0), likedByMe: viewerId ? await hasPostLike({ kind: 'post', id }, viewerId) : false };
};
export const getCommunityPostForAdmin = async (id: string) => {
  const post = await findCommunityPost(id);
  if (!post) throw new AppError('المنشور غير موجود', 404);
  return post;
};

export const getCommunityComments = (postId: string) => {
  return getPostComments({ kind: 'post', id: postId });
};

export const addCommunityComment = (postId: string, author: { id: string; name: string }, content: string, file?: Express.Multer.File) => {
  const safeContent = content.trim() ? clean(content, 'التعليق') : '';
  return addPostComment({ kind: 'post', id: postId }, author, safeContent, file);
};

export const togglePostLike = (postId: string, user: { id: string; name: string }) => {
  return toggleLike({ kind: 'post', id: postId }, user);
};

export const addCommunityPost = async (author: { id: string; role: UserRole }, input: CommunityPostInput) => {
  if (input.coverImage && !isOwnedCommunityImage(input.coverImage, author.id)) {
    throw new AppError('يجب اختيار صورة الغلاف من خلال أداة رفع الصور.', 400);
  }
  const post = await createCommunityPost({
    title: clean(input.title, 'العنوان'), content: clean(input.content, 'المحتوى'),
    coverImage: input.coverImage ?? undefined, authorId: author.id,
    authorRole: mapAuthorRole(author.role), category: input.category, status: input.status as CommunityPostStatus,
  });
  emitRealtimeEventToAll('community');
  return post;
};

export const editCommunityPost = async (id: string, authorId: string, input: CommunityPostUpdateInput, canManageAny = false) => {
  const current = await findCommunityPost(id);
  if (!current || (!canManageAny && current.authorId !== authorId)) throw new AppError('المنشور غير موجود أو لا تملك صلاحية تعديله', 404);
  if (input.coverImage && !isOwnedCommunityImage(input.coverImage, current.authorId)) {
    throw new AppError('يجب اختيار صورة الغلاف من خلال أداة رفع الصور.', 400);
  }
  const updated = await updateCommunityPost(id, authorId, {
    ...input,
    title: input.title === undefined ? undefined : clean(input.title, 'العنوان'),
    content: input.content === undefined ? undefined : clean(input.content, 'المحتوى'),
  }, canManageAny);
  emitRealtimeEventToAll('community');
  return updated;
};

export const removeCommunityPost = async (id: string, authorId?: string) => {
  const image = await deleteCommunityPost(id, authorId);
  if (image === undefined) throw new AppError('المنشور غير موجود أو لا تملك صلاحية حذفه', 404);
  if (image) await deleteLocalImage(image);
  emitRealtimeEventToAll('community');
};
import type { Express } from 'express';
