import type { Request, Response } from 'express';
import { findUserById } from '../models/user.model';
import { recordAdminAudit } from '../models/admin.model';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/app-error';
import {
  forceOrderAction as forceOrderActionService,
  getOrderDetail,
  getOrders,
  getReports,
  getReviews,
  getStats,
  getAuditLogs,
  getConversationTranscript,
  getConversations,
  getUsers,
  manageUser,
  removeManagedUser,
  removeReview,
  resetUserPassword,
  resolveReport,
  updateUserFeatured,
  updateUserRole,
  updateUserStatus,
  updateUserVerified,
} from '../services/admin.service';
import {
  getAllConversations,
  getChatAttachmentFile,
  getContentComments,
  getContentPortfolio,
  getContentPosts,
  getContentServices,
  getInspectionTranscript,
  getOrderFullTranscript,
  getOrderVaultFile,
  getOrderVaultFiles,
  getUserDossier,
  removeAdminFamilyLink,
  deleteCommentByAdmin,
  deletePortfolioByAdmin,
  deletePostByAdmin,
  deleteServiceByAdmin,
  setPostStatusByAdmin,
  updatePortfolioByAdmin,
  updateServiceByAdmin,
} from '../services/admin-inspection.service';
import {
  createSkillByAdmin,
  deleteArticleByAdmin,
  deleteSkillByAdmin,
  getAdminArticles,
  getAdminPoints,
  getAdminSkills,
  updateArticleByAdmin,
  updateSkillByAdmin,
} from '../services/admin-platform.service';
import type {
  AdminAuditQueryInput,
  AdminChatAttachmentQueryInput,
  AdminContentArticleUpdateInput,
  AdminContentArticlesQueryInput,
  AdminContentCommentsQueryInput,
  AdminContentPortfolioQueryInput,
  AdminContentPortfolioUpdateInput,
  AdminContentPostStatusInput,
  AdminContentPostsQueryInput,
  AdminContentServiceUpdateInput,
  AdminContentServicesQueryInput,
  AdminInspectionConversationsQueryInput,
  AdminInspectionConversationQueryInput,
  AdminOrderTranscriptQueryInput,
  AdminOrdersQueryInput,
  AdminReportsQueryInput,
  AdminReviewsQueryInput,
  AdminSkillCreateInput,
  AdminSkillUpdateInput,
  AdminUsersQueryInput,
  AdminVaultFileQueryInput,
  AdminVaultFilesQueryInput,
  ManageUserInput,
} from '../validators/admin.validator';

const sendProtectedFile = (
  res: Response,
  file: { filePath: string; name: string; mimeType: string; sha256?: string },
  download: boolean,
): void => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  );
  if (file.sha256) res.setHeader('X-File-Sha256', file.sha256);
  res.type(file.mimeType);
  res.sendFile(file.filePath);
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const result = await getUsers(req.query as unknown as AdminUsersQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const impersonateUser = async (req: Request, res: Response): Promise<void> => {
  const target = await findUserById(String(req.params.id));
  if (!target || !target.is_active || !target.profile_complete || target.account_status !== 'ACTIVE' || target.role === 'Admin') {
    throw new AppError('لا يمكن بدء جلسة إدارة لهذا الحساب.', 404);
  }
  const reason = 'بدء جلسة معاينة إدارية بعد التحقق بوجه المشرف';
  const token = signToken({ sub: target.id, email: target.email, role: target.role, impersonatorId: req.user!.id }, '15m');
  recordAdminAudit(req.user!.id, 'user_impersonation_started', 'user', target.id, reason, {
    targetRole: target.role,
    expiresIn: '15m',
  });
  res.status(200).json({ success: true, data: { token, user: { id: target.id, name: target.name, role: target.role } } });
};

export const changeUserStatus = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserStatus(
    req.user!.id,
    String(req.params.id),
    req.body.isActive as boolean,
    String(req.body.reason),
    req.body.expectedIsActive as boolean | undefined,
  );

  res.status(200).json({
    success: true,
    message: user.isActive ? 'تم تفعيل الحساب بنجاح' : 'تم تجميد الحساب بنجاح',
    data: { user },
  });
};

