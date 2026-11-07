import type { Pagination, Skill } from './freelancer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
  accountStatus: 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';
  title: string | null;
  bio: string | null;
  location: string | null;
  minBudget: number | null;
  hourlyRate: number | null;
  avatarUrl: string | null;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  featuredUntil: string | null;
  avgResponseHours: number | null;
  createdAt: string;
  avgRating: number;
  reviewCount: number;
  pendingFlags: number;
}

export interface AdminReport {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  reason: string;
  status: 'Pending' | 'Resolved';
  createdAt: string;
}

export interface AdminUnifiedReport {
  id: string;
  kind: 'account' | 'content';
  reporterName: string | null;
  reporterEmail: string | null;
  targetId: string;
  targetName: string;
  targetEmail: string;
  targetRole: string;
  category: string;
  description: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  adminActionNotes: string | null;
  actionType: string | null;
  proofFiles: Array<{ id: string; name: string; mimeType: string; size: number; storageKey: string }>;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  freelancerId: string;
  freelancerName: string;
  clientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface AdminConversation {
  participantAId: string;
  participantAName: string;
  participantAEmail: string;
  participantAAvatarUrl: string | null;
  participantBId: string;
  participantBName: string;
  participantBEmail: string;
  participantBAvatarUrl: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  lastMessageAt: string;
  messageCount: number;
}

export interface AdminConversationMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  attachment: { name: string; mimeType: string; size: number } | null;
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  adminName: string | null;
  action: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminStats {
  freelancers: number;
  activeFreelancers: number;
  featuredFreelancers: number;
  verifiedFreelancers: number;
  reviews: number;
  pendingReports: number;
  pendingFlags: number;
  blockedIps: number;
  liveSessions: number;
  profileViews: number;
  topSkills: Array<Skill & { freelancers: number }>;
}

export interface AdminOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'REVISION_REQUESTED' | 'AWAITING_REVIEW' | 'COMPLETED' | 'CANCELLED';
  priceAmount: number;
  deliveryVersion: number;
  revisionNotes: string | null;
  revisionsUsed: number;
  revisionLimit: number;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
}

export interface AdminOrdersResult {
  items: AdminOrder[];
  pagination: Pagination;
}

export interface AdminOrderDetail {
  order: AdminOrder;
  events: Array<{ id: string; actorId: string | null; actorName: string | null; eventType: string; details: string | null; createdAt: string }>;
  deliveries: Array<{ id: string; versionNumber: number; originalFilename: string; mimeType: string; fileSize: number; relativePath: string; sha256: string; freelancerNotes: string | null; createdAt: string }>;
  messages: Array<{ id: string; senderId: string; senderName: string; content: string; createdAt: string }>;
}

export interface AdminUsersResult {
  items: AdminUser[];
  pagination: Pagination;
}

export interface AdminReportsResult {
  items: AdminReport[];
  pagination: Pagination;
}

export interface AdminReviewsResult {
  items: AdminReview[];
  pagination: Pagination;
}

export interface AdminInspectionParticipant {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface AdminInspectionConversation {
  id: string;
  kind: 'direct' | 'order';
  participantA: AdminInspectionParticipant;
  participantB: AdminInspectionParticipant;
  serviceId: string | null;
  serviceTitle: string | null;
  orderId: string | null;
  orderStatus: AdminOrder['status'] | null;
  messageCount: number;
  attachmentCount: number;
  lastMessage: string;
  lastMessageAt: string;
}

export interface AdminInspectionAttachment {
  messageId: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface AdminInspectionMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string | null;
  receiverName: string | null;
  content: string;
  createdAt: string;
  attachment: AdminInspectionAttachment | null;
}

export interface AdminInspectionTranscript {
  conversation: AdminInspectionConversation;
  items: AdminInspectionMessage[];
}

export interface AdminVaultFile {
  id: string;
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  relativePath: string;
  sha256: string;
  freelancerNotes: string | null;
  createdAt: string;
  previewable: boolean;
}

export interface AdminOrderReview {
  id: string;
  clientName: string;
  rating: number;
  comment: string | null;
  freelancerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface AdminOrderFullTranscript extends AdminOrderDetail {
  vaultFiles: AdminVaultFile[];
  review: AdminOrderReview | null;
}

export interface AdminDossierSession {
  id: number;
  ip: string;
  userAgent: string;
  device: string;
  firstSeen: string;
  lastSeen: string;
  routeCount: number;
  revokedAt: string | null;
}

export interface AdminDossierFamilyLink {
  id: string;
  relation: 'parent' | 'child';
  counterpartId: string;
  counterpartName: string;
  counterpartEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  chatAccessEnabled: boolean;
  createdAt: string;
  respondedAt: string | null;
}

export interface AdminDossierVerification {
  id: string;
  childId: string;
  childName: string;
  parentEmail: string | null;
  parentPhone: string;
  status: string;
  hasPhoto: boolean;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AdminUserDossier {
  user: AdminUser;
  sessions: AdminDossierSession[];
  familyLinks: AdminDossierFamilyLink[];
  verifications: AdminDossierVerification[];
  stats: {
    ordersAsBuyer: number;
    ordersAsFreelancer: number;
    completedOrders: number;
    services: number;
    activeServices: number;
    portfolio: number;
    posts: number;
    comments: number;
    reviewsReceived: number;
    messagesSent: number;
    pointsBalance: number;
    pendingFlags: number;
  };
}

export interface AdminContentService {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  title: string;
  description: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  featuredUntil: string | null;
  orderCount: number;
  createdAt: string;
}

export interface AdminContentPortfolio {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  projectUrl: string | null;
  createdAt: string;
}

export interface AdminContentPost {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'PUBLISHED' | 'DRAFT';
  authorId: string;
  authorName: string;
  authorEmail: string;
  viewsCount: number;
  likesCount: number;
  commentCount: number;
  createdAt: string;
}

export interface AdminContentComment {
  id: string;
  postId: string | null;
  articleId: string | null;
  postTitle: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  attachmentUrl: string | null;
  attachmentType: 'IMAGE' | 'VIDEO' | 'FILE' | null;
  createdAt: string;
}
