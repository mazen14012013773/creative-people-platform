import type {
  AdminContentArticle,
  AdminContentArticlesResult,
  AdminContentArticlePatch,
  AdminContentCommentsResult,
  AdminContentPortfolio,
  AdminContentPortfolioResult,
  AdminContentPost,
  AdminContentPostsResult,
  AdminContentService,
  AdminContentServicesResult,
  AdminInspectionConversationsResult,
  AdminInspectionTranscript,
  AdminOrder,
  AdminOrderDetail,
  AdminOrderFullTranscript,
  AdminOrdersResult,
  AdminPointsOverview,
  AdminReportsResult,
  AdminReviewsResult,
  AdminAuditResult,
  AdminSkill,
  AdminStats,
  AdminUser,
  AdminUserDossier,
  AdminUserPatch,
  AdminUsersResult,
  AdminVaultFile,
  Pagination,
  Role,
  SiteNotification,
} from '@/types';
import { api, unwrap } from './api';

export interface AdminUsersParams {
  q?: string;
  role?: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
  status?: 'active' | 'inactive';
  featured?: boolean;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminReportsParams {
  status?: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  page?: number;
  limit?: number;
}

export interface AdminAuditParams {
  page?: number;
  limit?: number;
  adminId?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface AdminSiteNotificationsResult {
  items: SiteNotification[];
  pagination: Pagination;
}

export interface AdminReviewsParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrdersParams {
  q?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'REVISION_REQUESTED' | 'AWAITING_REVIEW' | 'COMPLETED' | 'CANCELLED';
  page?: number;
  limit?: number;
}

export interface AdminInspectionParams {
  q?: string;
  kind?: 'direct' | 'order';
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminContentServicesParams {
  q?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface AdminContentListParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminContentPostsParams extends AdminContentListParams {
  status?: 'PUBLISHED' | 'DRAFT';
}

export interface AdminContentArticlesParams extends AdminContentListParams {
  status?: 'PUBLISHED' | 'HIDDEN';
}

export interface AdminContentServicePatch {
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  status?: 'active' | 'inactive';
  isFeatured?: boolean;
  featuredUntil?: string | null;
}

export interface AdminContentPortfolioPatch {
  title?: string;
  description?: string | null;
  imageUrl?: string | null;
  projectUrl?: string | null;
}

const blobFrom = async (request: Promise<{ data: Blob }>): Promise<Blob> => (await request).data;

export const adminApi = {
  stats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return unwrap<AdminStats>(response);
  },

  orders: async (params: AdminOrdersParams): Promise<AdminOrdersResult> => {
    const response = await api.get('/admin/orders', { params });
    return unwrap<AdminOrdersResult>(response);
  },

  orderDetail: async (orderId: string): Promise<AdminOrderDetail> => {
    const response = await api.get(`/admin/orders/${orderId}`);
    return unwrap<AdminOrderDetail>(response);
  },

  forceOrderAction: async (
    orderId: string,
    action: 'CANCEL' | 'CLOSE',
    reason: string,
    grantCompletionPoints: boolean,
  ): Promise<AdminOrder> => {
    const response = await api.post(`/admin/orders/${orderId}/force-action`, {
      action,
      reason,
      grantCompletionPoints,
    });
    return unwrap<{ order: AdminOrder }>(response).order;
  },

  allConversations: async (params: AdminInspectionParams): Promise<AdminInspectionConversationsResult> => {
    const response = await api.get('/admin/chat/all-conversations', { params });
    return unwrap<AdminInspectionConversationsResult>(response);
  },

  conversationTranscript: async (
    conversationId: string,
    reason: string,
  ): Promise<AdminInspectionTranscript> => {
    const response = await api.get(
      `/admin/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      { params: { reason } },
    );
    return unwrap<AdminInspectionTranscript>(response);
  },

  chatAttachment: async (messageId: string, reason: string, download = false): Promise<Blob> => {
    return blobFrom(
      api.get(`/admin/chat/attachments/${messageId}`, {
        params: { reason, download: download ? 'true' : undefined },
        responseType: 'blob',
      }),
    );
  },

  orderVaultFiles: async (orderId: string, reason?: string): Promise<AdminVaultFile[]> => {
    const response = await api.get(`/admin/orders/${orderId}/vault-files`, {
      params: { reason },
    });
    return unwrap<{ items: AdminVaultFile[] }>(response).items;
  },

  orderVaultFile: async (
    orderId: string,
    deliveryId: string,
    reason: string,
    download = false,
  ): Promise<Blob> => {
    return blobFrom(
      api.get(`/admin/orders/${orderId}/vault-files/${deliveryId}`, {
        params: { reason, download: download ? 'true' : undefined },
        responseType: 'blob',
      }),
    );
  },

  orderFullTranscript: async (orderId: string, reason: string): Promise<AdminOrderFullTranscript> => {
    const response = await api.get(`/admin/orders/${orderId}/full-transcript`, {
      params: { reason },
    });
    return unwrap<AdminOrderFullTranscript>(response);
  },

  userDossier: async (userId: string): Promise<AdminUserDossier> => {
    const response = await api.get(`/admin/users/${userId}/dossier`);
    return unwrap<AdminUserDossier>(response);
  },

  removeFamilyLink: async (linkId: string, reason: string): Promise<void> => {
    await api.delete(`/admin/family-links/${linkId}`, { data: { reason } });
  },

  impersonateUser: async (userId: string): Promise<{ token: string; user: { id: string; name: string; role: Role } }> => {
    const response = await api.post(`/admin/users/${userId}/impersonate`, {});
    return unwrap<{ token: string; user: { id: string; name: string; role: Role } }>(response);
  },

  contentServices: async (params: AdminContentServicesParams): Promise<AdminContentServicesResult> => {
    const response = await api.get('/admin/content/services', { params });
    return unwrap<AdminContentServicesResult>(response);
  },

  updateContentService: async (
    id: string,
    patch: AdminContentServicePatch,
    reason: string,
  ): Promise<AdminContentService> => {
    const response = await api.patch(`/admin/content/services/${id}`, { ...patch, reason });
    return unwrap<{ service: AdminContentService }>(response).service;
  },

  deleteContentService: async (id: string, reason: string): Promise<void> => {
    await api.delete(`/admin/content/services/${id}`, { data: { reason } });
  },

  contentPortfolio: async (params: AdminContentListParams): Promise<AdminContentPortfolioResult> => {
    const response = await api.get('/admin/content/portfolio', { params });
    return unwrap<AdminContentPortfolioResult>(response);
  },

  updateContentPortfolio: async (
    id: string,
    patch: AdminContentPortfolioPatch,
    reason: string,
  ): Promise<AdminContentPortfolio> => {
    const response = await api.patch(`/admin/content/portfolio/${id}`, { ...patch, reason });
    return unwrap<{ item: AdminContentPortfolio }>(response).item;
  },

  deleteContentPortfolio: async (id: string, reason: string): Promise<void> => {
    await api.delete(`/admin/content/portfolio/${id}`, { data: { reason } });
  },

  contentPosts: async (params: AdminContentPostsParams): Promise<AdminContentPostsResult> => {
    const response = await api.get('/admin/content/posts', { params });
    return unwrap<AdminContentPostsResult>(response);
  },

  setContentPostStatus: async (
    id: string,
    status: 'PUBLISHED' | 'DRAFT',
    reason: string,
  ): Promise<AdminContentPost> => {
    const response = await api.patch(`/admin/content/posts/${id}`, { status, reason });
    return unwrap<{ post: AdminContentPost }>(response).post;
  },

  deleteContentPost: async (id: string, reason: string): Promise<void> => {
    await api.delete(`/admin/content/posts/${id}`, { data: { reason } });
  },

  contentComments: async (params: AdminContentListParams): Promise<AdminContentCommentsResult> => {
    const response = await api.get('/admin/content/comments', { params });
    return unwrap<AdminContentCommentsResult>(response);
  },

  deleteContentComment: async (id: string, reason: string): Promise<void> => {
    await api.delete(`/admin/content/comments/${id}`, { data: { reason } });
  },

  auditLogs: async (params: AdminAuditParams): Promise<AdminAuditResult> => {
    const response = await api.get('/admin/audit-logs', { params });
    return unwrap<AdminAuditResult>(response);
  },

  users: async (params: AdminUsersParams): Promise<AdminUsersResult> => {
    const response = await api.get('/admin/users', { params });
    return unwrap<AdminUsersResult>(response);
  },

  setUserStatus: async (userId: string, isActive: boolean, reason: string, expectedIsActive?: boolean): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive, reason, expectedIsActive });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserRole: async (userId: string, role: Role, reason: string): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role, reason });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserFeatured: async (
    userId: string,
    isFeatured: boolean,
    reason: string,
    featuredUntil?: string | null,
  ): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/featured`, {
      isFeatured,
      featuredUntil: featuredUntil ?? null,
      reason,
    });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserVerified: async (userId: string, isVerified: boolean, reason: string): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/verified`, { isVerified, reason });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  manageUser: async (userId: string, payload: AdminUserPatch, reason: string): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}`, { ...payload, reason });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserPassword: async (userId: string, password: string, reason: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/password`, { password, reason });
  },

  deleteUser: async (userId: string, reason: string): Promise<{ archived: boolean }> => {
    const response = await api.delete<{ success: boolean; data: { archived: boolean } }>(
      `/admin/users/${userId}`,
      { data: { reason } },
    );
    return response.data.data;
  },

  reports: async (params: AdminReportsParams): Promise<AdminReportsResult> => {
    const response = await api.get('/admin/reports', { params });
    return unwrap<AdminReportsResult>(response);
  },

  resolveAccountReport: async (
    id: string,
    action: 'TEMP_BLOCK' | 'PERMANENT_BLOCK' | 'WARNING' | 'DISMISS',
    notes: string,
  ) => {
    const response = await api.patch(`/admin/reports/${id}/action`, { action, notes });
    return unwrap<{ report: { id: string; status: string; action: string } }>(response).report;
  },

  accountReportEvidence: async (id: string, evidenceId: string): Promise<Blob> => {
    const response = await api.get(`/admin/reports/${id}/evidence/${evidenceId}`, { responseType: 'blob' });
    return response.data as Blob;
  },

  setReportStatus: async (
    reportId: string,
    status: 'Pending' | 'Resolved' | 'Dismissed',
    reason: string,
  ): Promise<void> => {
    await api.patch(`/admin/content-reports/${reportId}`, { status, reason });
  },

  reviews: async (params: AdminReviewsParams): Promise<AdminReviewsResult> => {
    const response = await api.get('/admin/reviews', { params });
    return unwrap<AdminReviewsResult>(response);
  },

  deleteReview: async (reviewId: string, reason: string): Promise<void> => {
    await api.delete(`/admin/reviews/${reviewId}`, { data: { reason } });
  },

  notifications: async (params: { page?: number; limit?: number }): Promise<AdminSiteNotificationsResult> => {
    const response = await api.get('/admin/notifications', { params });
    return unwrap<AdminSiteNotificationsResult>(response);
  },

  createNotification: async (payload: { title: string; message: string; reason: string }): Promise<SiteNotification> => {
    const response = await api.post('/admin/notifications', payload);
    return unwrap<{ notification: SiteNotification }>(response).notification;
  },

  setNotificationActive: async (id: string, isActive: boolean, reason: string): Promise<SiteNotification> => {
    const response = await api.patch(`/admin/notifications/${id}`, { isActive, reason });
    return unwrap<{ notification: SiteNotification }>(response).notification;
  },

  contentArticles: async (params: AdminContentArticlesParams): Promise<AdminContentArticlesResult> => {
    const response = await api.get('/admin/content/articles', { params });
    return unwrap<AdminContentArticlesResult>(response);
  },

  updateContentArticle: async (
    id: string,
    patch: AdminContentArticlePatch,
    reason: string,
  ): Promise<AdminContentArticle> => {
    const response = await api.patch(`/admin/content/articles/${id}`, { ...patch, reason });
    return unwrap<{ article: AdminContentArticle }>(response).article;
  },

  deleteContentArticle: async (id: string, reason: string): Promise<void> => {
    await api.delete(`/admin/content/articles/${id}`, { data: { reason } });
  },

  skills: async (): Promise<AdminSkill[]> => {
    const response = await api.get('/admin/skills');
    return unwrap<{ items: AdminSkill[] }>(response).items;
  },

  createSkill: async (name: string, reason: string): Promise<AdminSkill> => {
    const response = await api.post('/admin/skills', { name, reason });
    return unwrap<{ skill: AdminSkill }>(response).skill;
  },

  updateSkill: async (id: string, name: string, reason: string): Promise<AdminSkill> => {
    const response = await api.patch(`/admin/skills/${id}`, { name, reason });
    return unwrap<{ skill: AdminSkill }>(response).skill;
  },

  deleteSkill: async (id: string, reason: string): Promise<void> => {
    await api.delete(`/admin/skills/${id}`, { data: { reason } });
  },

  pointsOverview: async (): Promise<AdminPointsOverview> => {
    const response = await api.get('/admin/points');
    return unwrap<AdminPointsOverview>(response);
  },
};
