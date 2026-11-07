import { randomUUID } from 'node:crypto';
import { query } from '../config/db';
import type { ChatConversation, ChatMessage } from '../types/chat';

interface MessageRow {
  id: string; sender_id: string; receiver_id: string; service_id: string | null; content: string;
  attachment_storage_key: string | null; attachment_name: string | null; attachment_mime: string | null;
  attachment_size: number | null; is_read: boolean | number; created_at: string;
}

const mapMessage = (row: MessageRow): ChatMessage => ({
  id: row.id, senderId: row.sender_id, receiverId: row.receiver_id, serviceId: row.service_id,
  content: row.content,
  attachment: row.attachment_storage_key && row.attachment_name && row.attachment_mime
    ? { name: decodeStoredFilename(row.attachment_name), mimeType: row.attachment_mime, size: Number(row.attachment_size ?? 0), downloadUrl: `/chat/messages/${row.id}/attachment` }
    : null,
  isRead: Boolean(row.is_read), createdAt: row.created_at,
});

const decodeStoredFilename = (value: string): string => {
  if (!/[ÃƒÃ‚Ã˜Ã™]/.test(value)) return value;
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? value : decoded;
};

export const listConversations = async (userId: string): Promise<ChatConversation[]> => {
  const { rows } = await query(`
    WITH grouped AS (
      SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS peer_id,
             service_id, MAX(created_at) AS last_message_at
      FROM messages WHERE sender_id = $2 OR receiver_id = $3 GROUP BY peer_id, service_id
    )
    SELECT g.peer_id, u.name, u.avatar_url, g.service_id, s.title AS service_title,
      (SELECT content FROM messages m WHERE ((m.sender_id = $4 AND m.receiver_id = g.peer_id)
        OR (m.sender_id = g.peer_id AND m.receiver_id = $5))
        AND m.service_id IS NOT DISTINCT FROM g.service_id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
      g.last_message_at,
      (SELECT COUNT(*) FROM messages m WHERE m.sender_id = g.peer_id AND m.receiver_id = $6
        AND m.service_id IS NOT DISTINCT FROM g.service_id AND m.is_read = false) AS unread_count
    FROM grouped g JOIN users u ON u.id = g.peer_id LEFT JOIN services s ON s.id = g.service_id
    WHERE u.is_active = 1 ORDER BY g.last_message_at DESC LIMIT 100`,
  [userId, userId, userId, userId, userId, userId]);
  return rows.map((row) => ({ userId: row.peer_id, name: row.name, avatarUrl: row.avatar_url,
    serviceId: row.service_id, serviceTitle: row.service_title, lastMessage: row.last_message,
    lastMessageAt: row.last_message_at, unreadCount: Number(row.unread_count) }));
};

export const listMessages = async (userId: string, peerId: string, serviceId: string | null): Promise<ChatMessage[]> => {
  await query(`UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2
    AND service_id IS NOT DISTINCT FROM $3 AND is_read = false`, [peerId, userId, serviceId]);
  const { rows } = await query(`SELECT id, sender_id, receiver_id, service_id, content, is_read, created_at,
    attachment_storage_key, attachment_name, attachment_mime, attachment_size FROM messages
    WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))
      AND service_id IS NOT DISTINCT FROM $5 ORDER BY created_at ASC, id ASC LIMIT 500`,
  [userId, peerId, peerId, userId, serviceId]);
  return (rows as MessageRow[]).map(mapMessage);
};

export const insertMessage = async (input: { senderId: string; receiverId: string; serviceId: string | null; content: string;
  attachment?: { storageKey: string; name: string; mimeType: string; size: number } }): Promise<ChatMessage> => {
  const { rows } = await query(`INSERT INTO messages
    (id, sender_id, receiver_id, service_id, content, attachment_storage_key, attachment_name, attachment_mime, attachment_size)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id, sender_id, receiver_id, service_id, content, is_read, created_at, attachment_storage_key, attachment_name, attachment_mime, attachment_size`,
  [randomUUID(), input.senderId, input.receiverId, input.serviceId, input.content, input.attachment?.storageKey ?? null,
    input.attachment?.name ?? null, input.attachment?.mimeType ?? null, input.attachment?.size ?? null]);
  if (!rows[0]) throw new Error('Failed to create message');
  return mapMessage(rows[0] as MessageRow);
};

export const findAttachmentForParticipant = async (messageId: string, userId: string) => {
  const { rows } = await query(`SELECT attachment_storage_key, attachment_name, attachment_mime FROM messages
    WHERE id = $1 AND (sender_id = $2 OR receiver_id = $3) AND attachment_storage_key IS NOT NULL LIMIT 1`,
  [messageId, userId, userId]);
  const row = rows[0] as { attachment_storage_key: string; attachment_name: string; attachment_mime: string } | undefined;
  return row ? { ...row, attachment_name: decodeStoredFilename(row.attachment_name) } : undefined;
};
