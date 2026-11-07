export const INBOX_NOTIFICATION_TYPES = [
  'NEW_MESSAGE',
  'NEW_REVIEW',
  'ACCOUNT_STATUS',
  'NEW_REPORT',
  'ADMIN_ANNOUNCEMENT',
  'NEW_POST_COMMENT',
  'NEW_POST_LIKE',
  'PARENT_LINK_REQUEST',
  'REWARD_EARNED',
  'BADGE_EARNED',
  'NEW_ORDER',
  'ORDER_UPDATE',
] as const;

export type InboxNotificationType = (typeof INBOX_NOTIFICATION_TYPES)[number];

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}
