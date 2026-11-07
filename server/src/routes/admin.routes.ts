import { Router } from 'express';
import { z } from 'zod';
import {
  allConversations,
  changeReportStatus,
  changeUserFeatured,
  changeUserRole,
  changeUserStatus,
  changeUserVerified,
  chatAttachment,
  contentArticles,
  contentComments,
  contentPortfolio,
  contentPosts,
  contentServices,
  conversationMessagesById,
  createSkill,
  deleteReviewHandler,
  editUser,
  forceOrderAction,
  listOrders,
  listReports,
  orderDetail,
  orderFullTranscript,
  orderVaultFile,
  orderVaultFiles,
  listConversations,
  listConversationMessages,
  listAuditLogs,
  listReviews,
  listUsers,
  impersonateUser,
  pointsDashboard,
  removeContentArticle,
  removeFamilyLink,
  removeContentComment,
  removeContentPortfolio,
  removeContentPost,
  removeContentService,
  removeSkill,
  removeUser,
  setPassword,
  skillsList,
  stats,
  updateContentArticle,
  updateContentPortfolio,
  updateContentPost,
  updateContentService,
  updateSkill,
  userDossier,
} from '../controllers/admin.controller';
import {
  adminNotifications,
  createSiteNotification,
  updateSiteNotification,
} from '../controllers/notification.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { adminSystemRouter } from './system.routes';
import { asyncHandler } from '../utils/async-handler';
import {
  adminAuditQuerySchema,
  adminImpersonateSchema,
  adminAuditReasonBodySchema,
  adminChatAttachmentParamsSchema,
  adminChatAttachmentQuerySchema,
  adminContentArticlesQuerySchema,
  adminContentArticleUpdateSchema,
  adminContentCommentsQuerySchema,
  adminContentPortfolioQuerySchema,
  adminContentPortfolioUpdateSchema,
  adminContentPostStatusSchema,
  adminContentPostsQuerySchema,
  adminContentServiceUpdateSchema,
  adminContentServicesQuerySchema,
  adminInspectionConversationParamsSchema,
  adminInspectionConversationQuerySchema,
  adminInspectionConversationsQuerySchema,
  adminOrderTranscriptQuerySchema,
  adminReportsQuerySchema,
  adminConversationsQuerySchema,
  adminConversationMessagesParamsSchema,
  adminConversationMessagesQuerySchema,
  adminReviewsQuerySchema,
  adminSkillCreateSchema,
  adminSkillUpdateSchema,
  adminUsersQuerySchema,
  adminOrdersQuerySchema,
  adminUserDossierParamsSchema,
  adminVaultFileParamsSchema,
  adminVaultFileQuerySchema,
  adminVaultFilesQuerySchema,
  forceOrderActionSchema,
  manageUserSchema,
  updateReportSchema,
  updateUserFeaturedSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateUserVerifiedSchema,
  adminSetPasswordSchema,
} from '../validators/admin.validator';
import { adminPaginationSchema, uuidParamSchema } from '../validators/common.validator';
import { createNotificationSchema, updateNotificationSchema } from '../validators/notification.validator';
import {
  adminSupportTicketsQuerySchema,
  supportTicketParamsSchema,
  supportTicketStatusSchema,
} from '../validators/support.validator';
import { adminTicketStatus, adminTickets } from '../controllers/support.controller';
import { accountReportEvidence, listAccountReportsHandler, resolveAccountReportHandler } from '../controllers/account-report.controller';
import { accountReportActionSchema, accountReportQuerySchema } from '../validators/account-report.validator';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('Admin'));

adminRouter.use((req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  // Multipart restore requests are parsed by Multer in the system router.
  if (req.path === '/system/restore') { next(); return; }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  if (typeof req.body.reason !== 'string' || !req.body.reason.trim()) req.body.reason = '????? ?????';
  if (typeof req.body.notes !== 'string' || !req.body.notes.trim()) req.body.notes = '????? ?????';
  next();
});

adminRouter.use('/system', adminSystemRouter);