export const changeUserFeatured = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserFeatured(
    req.user!.id,
    String(req.params.id),
    req.body.isFeatured as boolean,
    (req.body.featuredUntil as string | null) ?? null,
    String(req.body.reason),
  );

  res.status(200).json({
    success: true,
    message: user.isFeatured ? 'تم تمييز البروفايل بنجاح' : 'تم إزالة التمييز عن البروفايل',
    data: { user },
  });
};

export const changeUserVerified = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserVerified(
    req.user!.id,
    String(req.params.id),
    req.body.isVerified as boolean,
    String(req.body.reason),
  );

  res.status(200).json({
    success: true,
    message: user.isVerified ? 'تم توثيق الحساب بالعلامة الزرقاء' : 'تم إزالة التوثيق عن الحساب',
    data: { user },
  });
};

export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserRole(
    req.user!.id,
    String(req.params.id),
    req.body.role as 'Freelancer' | 'Buyer' | 'Parent' | 'Admin',
    String(req.body.reason),
  );

  res.status(200).json({
    success: true,
    message: 'تم تغيير دور المستخدم وإنهاء جلساته الحالية',
    data: { user },
  });
};

export const editUser = async (req: Request, res: Response): Promise<void> => {
  const user = await manageUser(req.user!.id, String(req.params.id), req.body as ManageUserInput);

  res.status(200).json({
    success: true,
    message: 'تم تحديث بيانات المستخدم',
    data: { user },
  });
};

export const setPassword = async (req: Request, res: Response): Promise<void> => {
  await resetUserPassword(
    req.user!.id,
    String(req.params.id),
    req.body.password as string,
    String(req.body.reason),
  );

  res.status(200).json({
    success: true,
    message: 'تم تعيين كلمة مرور جديدة وإنهاء جلسات المستخدم',
  });
};

export const removeUser = async (req: Request, res: Response): Promise<void> => {
  const result = await removeManagedUser(req.user!.id, String(req.params.id), String(req.body.reason));

  res.status(200).json({
    success: true,
    message: result.archived ? 'تم أرشفة الحساب وتعطيل الوصول إليه مع الحفاظ على سجل الطلبات' : 'تم حذف الحساب وجميع بياناته',
    data: { archived: result.archived },
  });
};

