import { Router } from 'express';
import { createAccountReport } from '../controllers/account-report.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadReportEvidence } from '../middlewares/upload.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { accountReportSchema } from '../validators/account-report.validator';

export const reportsRouter = Router();
reportsRouter.use(authenticate, authorize('Buyer', 'Freelancer', 'Parent'));
reportsRouter.post('/', publicActionLimiter, uploadReportEvidence.array('proofFiles', 5), validate({ body: accountReportSchema }), asyncHandler(createAccountReport));
