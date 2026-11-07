import { Router } from 'express';
import { create, deleteUploadedMedia, list, mine, remove, update, uploadMedia, uploadedMedia } from '../controllers/services.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { uploadServiceMedia } from '../middlewares/upload.middleware';
import { serviceCreateSchema, serviceIdSchema, serviceListQuerySchema, serviceUpdateSchema } from '../validators/service.validator';

export const servicesRouter = Router();

servicesRouter.get('/', validate({ query: serviceListQuerySchema }), asyncHandler(list));
servicesRouter.get('/mine', authenticate, authorize('Freelancer'), asyncHandler(mine));
servicesRouter.get('/uploads/mine', authenticate, authorize('Freelancer'), asyncHandler(uploadedMedia));
servicesRouter.delete('/uploads/mine/:filename', authenticate, authorize('Freelancer'), asyncHandler(deleteUploadedMedia));
servicesRouter.post('/upload', authenticate, authorize('Freelancer'), publicActionLimiter,
  uploadServiceMedia.single('media'), asyncHandler(uploadMedia));
servicesRouter.post(
  '/', authenticate, authorize('Freelancer'), publicActionLimiter,
  validate({ body: serviceCreateSchema }), asyncHandler(create),
);
servicesRouter.patch(
  '/:id', authenticate, authorize('Freelancer'),
  validate({ params: serviceIdSchema, body: serviceUpdateSchema }), asyncHandler(update),
);
servicesRouter.delete(
  '/:id', authenticate, authorize('Freelancer'),
  validate({ params: serviceIdSchema }), asyncHandler(remove),
);