adminRouter.get(
  '/notifications',
  validate({ query: adminPaginationSchema }),
  asyncHandler(adminNotifications),
);
adminRouter.post('/notifications', validate({ body: createNotificationSchema }), asyncHandler(createSiteNotification));
adminRouter.patch(
  '/notifications/:id',
  validate({ params: uuidParamSchema, body: updateNotificationSchema }),
  asyncHandler(updateSiteNotification),
);

adminRouter.get('/stats', asyncHandler(stats));

adminRouter.get(
  '/orders',
  validate({ query: adminOrdersQuerySchema }),
  asyncHandler(listOrders),
);
adminRouter.post(
  '/orders/:id/force-action',
  validate({ params: uuidParamSchema, body: forceOrderActionSchema }),
  asyncHandler(forceOrderAction),
);
adminRouter.get(
  '/orders/:id/vault-files',
  validate({ params: uuidParamSchema, query: adminVaultFilesQuerySchema }),
  asyncHandler(orderVaultFiles),
);
adminRouter.get(
  '/orders/:id/vault-files/:deliveryId',
  validate({ params: adminVaultFileParamsSchema, query: adminVaultFileQuerySchema }),
  asyncHandler(orderVaultFile),
);
adminRouter.get(
  '/orders/:id/full-transcript',
  validate({ params: uuidParamSchema, query: adminOrderTranscriptQuerySchema }),
  asyncHandler(orderFullTranscript),
);
adminRouter.get(
  '/orders/:id',
  validate({ params: uuidParamSchema }),
  asyncHandler(orderDetail),
);

adminRouter.get(
  '/support/tickets',
  validate({ query: adminSupportTicketsQuerySchema }),
  asyncHandler(adminTickets),
);
adminRouter.patch('/support/tickets/:id/status', validate({ params: supportTicketParamsSchema, body: supportTicketStatusSchema }), asyncHandler(adminTicketStatus));

adminRouter.get(
  '/conversations',
  validate({ query: adminConversationsQuerySchema }),
  asyncHandler(listConversations),
);
adminRouter.get(
  '/conversations/:participantAId/:participantBId/messages',
  validate({ params: adminConversationMessagesParamsSchema, query: adminConversationMessagesQuerySchema }),
  asyncHandler(listConversationMessages),
);
adminRouter.get(
  '/chat/all-conversations',
  validate({ query: adminInspectionConversationsQuerySchema }),
  asyncHandler(allConversations),
);
adminRouter.get(
  '/chat/conversations/:id/messages',
  validate({ params: adminInspectionConversationParamsSchema, query: adminInspectionConversationQuerySchema }),
  asyncHandler(conversationMessagesById),
);
adminRouter.get(
  '/chat/attachments/:messageId',
  validate({ params: adminChatAttachmentParamsSchema, query: adminChatAttachmentQuerySchema }),
  asyncHandler(chatAttachment),
);
adminRouter.get(
  '/audit-logs',
  validate({ query: adminAuditQuerySchema }),
  asyncHandler(listAuditLogs),
);

adminRouter.get(
  '/users',
  validate({ query: adminUsersQuerySchema }),
  asyncHandler(listUsers),
);
adminRouter.post('/users/:id/impersonate', validate({ params: uuidParamSchema, body: adminImpersonateSchema }), asyncHandler(impersonateUser));

adminRouter.get(
  '/users/:id/dossier',
  validate({ params: adminUserDossierParamsSchema }),
  asyncHandler(userDossier),
);
adminRouter.delete('/family-links/:linkId', validate({ params: z.object({ linkId: uuidParamSchema.shape.id }), body: adminAuditReasonBodySchema }), asyncHandler(removeFamilyLink));

adminRouter.get(
  '/content/services',
  validate({ query: adminContentServicesQuerySchema }),
  asyncHandler(contentServices),
);
adminRouter.patch(
  '/content/services/:id',
  validate({ params: uuidParamSchema, body: adminContentServiceUpdateSchema }),
  asyncHandler(updateContentService),
);
adminRouter.delete(
  '/content/services/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(removeContentService),
);

