export type Role = 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
export type AccountStatus = 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  role: Role;
  bio: string | null;
  title: string | null;
  location: string | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  isActive: boolean;
  profileComplete: boolean;
  accountStatus: AccountStatus;
  isPrivate: boolean;
  createdAt: string;
  pointsBalance: number;
}

export interface PublicFreelancer {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  createdAt: string;
  level: FreelancerLevel;
}

export interface FreelancerLevel {
  number: 1 | 2 | 3;
  title: string;
  points: number;
  nextLevelPoints: number | null;
  progress: number;
  rewardDiscount: number;
  freeFeaturedProfile: boolean;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  authorName: string;
  authorAvatar: string | null;
  publishedAt: string;
  readTime: number;
  authorId: string | null;
}

export interface InteractionSummary {
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export type CommunityAuthorRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';
export type CommunityPostStatus = 'PUBLISHED' | 'DRAFT';
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  coverImage: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: CommunityAuthorRole;
  category: string;
  status: CommunityPostStatus;
  createdAt: string;
  viewsCount: number;
  likesCount: number;
  likedByMe?: boolean;
}

export interface CommunityPostComment {
  id: string;
  postId: string | null;
  articleId: string | null;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: Role;
  content: string;
  attachmentUrl: string | null;
  attachmentType: 'IMAGE' | 'VIDEO' | 'FILE' | null;
  createdAt: string;
}
export interface CommunityPostPayload {
  title: string;
  content: string;
  coverImage?: string | null;
  category: string;
  status: CommunityPostStatus;
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  serviceTitle: string | null;
  freelancerReply: string | null;
  repliedAt: string | null;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  projectUrl: string | null;
  createdAt: string;
}

export interface FreelancerStats {
  viewCount: number;
  reviewCount: number;
  avgRating: number;
  sellerBadge: boolean;
  fastDeliveryBadge: boolean;
}

