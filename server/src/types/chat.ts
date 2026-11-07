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