export const listReports = async (req: Request, res: Response): Promise<void> => {
  const result = await getReports(req.query as unknown as AdminReportsQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const changeReportStatus = async (req: Request, res: Response): Promise<void> => {
  const status = req.body.status as 'Pending' | 'Resolved' | 'Dismissed';
  const report = await resolveReport(req.user!.id, String(req.params.id), status, String(req.body.reason));

  res.status(200).json({
    success: true,
    message:
      status === 'Resolved'
        ? 'تم حل البلاغ بنجاح'
        : status === 'Dismissed'
          ? 'تم تجاهل البلاغ وحفظه دون إجراء'
          : 'تم إعادة البلاغ لقيد الانتظار',
    data: { report },
  });
};

export const listReviews = async (req: Request, res: Response): Promise<void> => {
  const result = await getReviews(req.query as unknown as AdminReviewsQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const deleteReviewHandler = async (req: Request, res: Response): Promise<void> => {
  await removeReview(req.user!.id, String(req.params.id), String(req.body.reason));

  res.status(200).json({
    success: true,
    message: 'تم حذف التقييم بنجاح',
  });
};

export const stats = async (_req: Request, res: Response): Promise<void> => {
  const result = await getStats();

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const listConversations = async (req: Request, res: Response): Promise<void> => {
  const result = await getConversations(req.query as unknown as import('../validators/admin.validator').AdminConversationsQueryInput);
  res.status(200).json({ success: true, data: result });
};

export const listConversationMessages = async (req: Request, res: Response): Promise<void> => {
  const messages = getConversationTranscript(
    req.user!.id,
    String(req.params.participantAId),
    String(req.params.participantBId),
    typeof req.query.serviceId === 'string' ? req.query.serviceId : null,
    String(req.query.reason),
  );
  res.status(200).json({ success: true, data: { items: messages } });
};

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminAuditQueryInput;
  res.status(200).json({ success: true, data: getAuditLogs(input) });
};

export const listOrders = async (req: Request, res: Response): Promise<void> => {
  const result = await getOrders(req.query as unknown as AdminOrdersQueryInput);
  res.status(200).json({ success: true, data: result });
};

export const orderDetail = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: getOrderDetail(String(req.params.id)) });
};

export const forceOrderAction = async (req: Request, res: Response): Promise<void> => {
  const action = req.body.action as 'CANCEL' | 'CLOSE';
  const order = await forceOrderActionService(
    req.user!.id,
    String(req.params.id),
    action,
    String(req.body.reason),
    Boolean(req.body.grantCompletionPoints),
  );
  res.status(200).json({
    success: true,
    message: action === 'CANCEL' ? 'تم إلغاء الطلب بقرار إداري وتسجيل السبب' : 'تم إغلاق الطلب بقرار إداري وتسجيل السبب',
    data: { order },
  });
};

/* ------------------- God-mode inspection (chat / orders) ------------------- */

export const allConversations = async (req: Request, res: Response): Promise<void> => {
  const result = getAllConversations(req.query as unknown as AdminInspectionConversationsQueryInput);
  res.status(200).json({ success: true, data: result });
};

export const conversationMessagesById = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminInspectionConversationQueryInput;
  const result = getInspectionTranscript(req.user!.id, String(req.params.id), input.reason);
  res.status(200).json({ success: true, data: result });
};

export const chatAttachment = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminChatAttachmentQueryInput;
  const file = await getChatAttachmentFile(
    req.user!.id,
    String(req.params.messageId),
    input.reason,
    Boolean(input.download),
  );
  sendProtectedFile(res, file, Boolean(input.download));
};

export const orderVaultFiles = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminVaultFilesQueryInput;
  res.status(200).json({
    success: true,
    data: getOrderVaultFiles(req.user!.id, String(req.params.id), input.reason),
  });
};

export const orderVaultFile = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminVaultFileQueryInput;
  const file = await getOrderVaultFile(
    req.user!.id,
    String(req.params.id),
    String(req.params.deliveryId),
    input.reason,
    Boolean(input.download),
  );
  sendProtectedFile(res, file, Boolean(input.download));
};

export const orderFullTranscript = async (req: Request, res: Response): Promise<void> => {
  const input = req.query as unknown as AdminOrderTranscriptQueryInput;
  res.status(200).json({
    success: true,
    data: getOrderFullTranscript(req.user!.id, String(req.params.id), input.reason),
  });
};

export const userDossier = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: getUserDossier(req.user!.id, String(req.params.id)),
  });
};

export const removeFamilyLink = async (req: Request, res: Response): Promise<void> => {
  const result = removeAdminFamilyLink(req.user!.id, String(req.params.linkId), String(req.body.reason));
  res.status(200).json({ success: true, data: result });
};

/* ----------------------- Content & services control ----------------------- */

export const contentServices = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: getContentServices(req.query as unknown as AdminContentServicesQueryInput),
  });
};

export const updateContentService = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as AdminContentServiceUpdateInput;
  const { reason, ...patch } = input;
  const service = updateServiceByAdmin(req.user!.id, String(req.params.id), patch, reason);
  res.status(200).json({
    success: true,
    message: 'تم تحديث بيانات الخدمة وتسجيل الإجراء',
    data: { service },
  });
};

export const removeContentService = async (req: Request, res: Response): Promise<void> => {
  deleteServiceByAdmin(req.user!.id, String(req.params.id), String(req.body.reason));
  res.status(200).json({ success: true, message: 'تم حذف الخدمة نهائيًا' });
};

