import { Router } from 'express';
import { stream } from '../controllers/realtime.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const realtimeRouter = Router();
realtimeRouter.get('/stream', authenticate, stream);
