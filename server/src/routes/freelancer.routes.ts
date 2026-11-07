import { Router } from 'express';
import { myStats } from '../controllers/events.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

export const freelancerRouter = Router();

freelancerRouter.get(
  '/stats',
  authenticate,
  authorize('Freelancer'),
  asyncHandler(myStats),
);
