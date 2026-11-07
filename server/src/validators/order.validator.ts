import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';
import { isValidDeliveryLink } from '../utils/delivery-link';

export const orderIdParamsSchema = z.object({ id: z.string().uuid() });
export const orderDownloadParamsSchema = z.object({ id: z.string().uuid(), deliveryId: z.string().uuid() });
export const createOrderSchema = z.object({ serviceId: z.string().uuid() });
export const deliveryBodySchema = z.object({
  notes: z.string().trim().max(2000).transform(sanitizePlainText).optional(),
  link: z.string().trim().max(2048).url().refine(isValidDeliveryLink, 'Delivery URLs must be safe HTTP(S) links; video links are limited to YouTube and Google Drive.').optional(),
});
export const revisionBodySchema = z.object({
  notes: z.string().trim().min(3).max(2000).transform(sanitizePlainText),
});
export const reviewBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).transform(sanitizePlainText).optional(),
});
export const orderMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(4000).transform(sanitizePlainText).refine((value) => value.trim().length > 0),
});
export const orderReviewReplySchema = z.object({
  reply: z.string().trim().min(2).max(2000).transform(sanitizePlainText),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type DeliveryBody = z.infer<typeof deliveryBodySchema>;
export type RevisionBody = z.infer<typeof revisionBodySchema>;
export type ReviewBody = z.infer<typeof reviewBodySchema>;
export type OrderMessageBody = z.infer<typeof orderMessageBodySchema>;
export type OrderReviewReply = z.infer<typeof orderReviewReplySchema>;
