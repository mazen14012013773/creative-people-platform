import { Router } from 'express';
import { accept, cancel, create, deliver, download, downloadAll, previewDelivery, list, listMessages, sendMessage, review, reply, revise, show, start } from '../controllers/orders.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { uploadOrderDeliveries } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createOrderSchema, deliveryBodySchema, orderDownloadParamsSchema, orderIdParamsSchema,
  reviewBodySchema, revisionBodySchema, orderMessageBodySchema, orderReviewReplySchema,
} from '../validators/order.validator';

export const ordersRouter = Router();

ordersRouter.use(authenticate);
ordersRouter.get('/', authorize('Buyer', 'Freelancer'), asyncHandler(list));
ordersRouter.post('/', authorize('Buyer'), publicActionLimiter, validate({ body: createOrderSchema }), asyncHandler(create));
ordersRouter.get('/:id/vault/preview/:deliveryId', authorize('Buyer', 'Freelancer'), validate({ params: orderDownloadParamsSchema }), asyncHandler(previewDelivery));
ordersRouter.get('/:id/vault/download-all', authorize('Buyer', 'Freelancer'), validate({ params: orderIdParamsSchema }), asyncHandler(downloadAll));
ordersRouter.get('/:id/download/:deliveryId', authorize('Buyer', 'Freelancer'), validate({ params: orderDownloadParamsSchema }), asyncHandler(download));
ordersRouter.post('/:id/start', authorize('Freelancer'), publicActionLimiter, validate({ params: orderIdParamsSchema }), asyncHandler(start));
ordersRouter.post('/:id/deliver', authorize('Freelancer'), publicActionLimiter,
  validate({ params: orderIdParamsSchema }), uploadOrderDeliveries.array('files', 5),
  validate({ body: deliveryBodySchema }), asyncHandler(deliver));
ordersRouter.post('/:id/revise', authorize('Buyer'), validate({ params: orderIdParamsSchema, body: revisionBodySchema }), asyncHandler(revise));
ordersRouter.post('/:id/accept', authorize('Buyer'), publicActionLimiter, validate({ params: orderIdParamsSchema }), asyncHandler(accept));
ordersRouter.post('/:id/review', authorize('Buyer'), publicActionLimiter, validate({ params: orderIdParamsSchema, body: reviewBodySchema }), asyncHandler(review));
ordersRouter.post('/:id/reply', authorize('Freelancer'), publicActionLimiter, validate({ params: orderIdParamsSchema, body: orderReviewReplySchema }), asyncHandler(reply));
ordersRouter.post('/:id/cancel', authorize('Buyer', 'Freelancer'), validate({ params: orderIdParamsSchema }), asyncHandler(cancel));
ordersRouter.get('/:id/messages', authorize('Buyer', 'Freelancer'), validate({ params: orderIdParamsSchema }), asyncHandler(listMessages));
ordersRouter.post('/:id/messages', authorize('Buyer', 'Freelancer'), publicActionLimiter,
  validate({ params: orderIdParamsSchema, body: orderMessageBodySchema }), asyncHandler(sendMessage));
ordersRouter.get('/:id', authorize('Buyer', 'Freelancer'), validate({ params: orderIdParamsSchema }), asyncHandler(show));
