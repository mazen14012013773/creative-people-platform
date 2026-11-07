import { z } from 'zod';

export const communityCommentSchema = z.object({
  content: z.string().trim().max(2000).default(''),
});

export const communityPostIdSchema = z.object({ id: z.string().uuid() });
export const communityPostSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(20).max(12000),
  coverImage: z.string().trim().max(500).optional().nullable(),
  category: z.enum(['تجربتي', 'درس برمجة', 'مشروعي', 'نصائح', 'أخرى']),
  status: z.enum(['PUBLISHED', 'DRAFT']).default('PUBLISHED'),
});
export const communityPostUpdateSchema = communityPostSchema.partial();
export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type CommunityPostUpdateInput = z.infer<typeof communityPostUpdateSchema>;