export const contentPortfolio = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: getContentPortfolio(req.query as unknown as AdminContentPortfolioQueryInput),
  });
};

export const updateContentPortfolio = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as AdminContentPortfolioUpdateInput;
  const { reason, ...patch } = input;
  const item = updatePortfolioByAdmin(req.user!.id, String(req.params.id), patch, reason);
  res.status(200).json({
    success: true,
    message: 'تم تحديث مشروع المعرض وتسجيل الإجراء',
    data: { item },
  });
};

export const removeContentPortfolio = async (req: Request, res: Response): Promise<void> => {
  await deletePortfolioByAdmin(req.user!.id, String(req.params.id), String(req.body.reason));
  res.status(200).json({ success: true, message: 'تم حذف مشروع المعرض نهائيًا' });
};

export const contentPosts = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: getContentPosts(req.query as unknown as AdminContentPostsQueryInput),
  });
};

export const updateContentPost = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as AdminContentPostStatusInput;
  const post = setPostStatusByAdmin(req.user!.id, String(req.params.id), input.status, input.reason);
  res.status(200).json({
    success: true,
    message: input.status === 'PUBLISHED' ? 'تم نشر المنشور' : 'تم إخفاء المنشور عن المجتمع',
    data: { post },
  });
};

export const removeContentPost = async (req: Request, res: Response): Promise<void> => {
  await deletePostByAdmin(req.user!.id, String(req.params.id), String(req.body.reason));
  res.status(200).json({ success: true, message: 'تم حذف المنشور نهائيًا' });
};

export const contentComments = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: getContentComments(req.query as unknown as AdminContentCommentsQueryInput),
  });
};

export const removeContentComment = async (req: Request, res: Response): Promise<void> => {
  await deleteCommentByAdmin(req.user!.id, String(req.params.id), String(req.body.reason));
  res.status(200).json({ success: true, message: 'تم حذف التعليق نهائيًا' });
};

/* ----------------------- Articles / skills / points ----------------------- */

export const contentArticles = async (req: Request, res: Response): Promise<void> => {
  const result = getAdminArticles(req.query as unknown as AdminContentArticlesQueryInput);
  res.status(200).json({ success: true, data: result });
};

export const updateContentArticle = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as AdminContentArticleUpdateInput;
  const article = updateArticleByAdmin(req.user!.id, String(req.params.id), input);
  res.status(200).json({
    success: true,
    message: input.status && Object.keys(input).filter((key) => key !== 'reason').length === 1
      ? input.status === 'PUBLISHED'
        ? 'تم نشر المقال'
        : 'تم إخفاء المقال عن الزوار'
      : 'تم تحديث المقال وتسجيل الإجراء',
    data: { article },
  });
};

export const removeContentArticle = async (req: Request, res: Response): Promise<void> => {
  deleteArticleByAdmin(req.user!.id, String(req.params.id), String(req.body.reason));
  res.status(200).json({ success: true, message: 'تم حذف المقال نهائيًا' });
};

export const skillsList = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await getAdminSkills() } });
};

export const createSkill = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as AdminSkillCreateInput;
  const skill = await createSkillByAdmin(req.user!.id, input.name, input.reason);
  res.status(201).json({ success: true, message: 'تمت إضافة المهارة', data: { skill } });
};

export const updateSkill = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as AdminSkillUpdateInput;
  const skill = await updateSkillByAdmin(req.user!.id, String(req.params.id), input.name, input.reason);
  res.status(200).json({ success: true, message: 'تم تعديل اسم المهارة', data: { skill } });
};

export const removeSkill = async (req: Request, res: Response): Promise<void> => {
  await deleteSkillByAdmin(req.user!.id, String(req.params.id), String(req.body.reason));
  res.status(200).json({ success: true, message: 'تم حذف المهارة' });
};

export const pointsDashboard = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: await getAdminPoints() });
};
