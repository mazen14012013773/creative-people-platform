import { Router } from 'express';
import { comment, comments, detail, like, list } from '../controllers/articles.controller';
import { asyncHandler } from '../utils/async-handler';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { uploadCommentAttachment } from '../middlewares/upload.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { communityCommentSchema } from '../validators/community-post.validator';
import { z } from 'zod';

export const articlesRouter = Router();
articlesRouter.get('/', asyncHandler(list));
articlesRouter.get('/:slug/comments', asyncHandler(comments));
articlesRouter.post('/:slug/comments', authenticate, publicActionLimiter, uploadCommentAttachment.single('file'), validate({ params: z.object({ slug: z.string().min(1).max(180) }), body: communityCommentSchema }), asyncHandler(comment));
articlesRouter.post('/:slug/like', authenticate, publicActionLimiter, validate({ params: z.object({ slug: z.string().min(1).max(180) }) }), asyncHandler(like));
articlesRouter.get('/:slug', optionalAuthenticate, asyncHandler(detail));