export interface FreelancerCard {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  createdAt: string;
  avgRating: number;
  reviewCount: number;
  skills: Skill[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FreelancersResult {
  items: FreelancerCard[];
  pagination: Pagination;
}

export interface FreelancerDetail {
  freelancer: PublicFreelancer;
  skills: Skill[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  stats: FreelancerStats;
}

export type ServiceStatus = 'active' | 'inactive';
export interface ServiceMedia { url: string; type: 'image' | 'video' | 'link'; }
export interface ServiceSource { title: string; url: string; }

export interface MicroService {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatarUrl: string | null;
  title: string;
  description: string;
  category: string;
  price: number;
  avgRating: number;
  reviewCount: number;
  media: ServiceMedia[];
  sources: ServiceSource[];
  status: ServiceStatus;
  isFeatured: boolean;
  featuredUntil: string | null;
  createdAt: string;
}

export interface MicroServicePayload {
  title: string;
  description: string;
  category: string;
  price: number;
  media?: ServiceMedia[];
  sources?: ServiceSource[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  serviceId: string | null;
  content: string;
  attachment: {
    name: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
  } | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ProfileResult {
  user: PublicFreelancer;
  skills: Skill[];
  stats: FreelancerStats;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  role: Role;
  accountStatus: 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';
  title: string | null;
  bio: string | null;
  location: string | null;
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
  lastMessage: string;
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

export interface AdminReview {
  id: string;
  freelancerId: string;
  freelancerName: string;
  clientName: string;
  rating: number;
  comment: string | null;
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

export interface AdminUsersResult {
  items: AdminUser[];
  pagination: Pagination;
}

export interface AdminReportsResult {
  items: AdminUnifiedReport[];
  pagination: Pagination;
}

export interface AdminOrderDetail {
  order: AdminOrder;
  events: Array<{ id: string; actorId: string | null; actorName: string | null; eventType: string; details: string | null; createdAt: string }>;
  deliveries: Array<{ id: string; versionNumber: number; originalFilename: string; mimeType: string; fileSize: number; relativePath: string; sha256: string; freelancerNotes: string | null; createdAt: string }>;
  messages: Array<{ id: string; senderId: string; senderName: string; content: string; createdAt: string }>;
}

export interface AdminReviewsResult {
  items: AdminReview[];
  pagination: Pagination;
}

export interface AdminConversationsResult {
  items: AdminConversation[];
  pagination: Pagination;
}

export interface AdminAuditResult {
  items: AdminAuditLog[];
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

export interface AdminInspectionConversationsResult {
  items: AdminInspectionConversation[];
  pagination: Pagination;
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hasPhoto: boolean;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AdminUserDossierStats {
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
}

export interface AdminUserDossier {
  user: AdminUser;
  sessions: ActiveSession[];
  familyLinks: AdminDossierFamilyLink[];
  verifications: AdminDossierVerification[];
  stats: AdminUserDossierStats;
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

export interface AdminContentServicesResult {
  items: AdminContentService[];
  pagination: Pagination;
}

export interface AdminContentPortfolioResult {
  items: AdminContentPortfolio[];
  pagination: Pagination;
}

export interface AdminContentPostsResult {
  items: AdminContentPost[];
  pagination: Pagination;
}

export interface AdminContentCommentsResult {
  items: AdminContentComment[];
  pagination: Pagination;
}

export interface AdminContentArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  authorName: string;
  status: 'PUBLISHED' | 'HIDDEN';
  publishedAt: string;
  readTime: number;
}

export interface AdminContentArticlesResult {
  items: AdminContentArticle[];
  pagination: Pagination;
}

export interface AdminContentArticlePatch {
  title?: string;
  excerpt?: string;
  category?: string;
  coverImage?: string | null;
  status?: 'PUBLISHED' | 'HIDDEN';
}

export interface AdminSkill {
  id: string;
  name: string;
  usageCount: number;
}

export interface AdminLevelDistribution {
  level: number;
  title: string;
  minPoints: number;
  freelancers: number;
}

export interface AdminTopFreelancer {
  id: string;
  name: string;
  email: string;
  pointsBalance: number;
  level: number;
  levelTitle: string;
}

export interface AdminPointsHistoryEntry {
  id: string;
  userName: string;
  userEmail: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface AdminPointsOverview {
  freelancersCount: number;
  totalBalance: number;
  totalEarned: number;
  totalSpent: number;
  levelDistribution: AdminLevelDistribution[];
  topFreelancers: AdminTopFreelancer[];
  recentHistory: AdminPointsHistoryEntry[];
}

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface InboxNotification {
  id: string;
  type: 'NEW_MESSAGE' | 'NEW_REVIEW' | 'ACCOUNT_STATUS' | 'NEW_REPORT' | 'ADMIN_ANNOUNCEMENT' | 'NEW_POST_COMMENT' | 'NEW_POST_LIKE' | 'PARENT_LINK_REQUEST' | 'REWARD_EARNED' | 'BADGE_EARNED' | 'NEW_ORDER' | 'ORDER_UPDATE';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string | null;
  title?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  isAvailable?: boolean;
  skillIds?: string[];
}

export interface CreatePortfolioPayload {
  title: string;
  description?: string;
  imageUrl?: string;
  projectUrl?: string;
}

export interface CreateReportPayload {
  reason: string;
}

export interface SystemStatus {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceReturnsAt: string | null;
  registrationOpen: boolean;
  serverTime: string;
}

export interface SystemSettingsPayload {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceReturnsAt?: string | null;
  registrationOpen?: boolean;
  blockedTerms?: string[];
  reason: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  startedAt: string;
  now: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    peakRssMb: number;
  };
  eventLoop: { meanLagMs: number; maxLagMs: number };
  database: { latencyMs: number; sizeMb: number; users: number; sessions: number };
  latency: { samples: number; avgMs: number; p50Ms: number; p95Ms: number; maxMs: number };
  traffic: {
    windowSize: number;
    requests: number;
    statusCounts: { twoXx: number; threeXx: number; fourXx: number; fiveXx: number };
    errors: number;
    topRoutes: Array<{ route: string; count: number; avgMs: number }>;
  };
  routes: Array<{ method: string; path: string; count: number; avgMs: number; maxMs: number }>;
  security: {
    blockedIps: number;
    liveSessions: number;
    anonymousSessions: number;
    revokedSessions: number;
    pendingFlags: number;
  };
}

export interface ActiveSession {
  id: number;
  userId: string | null;
  name: string | null;
  email: string | null;
  role: Role | null;
  ip: string;
  userAgent: string;
  device: string;
  firstSeen: string;
  lastSeen: string;
  routeCount: number;
  revokedAt: string | null;
}

export interface SessionsResult {
  items: ActiveSession[];
  pagination: Pagination;
}

export interface IpBlock {
  ip: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  createdByName: string | null;
}

export type ModerationSeverity = 'low' | 'medium' | 'high';

export interface ModerationFlag {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  field: string;
  rule: string;
  severity: ModerationSeverity;
  excerpt: string;
  suggestion: string | null;
  status: 'Pending' | 'Resolved' | 'Dismissed';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ModerationResult {
  items: ModerationFlag[];
  pagination: Pagination;
}

export interface ModerationScanResult {
  scanned: number;
  flagged: number;
  skipped: number;
}

export interface AdminUserPatch {
  name?: string;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  avgResponseHours?: number | null;
  isAvailable?: boolean;
}
