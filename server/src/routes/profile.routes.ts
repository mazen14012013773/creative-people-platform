import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
} from '../controllers/profile.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { updateBuyerProfileHandler, uploadBuyerAvatarHandler } from '../controllers/buyer-profile.controller';
import { uploadSingleImage } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { updateProfileSchema } from '../validators/freelancer.validator';
import { updateBuyerProfileSchema } from '../validators/buyer-profile.validator';

export const profileRouter = Router();

profileRouter.get('/', authenticate, authorize('Freelancer'), asyncHandler(getMyProfile));

profileRouter.patch(
  '/',
  authenticate,
  authorize('Freelancer'),
  validate({ body: updateProfileSchema }),
  asyncHandler(updateMyProfile),
);

profileRouter.post(
  '/avatar',
  authenticate,
  authorize('Freelancer'),
  uploadSingleImage.single('avatar'),
  asyncHandler(uploadAvatar),
);

profileRouter.patch('/buyer', authenticate, authorize('Buyer'), validate({ body: updateBuyerProfileSchema }), asyncHandler(updateBuyerProfileHandler));
profileRouter.post('/buyer/avatar', authenticate, authorize('Buyer'), uploadSingleImage.single('avatar'), asyncHandler(uploadBuyerAvatarHandler));
profileRouter.patch('/parent', authenticate, authorize('Parent'), validate({ body: updateBuyerProfileSchema }), asyncHandler(updateBuyerProfileHandler));
profileRouter.post('/parent/avatar', authenticate, authorize('Parent'), uploadSingleImage.single('avatar'), asyncHandler(uploadBuyerAvatarHandler));