adminRouter.get(
  '/content/portfolio',
  validate({ query: adminContentPortfolioQuerySchema }),
  asyncHandler(contentPortfolio),
);
adminRouter.patch(
  '/content/portfolio/:id',
  validate({ params: uuidParamSchema, body: adminContentPortfolioUpdateSchema }),
  asyncHandler(updateContentPortfolio),
);
adminRouter.delete(
  '/content/portfolio/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(removeContentPortfolio),
);

adminRouter.get(
  '/content/posts',
  validate({ query: adminContentPostsQuerySchema }),
  asyncHandler(contentPosts),
);
adminRouter.patch(
  '/content/posts/:id',
  validate({ params: uuidParamSchema, body: adminContentPostStatusSchema }),
  asyncHandler(updateContentPost),
);
adminRouter.delete(
  '/content/posts/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(removeContentPost),
);

adminRouter.get(
  '/content/comments',
  validate({ query: adminContentCommentsQuerySchema }),
  asyncHandler(contentComments),
);
adminRouter.delete(
  '/content/comments/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(removeContentComment),
);

adminRouter.get(
  '/content/articles',
  validate({ query: adminContentArticlesQuerySchema }),
  asyncHandler(contentArticles),
);
adminRouter.patch(
  '/content/articles/:id',
  validate({ params: uuidParamSchema, body: adminContentArticleUpdateSchema }),
  asyncHandler(updateContentArticle),
);
adminRouter.delete(
  '/content/articles/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(removeContentArticle),
);

adminRouter.get('/skills', asyncHandler(skillsList));
adminRouter.post('/skills', validate({ body: adminSkillCreateSchema }), asyncHandler(createSkill));
adminRouter.patch('/skills/:id', validate({ params: uuidParamSchema, body: adminSkillUpdateSchema }), asyncHandler(updateSkill));
adminRouter.delete('/skills/:id', validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }), asyncHandler(removeSkill));

adminRouter.get('/points', asyncHandler(pointsDashboard));

adminRouter.patch(
  '/users/:id/status',
  validate({ params: uuidParamSchema, body: updateUserStatusSchema }),
  asyncHandler(changeUserStatus),
);

adminRouter.patch(
  '/users/:id/featured',
  validate({ params: uuidParamSchema, body: updateUserFeaturedSchema }),
  asyncHandler(changeUserFeatured),
);

adminRouter.patch(
  '/users/:id/verified',
  validate({ params: uuidParamSchema, body: updateUserVerifiedSchema }),
  asyncHandler(changeUserVerified),
);

adminRouter.patch(
  '/users/:id/role',
  validate({ params: uuidParamSchema, body: updateUserRoleSchema }),
  asyncHandler(changeUserRole),
);

adminRouter.patch(
  '/users/:id',
  validate({ params: uuidParamSchema, body: manageUserSchema }),
  asyncHandler(editUser),
);

adminRouter.put(
  '/users/:id/password',
  validate({ params: uuidParamSchema, body: adminSetPasswordSchema }),
  asyncHandler(setPassword),
);

adminRouter.delete(
  '/users/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(removeUser),
);

adminRouter.get(
  '/reports',
  validate({ query: adminReportsQuerySchema }),
  asyncHandler(listReports),
);

adminRouter.get('/content-reports', validate({ query: adminReportsQuerySchema }), asyncHandler(listReports));
adminRouter.get('/reports/:id/evidence/:evidenceId', validate({ params: uuidParamSchema.extend({ evidenceId: uuidParamSchema.shape.id }) }), asyncHandler(accountReportEvidence));
adminRouter.patch('/reports/:id/action', validate({ params: uuidParamSchema, body: accountReportActionSchema }), asyncHandler(resolveAccountReportHandler));

adminRouter.patch(
  '/content-reports/:id',
  validate({ params: uuidParamSchema, body: updateReportSchema }),
  asyncHandler(changeReportStatus),
);

adminRouter.get(
  '/reviews',
  validate({ query: adminReviewsQuerySchema }),
  asyncHandler(listReviews),
);

adminRouter.delete(
  '/reviews/:id',
  validate({ params: uuidParamSchema, body: adminAuditReasonBodySchema }),
  asyncHandler(deleteReviewHandler),
);
