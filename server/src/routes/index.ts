import { Router } from 'express';
import { adminRouter } from './admin.routes';
import { authRouter } from './auth.routes';
import { chatRouter } from './chat.routes';
import { freelancerRouter } from './freelancer.routes';
import { freelancersRouter } from './freelancers.routes';
import { healthRouter } from './health.routes';
import { portfolioRouter } from './portfolio.routes';
import { profileRouter } from './profile.routes';
import { skillsRouter } from './skills.routes';
import { systemRouter } from './system.routes';
import { notificationsRouter } from './notifications.routes';
import { servicesRouter } from './services.routes';
import { realtimeRouter } from './realtime.routes';
import { emitRealtimeEvent } from '../services/realtime.service';
import { articlesRouter } from './articles.routes';
import { communityRouter } from './community.routes';
import { parentRouter } from './parent.routes';
import { supportRouter } from './support.routes';
import { ordersRouter } from './orders.routes';
import { rewardsRouter } from './rewards.routes';
import { reportsRouter } from './reports.routes';

export const apiRouter = Router();

// Push successful authenticated writes to that user's open sessions so their
// cached dashboard and account data refresh without a manual reload.
apiRouter.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }
  res.once('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.id) {
      emitRealtimeEvent(req.user.id, 'data');
    }
  });
  next();
});

apiRouter.use('/health', healthRouter);
apiRouter.use('/articles', articlesRouter);
apiRouter.use('/community', communityRouter);
apiRouter.use('/parent', parentRouter);
apiRouter.use('/support', supportRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/rewards', rewardsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/realtime', realtimeRouter);
apiRouter.use('/freelancers', freelancersRouter);
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/portfolio', portfolioRouter);
apiRouter.use('/freelancer', freelancerRouter);
apiRouter.use('/admin', adminRouter);
