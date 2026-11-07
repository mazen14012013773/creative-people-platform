import { Router } from 'express';
import {
  favorite,
  createReportHandler,
  createReviewHandler,
  detail,
  featured,
  list,
} from '../controllers/freelancer.controller';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createReportSchema,
  createReviewSchema,
  featuredFreelancersQuerySchema,
  freelancerQuerySchema,
} from '../validators/freelancer.validator';
import { uuidParamSchema } from '../validators/common.validator';

export const freelancersRouter = Router();

freelancersRouter.get(
  '/',
  validate({ query: freelancerQuerySchema }),
  asyncHandler(list),
);

freelancersRouter.get(
  '/featured',
  validate({ query: featuredFreelancersQuerySchema }),
  asyncHandler(featured),
);

freelancersRouter.post(
  '/:id/reviews',
  authenticate,
  authorize('Buyer'),
  publicActionLimiter,
  validate({ params: uuidParamSchema, body: createReviewSchema }),
  asyncHandler(createReviewHandler),
);

freelancersRouter.post(
  '/:id/favorite',
  authenticate,
  authorize('Buyer'),
  publicActionLimiter,
  validate({ params: uuidParamSchema }),
  asyncHandler(favorite),
);

freelancersRouter.post(
  '/:id/reports',
  publicActionLimiter,
  validate({ params: uuidParamSchema, body: createReportSchema }),
  asyncHandler(createReportHandler),
);

freelancersRouter.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: uuidParamSchema }),
  asyncHandler(detail),
);
