import bcrypt from 'bcrypt';
import {
  deleteManagedUser,
  deleteReview,
  forceAdminOrderAction,
  getAdminOrderDetail,
  getAdminStats,
  listAdminAuditLogs,
  listAdminConversations,
  listAdminOrders,
  listUnifiedAdminReports,
  readAdminConversation,
  recordAdminAudit,
  getAdminUserById,
  invalidateUserSessions,
  listAdminReviews,
  listAdminUsers,
  setReportStatus,
  setUserFeatured,
  setUserPassword,
  setUserRole,
  setUserStatus,
  setUserVerified,
  updateManagedUser,
} from '../models/admin.model';
import { updateFreelancerProfile } from '../models/freelancer.model';
import { findUserById } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import { moderateProfileWrite } from './system.service';
import type { ManagedUserFields } from '../models/admin.model';
import type {
  AdminReportsQueryInput,
  AdminReviewsQueryInput,
  AdminConversationsQueryInput,
  AdminOrdersQueryInput,
  AdminUsersQueryInput,
  ManageUserInput,
} from '../validators/admin.validator';
import { createUserNotification } from '../models/notification.model';
import { emitRealtimeEvent } from './realtime.service';

const BCRYPT_ROUNDS = 12;

export const getUsers = async (input: AdminUsersQueryInput) => {
  const result = await listAdminUsers(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const updateUserStatus = async (
  adminId: string,
  userId: string,
  isActive: boolean,
  reason: string,
  expectedIsActive?: boolean,
) => {
  const user = await setUserStatus(userId, isActive, expectedIsActive);

  if (!user) {
    if (expectedIsActive !== undefined) throw new AppError('تغيّرت حالة الحساب منذ تنفيذ الإجراء؛ لم يتم تطبيق التراجع.', 409);
    throw new AppError('المستخدم غير موجود أو لا يمكن تعديله', 404);
  }

  createUserNotification(userId, 'ACCOUNT_STATUS', isActive ? 'تم تفعيل حسابك' : 'تم إيقاف حسابك مؤقتًا',
    isActive ? 'أصبح بإمكانك استخدام المنصة مرة أخرى.' : 'أوقف فريق الإدارة الحساب مؤقتًا. تواصل مع الدعم عند الحاجة.', '/');
  await recordAdminAudit(adminId, 'user_status_change', 'user', userId, reason, { isActive });

  return user;
};

export const updateUserFeatured = async (
  adminId: string,
  userId: string,
  isFeatured: boolean,
  featuredUntil: string | null = null,
  reason: string,
) => {
  const user = await setUserFeatured(userId, isFeatured, featuredUntil);

  if (!user) {
    throw new AppError('المستخدم غير موجود أو لا يمكن تعديله', 404);
  }

  createUserNotification(userId, 'ACCOUNT_STATUS', isFeatured ? 'أصبح ملفك مميزًا' : 'انتهى تمييز ملفك',
    isFeatured ? 'سيظهر ملفك ضمن الملفات المميزة على المنصة.' : 'لم يعد ملفك ضمن الملفات المميزة.', '/dashboard');
  await recordAdminAudit(adminId, 'user_featured_change', 'user', userId, reason,
    { isFeatured, featuredUntil });

  return user;
};

export const updateUserVerified = async (
  adminId: string,
  userId: string,
  isVerified: boolean,
  reason: string,
) => {
  const user = await setUserVerified(userId, isVerified);

  if (!user) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  createUserNotification(userId, 'ACCOUNT_STATUS', isVerified ? 'تم توثيق حسابك' : 'تغيّرت حالة توثيق حسابك',
    isVerified ? 'تم اعتماد شارة التوثيق لملفك.' : 'لم تعد شارة التوثيق ظاهرة على ملفك.', '/dashboard');
  await recordAdminAudit(adminId, 'user_verified_change', 'user', userId, reason, { isVerified });

  return user;
};

export const updateUserRole = async (
  adminId: string,
  userId: string,
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin',
  reason: string,
) => {
  const existing = await findUserById(userId);

  if (!existing || existing.is_deleted) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (existing.role === 'Admin') {
    throw new AppError('لا يمكن تغيير دور حساب إدارة', 403);
  }

  if (existing.role === role) {
    throw new AppError('المستخدم يحمل هذا الدور بالفعل', 409);
  }

  const user = await setUserRole(userId, role);

  if (!user) {
    throw new AppError('تعذر تغيير دور المستخدم', 500);
  }

  await invalidateUserSessions(userId, new Date().toISOString());
  await recordAdminAudit(adminId, 'user_role_change', 'user', userId, reason, {
    previousRole: existing.role,
    nextRole: role,
  });

  return user;
};

/** God-mode profile write: sanitised, moderation-scanned, then persisted atomically. */
export const manageUser = async (adminId: string, userId: string, input: ManageUserInput) => {
  const existing = await getAdminUserById(userId);

  if (!existing) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (existing.role === 'Admin' && existing.id !== adminId) {
    throw new AppError('لا يمكن تعديل حساب إدارة آخر', 403);
  }

  const { blockedMessage } = await moderateProfileWrite(userId, {
    name: input.name,
    title: input.title,
    bio: input.bio,
    location: input.location,
  });

  if (blockedMessage) {
    throw new AppError(blockedMessage, 422);
  }

  const fields: ManagedUserFields = {
    name: input.name,
    title: input.title,
    bio: input.bio,
    location: input.location,
    minBudget: input.minBudget,
    hourlyRate: input.hourlyRate,
    avatarUrl: input.avatarUrl,
    avgResponseHours: input.avgResponseHours,
  };

  {
    const user = await updateManagedUser(userId, fields);

    if (!user) {
      throw new AppError('المستخدم غير موجود', 404);
    }

    // Freelancer-only columns are ignored for other roles instead of throwing.
    if (user.role === 'Freelancer') {
      if (input.skillIds !== undefined) {
        await updateFreelancerProfile(userId, { skillIds: input.skillIds });
      }

      if (input.isAvailable !== undefined) {
        await updateFreelancerProfile(userId, { isAvailable: input.isAvailable });
      }
    }

    await recordAdminAudit(adminId, 'user_edit', 'user', userId, input.reason,
      { fields: Object.keys(input).filter((key) => key !== 'reason'), role: user.role });

    const updated = await getAdminUserById(userId);

    if (!updated) {
      throw new AppError('المستخدم غير موجود', 404);
    }

    return updated;
  }
};

export const resetUserPassword = async (
  adminId: string,
  userId: string,
  password: string,
  reason: string,
) => {
  const existing = await findUserById(userId);

  if (!existing) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (existing.role === 'Admin') {
    throw new AppError('لا يمكن تغيير كلمة مرور حساب إدارة من هنا', 403);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const updated = await setUserPassword(userId, passwordHash);

  if (!updated) {
    throw new AppError('تعذر تحديث كلمة المرور', 500);
  }

  await invalidateUserSessions(userId, new Date().toISOString());
  await recordAdminAudit(adminId, 'user_password_reset', 'user', userId, reason);

  return { changed: true };
};

export const removeManagedUser = async (adminId: string, userId: string, reason: string) => {
  const existing = await findUserById(userId);

  if (!existing) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (existing.role === 'Admin') {
    throw new AppError('لا يمكن حذف حساب إدارة', 403);
  }

  await invalidateUserSessions(userId, new Date().toISOString());

  const deleted = await deleteManagedUser(userId);

  if (!deleted) {
    throw new AppError('تعذر حذف الحساب', 500);
  }

  await recordAdminAudit(adminId, 'user_delete', 'user', userId, reason,
    { mode: deleted.archived ? 'archive' : 'hard_delete' });

  return deleted;
};

export const getReports = async (input: AdminReportsQueryInput) => {
  const result = await listUnifiedAdminReports(input.page, input.limit, input.status);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const resolveReport = async (
  adminId: string,
  reportId: string,
  status: 'Pending' | 'Resolved' | 'Dismissed',
  reason: string,
) => {
  const report = await setReportStatus(reportId, status);

  if (!report) {
    throw new AppError('البلاغ غير موجود', 404);
  }

  await recordAdminAudit(adminId, 'content_report_status', 'content_report', reportId, reason, { status });

  return report;
};

export const getReviews = async (input: AdminReviewsQueryInput) => {
  const result = await listAdminReviews(input.page, input.limit, input.q);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const getConversations = async (input: AdminConversationsQueryInput) => {
  const result = await listAdminConversations(input.page, input.limit, input.q);
  return { items: result.items, pagination: buildPagination(input.page, input.limit, result.total) };
};

export const getConversationTranscript = async (
  adminId: string,
  participantAId: string,
  participantBId: string,
  serviceId: string | null,
  reason: string,
): Promise<Awaited<ReturnType<typeof readAdminConversation>>> => {
  const messages = await readAdminConversation(adminId, participantAId, participantBId, serviceId, reason);
  if (!messages) throw new AppError('المحادثة غير موجودة', 404);
  return messages;
};

export const getAuditLogs = async (
  input: { page: number; limit: number; adminId?: string; entityId?: string; action?: string; from?: string | null; to?: string | null },
): Promise<{ items: Awaited<ReturnType<typeof listAdminAuditLogs>>['items']; pagination: ReturnType<typeof buildPagination> }> => {
  const result = await listAdminAuditLogs(input.page, input.limit, {
    adminId: input.adminId,
    entityId: input.entityId,
    action: input.action,
    from: input.from ?? undefined,
    to: input.to ?? undefined,
  });
  return { items: result.items, pagination: buildPagination(input.page, input.limit, result.total) };
};

export const removeReview = async (adminId: string, reviewId: string, reason: string) => {
  const deleted = await deleteReview(reviewId);

  if (!deleted) {
    throw new AppError('التقييم غير موجود', 404);
  }

  await recordAdminAudit(adminId, 'review_delete', 'review', reviewId, reason);
};

export const getOrders = async (input: AdminOrdersQueryInput) => {
  const result = await listAdminOrders(input);
  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const getOrderDetail = async (orderId: string) => {
  const detail = await getAdminOrderDetail(orderId);

  if (!detail) {
    throw new AppError('الطلب غير موجود', 404);
  }

  return detail;
};

export const forceOrderAction = async (
  adminId: string,
  orderId: string,
  action: 'CANCEL' | 'CLOSE',
  reason: string,
  grantCompletionPoints = false,
) => {
  const order = await forceAdminOrderAction(orderId, adminId, action, reason, grantCompletionPoints);
  for (const userId of [order.buyerId, order.freelancerId]) {
    emitRealtimeEvent(userId, 'notification');
    emitRealtimeEvent(userId, 'order', { orderId });
  }
  return order;
};

export const getStats = async () => {
  return getAdminStats();
};
