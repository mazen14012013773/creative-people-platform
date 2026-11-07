import { Router } from 'express';
import { redeem, showRewards } from '../controllers/rewards.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { redeemRewardSchema } from '../validators/rewards.validator';

export const rewardsRouter = Router();
rewardsRouter.use(authenticate, authorize('Freelancer'));
rewardsRouter.get('/', asyncHandler(showRewards));
rewardsRouter.post('/redeem', publicActionLimiter, validate({ body: redeemRewardSchema }), asyncHandler(redeem));
