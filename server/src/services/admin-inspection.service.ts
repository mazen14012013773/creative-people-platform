import { recordAdminAudit } from '../models/admin.model';
import {
  deleteAdminContentComment,
  deleteAdminContentPortfolio,
  deleteAdminContentPost,
  deleteAdminContentService,
  findAdminChatAttachment,
  findAdminVaultFile,
  getAdminOrderFullTranscript,
  getAdminUserDossier,
  listAdminContentComments,
  listAdminContentPortfolio,
  listAdminContentPosts,
  listAdminContentServices,
  listAdminInspectionConversations,
  listAdminOrderVaultFiles,
  readAdminInspectionConversation,
  setAdminContentPostStatus,
  updateAdminContentPortfolio,
  updateAdminContentService,
  unlinkAdminFamilyLink,
  type AdminAllConversationsFilters,
} from '../models/admin-inspection.model';
import { deleteLocalImage, getPrivateFileUrl } from './upload.service';
import { emitRealtimeEventToAll } from './realtime.service';
import { buildPagination } from '../utils/pagination';
import { AppError } from '../utils/app-error';

const DEFAULT_VIEW_REASON = 'تفتيش إداري شامل من لوحة السيطرة';

export const getAllConversations = async (input: AdminAllConversationsFilters) => {
  const result = await listAdminInspectionConversations(input);
  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const getInspectionTranscript = async (adminId: string, conversationId: string, reason: string) => {
  const transcript = await readAdminInspectionConversation(conversationId);
  if (!transcript) throw new AppError('المحادثة غير موجودة', 404);

  await recordAdminAudit(adminId, 'view_conversation', 'conversation', conversationId, reason, {
    kind: transcript.conversation.kind,
    participantAId: transcript.conversation.participantA.id,
    participantBId: transcript.conversation.participantB.id,
    serviceId: transcript.conversation.serviceId,
    orderId: transcript.conversation.orderId,
    messageCount: transcript.items.length,
    attachmentCount: transcript.conversation.attachmentCount,
  });

  return transcript;
};

export const getChatAttachmentFile = async (
  adminId: string,
  messageId: string,
  reason: string,
  download: boolean,
) => {
  const attachment = await findAdminChatAttachment(messageId);
  if (!attachment) throw new AppError('المرفق غير موجود', 404);


  await recordAdminAudit(adminId, 'view_chat_attachment', 'chat_attachment', messageId, reason, {
    name: attachment.name,
    mimeType: attachment.mimeType,
    size: attachment.size,
    senderName: attachment.senderName,
    receiverName: attachment.receiverName,
    download,
  });

  return {
    url: await getPrivateFileUrl(attachment.storageKey, attachment.name),
    name: attachment.name,
    mimeType: attachment.mimeType,
    sha256: '',
  };
};

export const getOrderFullTranscript = async (adminId: string, orderId: string, reason: string) => {
  const transcript = await getAdminOrderFullTranscript(orderId);
  if (!transcript) throw new AppError('الطلب غير موجود', 404);

  await recordAdminAudit(adminId, 'view_order_transcript', 'order', orderId, reason, {
    status: transcript.order.status,
    events: transcript.events.length,
    messages: transcript.messages.length,
    files: transcript.vaultFiles.length,
    hasReview: Boolean(transcript.review),
  });

  return transcript;
};

export const getOrderVaultFiles = async (adminId: string, orderId: string, reason?: string | null) => {
  const files = await listAdminOrderVaultFiles(orderId);
  if (!files) throw new AppError('الطلب غير موجود', 404);

  await recordAdminAudit(adminId, 'view_order_vault', 'order', orderId,
    reason?.trim() || DEFAULT_VIEW_REASON, { files: files.length });

  return { items: files };
};

export const getOrderVaultFile = async (
  adminId: string,
  orderId: string,
  deliveryId: string,
  reason: string,
  download: boolean,
) => {
  const file = await findAdminVaultFile(orderId, deliveryId);
  if (!file) throw new AppError('ملف التسليم غير موجود لهذا الطلب', 404);

  await recordAdminAudit(adminId, 'view_order_vault_file', 'order', orderId, reason, {
    deliveryId,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    download,
  });

  return {
    url: await getPrivateFileUrl(file.storagePath, download ? file.name : undefined),
    name: file.name,
    mimeType: file.mimeType,
    sha256: file.sha256,
  };
};

export const getUserDossier = async (adminId: string, userId: string) => {
  const dossier = await getAdminUserDossier(userId);
  if (!dossier) throw new AppError('المستخدم غير موجود', 404);

  await recordAdminAudit(adminId, 'view_user_dossier', 'user', userId, DEFAULT_VIEW_REASON, {
    role: dossier.user.role,
    sessions: dossier.sessions.length,
    familyLinks: dossier.familyLinks.length,
    verifications: dossier.verifications.length,
  });

  return dossier;
};

export const removeAdminFamilyLink = async (adminId: string, linkId: string, reason: string) => {
  const link = await unlinkAdminFamilyLink(linkId);
  if (!link) throw new AppError('رابط الأسرة غير موجود', 404);
  await recordAdminAudit(adminId, 'family_link_force_removed', 'parent_child_link', linkId, reason, link);
  return link;
};

/* ------------------------------ content control ------------------------------ */

export const getContentServices = async (input: {
  page: number;
  limit: number;
  q?: string;
  status?: 'active' | 'inactive';
}) => {
  const result = await listAdminContentServices(input.page, input.limit, {
    q: input.q,
    status: input.status,
  });
  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const updateServiceByAdmin = async (
  adminId: string,
  serviceId: string,
  patch: {
    title?: string;
    description?: string;
    category?: string;
    price?: number;
    status?: 'active' | 'inactive';
    isFeatured?: boolean;
    featuredUntil?: string | null;
  },
  reason: string,
) => {
  const service = await updateAdminContentService(serviceId, patch);
  if (!service) throw new AppError('الخدمة غير موجودة', 404);

  await recordAdminAudit(adminId, 'admin_service_update', 'service', serviceId, reason, {
    fields: Object.keys(patch),
    status: service.status,
    isFeatured: service.isFeatured,
  });

  return service;
};

export const deleteServiceByAdmin = async (adminId: string, serviceId: string, reason: string) => {
  const result = await deleteAdminContentService(serviceId);
  if (result === 'has_orders') {
    throw new AppError('لا يمكن حذف خدمة مرتبطة بطلبات سابقة. استخدم خيار الإخفاء بدلاً من الحذف.', 409);
  }
  if (result !== true) throw new AppError('الخدمة غير موجودة', 404);

  await recordAdminAudit(adminId, 'admin_service_delete', 'service', serviceId, reason);
};

export const getContentPortfolio = async (input: { page: number; limit: number; q?: string }) => {
  const result = await listAdminContentPortfolio(input.page, input.limit, input.q);
  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const updatePortfolioByAdmin = async (
  adminId: string,
  itemId: string,
  patch: {
    title?: string;
    description?: string | null;
    imageUrl?: string | null;
    projectUrl?: string | null;
  },
  reason: string,
) => {
  const item = await updateAdminContentPortfolio(itemId, patch);
  if (!item) throw new AppError('المشروع غير موجود', 404);

  await recordAdminAudit(adminId, 'admin_portfolio_update', 'portfolio', itemId, reason, {
    fields: Object.keys(patch),
    userId: item.userId,
  });

  return item;
};

export const deletePortfolioByAdmin = async (adminId: string, itemId: string, reason: string) => {
  const removed = await deleteAdminContentPortfolio(itemId);
  if (!removed) throw new AppError('المشروع غير موجود', 404);

  if (removed.imageUrl) {
    await deleteLocalImage(removed.imageUrl).catch(() => undefined);
  }

  await recordAdminAudit(adminId, 'admin_portfolio_delete', 'portfolio', itemId, reason);
};

export const getContentPosts = async (input: {
  page: number;
  limit: number;
  q?: string;
  status?: 'PUBLISHED' | 'DRAFT';
}) => {
  const result = await listAdminContentPosts(input.page, input.limit, { q: input.q, status: input.status });
  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const setPostStatusByAdmin = async (
  adminId: string,
  postId: string,
  status: 'PUBLISHED' | 'DRAFT',
  reason: string,
) => {
  if (!await setAdminContentPostStatus(postId, status)) throw new AppError('المنشور غير موجود', 404);

  await recordAdminAudit(adminId, status === 'PUBLISHED' ? 'admin_post_publish' : 'admin_post_hide',
    'community_post', postId, reason, { status });
  emitRealtimeEventToAll('community');

  return { id: postId, status };
};

export const deletePostByAdmin = async (adminId: string, postId: string, reason: string) => {
  const removed = await deleteAdminContentPost(postId);
  if (!removed) throw new AppError('المنشور غير موجود', 404);

  if (removed.coverImage) {
    await deleteLocalImage(removed.coverImage).catch(() => undefined);
  }

  await recordAdminAudit(adminId, 'admin_post_delete', 'community_post', postId, reason);
  emitRealtimeEventToAll('community');
};

export const getContentComments = async (input: { page: number; limit: number; q?: string }) => {
  const result = await listAdminContentComments(input.page, input.limit, input.q);
  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const deleteCommentByAdmin = async (adminId: string, commentId: string, reason: string) => {
  const removed = await deleteAdminContentComment(commentId);
  if (!removed) throw new AppError('التعليق غير موجود', 404);

  if (removed.attachmentUrl) {
    await deleteLocalImage(removed.attachmentUrl).catch(() => undefined);
  }

  await recordAdminAudit(adminId, 'admin_comment_delete', 'comment', commentId, reason);
  emitRealtimeEventToAll('community');
};
