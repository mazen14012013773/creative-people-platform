import { Router } from 'express';
import {
  backup,
  createIpBlock,
  flagAction,
  flagCleanup,
  flags,
  health,
  ipBlocks,
  removeIpBlock,
  rescan,
  resetData,
  restore,
  revokeSession,
  revokeSessions,
  saveSettings,
  sessions,
  settings,
  status,
} from '../controllers/system.controller';
import { validate } from '../middlewares/validate.middleware';
import { uploadBackupFile } from '../middlewares/upload.middleware';
import { asyncHandler } from '../utils/async-handler';
import { uuidParamSchema } from '../validators/common.validator';
import {
  createIpBlockSchema,
  ipBlockParamsSchema,
  ipBlocksQuerySchema,
  moderationActionSchema,
  moderationCleanupSchema,
  moderationQuerySchema,
  moderationRescanSchema,
  resetDataSchema,
  restoreBackupSchema,
  sessionRevokeParamsSchema,
  sessionRevokeSchema,
  sessionsQuerySchema,
  systemSettingsSchema,
  userSessionsRevokeSchema,
} from '../validators/system.validator';

export const systemRouter = Router();

systemRouter.get('/status', asyncHandler(status));

export const adminSystemRouter = Router();

adminSystemRouter.get('/health', asyncHandler(health));
adminSystemRouter.get('/backup', asyncHandler(backup));
adminSystemRouter.post(
  '/restore',
  uploadBackupFile.single('backup'),
  (req, _res, next) => { req.body.reason = 'Administrative backup restore'; next(); },
  validate({ body: restoreBackupSchema }),
  asyncHandler(restore),
);
adminSystemRouter.post(
  '/reset-data',
  validate({ body: resetDataSchema }),
  asyncHandler(resetData),
);
adminSystemRouter.get('/settings', asyncHandler(settings));
adminSystemRouter.patch(
  '/settings',
  validate({ body: systemSettingsSchema }),
  asyncHandler(saveSettings),
);

adminSystemRouter.get(
  '/sessions',
  validate({ query: sessionsQuerySchema }),
  asyncHandler(sessions),
);

adminSystemRouter.post(
  '/sessions/:id/revoke',
  validate({ params: sessionRevokeParamsSchema, body: sessionRevokeSchema }),
  asyncHandler(revokeSession),
);

adminSystemRouter.post(
  '/users/:id/revoke-all',
  validate({ params: uuidParamSchema, body: userSessionsRevokeSchema }),
  asyncHandler(revokeSessions),
);

adminSystemRouter.get(
  '/ip-blocks',
  validate({ query: ipBlocksQuerySchema }),
  asyncHandler(ipBlocks),
);

adminSystemRouter.post(
  '/ip-blocks',
  validate({ body: createIpBlockSchema }),
  asyncHandler(createIpBlock),
);

adminSystemRouter.delete(
  '/ip-blocks/:ip',
  validate({ params: ipBlockParamsSchema }),
  asyncHandler(removeIpBlock),
);

adminSystemRouter.get(
  '/moderation',
  validate({ query: moderationQuerySchema }),
  asyncHandler(flags),
);

adminSystemRouter.patch(
  '/moderation/:id',
  validate({ params: uuidParamSchema, body: moderationActionSchema }),
  asyncHandler(flagAction),
);

adminSystemRouter.post(
  '/moderation/:id/cleanup',
  validate({ params: uuidParamSchema, body: moderationCleanupSchema }),
  asyncHandler(flagCleanup),
);

adminSystemRouter.post(
  '/moderation/rescan',
  validate({ body: moderationRescanSchema }),
  asyncHandler(rescan),
);
