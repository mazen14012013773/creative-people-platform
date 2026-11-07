import { Router } from 'express';
import {
  create,
  listMine,
  remove,
  upload,
} from '../controllers/portfolio.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadSingleImage } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { uuidParamSchema } from '../validators/common.validator';
import { createPortfolioSchema } from '../validators/portfolio.validator';

export const portfolioRouter = Router();

portfolioRouter.use(authenticate, authorize('Freelancer'));

portfolioRouter.get('/', asyncHandler(listMine));

portfolioRouter.post(
  '/',
  validate({ body: createPortfolioSchema }),
  asyncHandler(create),
);

portfolioRouter.post(
  '/upload',
  uploadSingleImage.single('image'),
  asyncHandler(upload),
);

portfolioRouter.delete(
  '/:id',
  validate({ params: uuidParamSchema }),
  asyncHandler(remove),
);
