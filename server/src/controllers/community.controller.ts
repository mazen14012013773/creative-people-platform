import type { Request, Response } from 'express';
import { addCommunityComment, addCommunityPost, editCommunityPost, getCommunityComments, getCommunityFeed, getCommunityPost, getCommunityPostForAdmin, getCommunityPostsForAdmin, getMyCommunityPosts, removeCommunityPost, togglePostLike } from '../services/community.service';
import { uploadImage } from '../services/upload.service';
import { AppError } from '../utils/app-error';
import { removeComment } from '../services/post-interactions.service';
import type { CommunityPostInput, CommunityPostUpdateInput } from '../validators/community-post.validator';

export const feed = async (req: Request, res: Response): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.status(200).json({ success: true, data: { items: await getCommunityFeed(q, category) } });
};
export const mine = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await getMyCommunityPosts(req.user!.id) } });
};
export const show = async (req: Request, res: Response): Promise<void> => {
  const post = req.user?.role === 'Admin' ? await getCommunityPostForAdmin(String(req.params.id)) : await getCommunityPost(String(req.params.id), req.user?.id);
  res.status(200).json({ success: true, data: { post } });
};
export const manage = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await getCommunityPostsForAdmin() } });
};
export const comments = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await getCommunityComments(String(req.params.id)) } });
};
export const comment = async (req: Request, res: Response): Promise<void> => {
  const result = await addCommunityComment(String(req.params.id), { id: req.user!.id, name: req.user!.name }, String(req.body.content ?? ''), req.file);
  res.status(201).json({ success: true, data: { comment: result } });
};
export const like = async (req: Request, res: Response): Promise<void> => {
  const result = await togglePostLike(String(req.params.id), { id: req.user!.id, name: req.user!.name });
  res.status(200).json({ success: true, data: result });
};
export const removeCommentHandler = async (req: Request, res: Response): Promise<void> => {
  await removeComment(String(req.params.id), req.user!.id, req.user!.role === 'Admin');
  res.status(200).json({ success: true, data: { deleted: true } });
};
export const create = async (req: Request, res: Response): Promise<void> => {
  const post = await addCommunityPost({ id: req.user!.id, role: req.user!.role }, req.body as CommunityPostInput);
  res.status(201).json({ success: true, data: { post } });
};
export const update = async (req: Request, res: Response): Promise<void> => {
  const post = await editCommunityPost(String(req.params.id), req.user!.id, req.body as CommunityPostUpdateInput, req.user!.role === 'Admin');
  res.status(200).json({ success: true, data: { post } });
};
export const remove = async (req: Request, res: Response): Promise<void> => {
  await removeCommunityPost(String(req.params.id), req.user!.role === 'Admin' ? undefined : req.user!.id);
  res.status(200).json({ success: true, message: 'تم حذف المنشور' });
};
export const upload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError('اختر صورة غلاف أولاً', 400);
  const url = await uploadImage(req.user!.id, req.file, 'community');
  res.status(201).json({ success: true, data: { url } });
};
