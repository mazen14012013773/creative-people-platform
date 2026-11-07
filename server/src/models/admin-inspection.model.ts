import { query } from '../config/db';
import { getAdminOrderDetail, getAdminUserById } from './admin.model';
import { listSessions } from './system.model';
import type {
  AdminContentComment,
  AdminContentPortfolio,
  AdminContentPost,
  AdminContentService,
  AdminDossierFamilyLink,
  AdminDossierSession,
  AdminDossierVerification,
  AdminInspectionConversation,
  AdminInspectionMessage,
  AdminInspectionTranscript,
  AdminOrderFullTranscript,
  AdminOrderReview,
  AdminUserDossier,
  AdminVaultFile,
} from '../types/admin';

const bindSql = (sql: string): string => { let i = 0; return sql.replace(/(?<!\?)\?(?!\?)/g, () => `$${++i}`); };
const selectOne = async <T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> => (await query(bindSql(sql), params)).rows[0] as T | undefined;
const selectMany = async <T = any>(sql: string, params: unknown[] = []): Promise<T[]> => (await query(bindSql(sql), params)).rows as T[];
const execute = async (sql: string, params: unknown[] = []) => query(bindSql(sql), params);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminConversationKey =
  | { kind: 'direct'; aId: string; bId: string; serviceId: string | null }
  | { kind: 'order'; orderId: string };

export const buildConversationId = (key: AdminConversationKey): string =>
  Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');

export const parseConversationId = (value: string): AdminConversationKey | null => {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;

    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;

    if (record.kind === 'order') {
      const orderId = typeof record.orderId === 'string' ? record.orderId : '';
      return UUID_PATTERN.test(orderId) ? { kind: 'order', orderId } : null;
    }

    if (record.kind === 'direct') {
      const aId = typeof record.aId === 'string' ? record.aId : '';
      const bId = typeof record.bId === 'string' ? record.bId : '';
      if (!UUID_PATTERN.test(aId) || !UUID_PATTERN.test(bId) || aId === bId) return null;
      const serviceId = typeof record.serviceId === 'string' && record.serviceId ? record.serviceId : null;
      if (serviceId && !UUID_PATTERN.test(serviceId)) return null;
      return aId < bId
        ? { kind: 'direct', aId, bId, serviceId }
        : { kind: 'direct', aId: bId, bId: aId, serviceId };
    }

    return null;
  } catch {
    return null;
  }
};

interface AdminConversationRow {
  kind: 'direct' | 'order';
  a_id: string;
  a_name: string;
  a_email: string;
  a_avatar: string | null;
  a_role: string;
  b_id: string;
  b_name: string;
  b_email: string;
  b_avatar: string | null;
  b_role: string;
  service_id: string | null;
  service_title: string | null;
  order_id: string | null;
  order_status: AdminInspectionConversation['orderStatus'];
  message_count: number;
  attachment_count: number;
  last_message: string;
  last_message_at: string;
}

const mapConversation = (row: AdminConversationRow)=> ({
  id: row.kind === 'direct'
    ? buildConversationId({ kind: 'direct', aId: row.a_id, bId: row.b_id, serviceId: row.service_id })
    : buildConversationId({ kind: 'order', orderId: row.order_id ?? '' }),
  kind: row.kind,
  participantA: {
    id: row.a_id,
    name: row.a_name,
    email: row.a_email,
    avatarUrl: row.a_avatar,
    role: row.a_role,
  },
  participantB: {
    id: row.b_id,
    name: row.b_name,
    email: row.b_email,
    avatarUrl: row.b_avatar,
    role: row.b_role,
  },
  serviceId: row.service_id,
  serviceTitle: row.service_title,
  orderId: row.order_id,
  orderStatus: row.order_status,
  messageCount: Number(row.message_count ?? 0),
  attachmentCount: Number(row.attachment_count ?? 0),
  lastMessage: row.last_message ?? '',
  lastMessageAt: row.last_message_at,
});

export interface AdminAllConversationsFilters {
  page: number;
  limit: number;
  q?: string;
  kind?: 'direct' | 'order';
  userId?: string;
  from?: string | null;
  to?: string | null;
}

const buildDirectBlock = (
  filters: AdminAllConversationsFilters,
)=> {
  const params: unknown[] = [];
  const dateClauses: string[] = [];

  if (filters.from) {
    dateClauses.push('created_at >= ?');
    params.push(filters.from);
  }

  if (filters.to) {
    dateClauses.push('created_at <= ?');
    params.push(filters.to);
  }

  const whereClauses: string[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    whereClauses.push('(a.name LIKE ? OR a.email LIKE ? OR b.name LIKE ? OR b.email LIKE ? OR s.title LIKE ?)');
    params.push(like, like, like, like, like);
  }

  if (filters.userId) {
    whereClauses.push('(g.a_id = ? OR g.b_id = ?)');
    params.push(filters.userId, filters.userId);
  }

  const sql = `
    SELECT 'direct' AS kind, g.a_id, a.name AS a_name, a.email AS a_email,
      a.avatar_url AS a_avatar, a.role AS a_role,
      g.b_id, b.name AS b_name, b.email AS b_email,
      b.avatar_url AS b_avatar, b.role AS b_role,
      g.service_id, s.title AS service_title, NULL AS order_id, NULL AS order_status,
      g.message_count, g.attachment_count, g.last_message_at,
      (SELECT f.content FROM filtered f
        WHERE f.a_id = g.a_id AND f.b_id = g.b_id AND f.service_id IS g.service_id
        ORDER BY f.created_at DESC LIMIT 1) AS last_message
    FROM grouped g
    JOIN users a ON a.id = g.a_id
    JOIN users b ON b.id = g.b_id
    LEFT JOIN services s ON s.id = g.service_id
    ${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
  `;

  return {
    sql: `${directCte(dateClauses)} ${sql}`,
    params,
  };
};

const directCte = (dateClauses: string[])=> `
  WITH filtered AS (
    SELECT CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END AS a_id,
      CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END AS b_id,
      service_id, content, created_at,
      CASE WHEN attachment_storage_key IS NOT NULL THEN 1 ELSE 0 END AS has_attachment
    FROM messages
    ${dateClauses.length ? `WHERE ${dateClauses.join(' AND ')}` : ''}
  ), grouped AS (
    SELECT a_id, b_id, service_id, COUNT(*) AS message_count,
      SUM(has_attachment) AS attachment_count, MAX(created_at) AS last_message_at
    FROM filtered GROUP BY a_id, b_id, service_id
  )
`;

const buildOrderBlock = (
  filters: AdminAllConversationsFilters,
)=> {
  const params: unknown[] = [];
  const dateClauses: string[] = [];

  if (filters.from) {
    dateClauses.push('created_at >= ?');
    params.push(filters.from);
  }

  if (filters.to) {
    dateClauses.push('created_at <= ?');
    params.push(filters.to);
  }

  const whereClauses: string[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    whereClauses.push('(o.service_title LIKE ? OR o.id LIKE ? OR b.name LIKE ? OR b.email LIKE ? OR f.name LIKE ? OR f.email LIKE ?)');
    params.push(like, like, like, like, like, like);
  }

  if (filters.userId) {
    whereClauses.push('(o.buyer_id = ? OR o.freelancer_id = ?)');
    params.push(filters.userId, filters.userId);
  }

  const sql = `
    SELECT 'order' AS kind, o.buyer_id AS a_id, b.name AS a_name, b.email AS a_email,
      b.avatar_url AS a_avatar, b.role AS a_role,
      o.freelancer_id AS b_id, f.name AS b_name, f.email AS b_email,
      f.avatar_url AS b_avatar, f.role AS b_role,
      o.service_id, o.service_title, o.id AS order_id, o.status AS order_status,
      g.message_count, 0 AS attachment_count, g.last_message_at,
      (SELECT fm.content FROM filtered fm WHERE fm.order_id = g.order_id
        ORDER BY fm.created_at DESC LIMIT 1) AS last_message
    FROM grouped g
    JOIN orders o ON o.id = g.order_id
    JOIN users b ON b.id = o.buyer_id
    JOIN users f ON f.id = o.freelancer_id
    ${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
  `;

  return {
    sql: `${orderCte(dateClauses)} ${sql}`,
    params,
  };
};

const orderCte = (dateClauses: string[])=> `
  WITH filtered AS (
    SELECT order_id, content, created_at FROM order_messages
    ${dateClauses.length ? `WHERE ${dateClauses.join(' AND ')}` : ''}
  ), grouped AS (
    SELECT order_id, COUNT(*) AS message_count, MAX(created_at) AS last_message_at
    FROM filtered GROUP BY order_id
  )
`;

export const listAdminInspectionConversations = async (
  filters: AdminAllConversationsFilters,
) => {
  const blocks: Array<{ sql: string; params: unknown[] }> = [];

  if (!filters.kind || filters.kind === 'direct') blocks.push(buildDirectBlock(filters));
  if (!filters.kind || filters.kind === 'order') blocks.push(buildOrderBlock(filters));

  if (blocks.length === 0) return { items: [], total: 0 };

  // SQLite rejects `UNION ALL WITH ...`; each block must become its own subquery.
  const unionSql = blocks.map((block) => `SELECT * FROM (${block.sql})`).join(' UNION ALL ');
  const params = blocks.flatMap((block) => block.params);

  const countRow = await selectOne(`SELECT COUNT(*) AS total FROM (${unionSql})`, [...params]) as { total: number } | undefined;

  const rows = await selectMany(`SELECT * FROM (${unionSql}) ORDER BY last_message_at DESC LIMIT ? OFFSET ?`, [...params, filters.limit, (filters.page - 1) * filters.limit]) as unknown as AdminConversationRow[];

  return {
    items: rows.map(mapConversation),
    total: Number(countRow?.total ?? 0),
  };
};

interface TranscriptMessageRow {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string | null;
  receiver_name: string | null;
  content: string;
  created_at: string;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

const mapTranscriptMessage = (row: TranscriptMessageRow)=> ({
  id: row.id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  receiverId: row.receiver_id,
  receiverName: row.receiver_name,
  content: row.content,
  createdAt: row.created_at,
  attachment: row.attachment_name && row.attachment_mime
    ? {
        messageId: row.id,
        name: row.attachment_name,
        mimeType: row.attachment_mime,
        size: Number(row.attachment_size ?? 0),
      }
    : null,
});

const findDirectConversation = async (
  aId: string,
  bId: string,
  serviceId: string | null,
) => {
  const row = await selectOne(`
    SELECT 'direct' AS kind, a.id AS a_id, a.name AS a_name, a.email AS a_email,
      a.avatar_url AS a_avatar, a.role AS a_role,
      b.id AS b_id, b.name AS b_name, b.email AS b_email,
      b.avatar_url AS b_avatar, b.role AS b_role,
      s.id AS service_id, s.title AS service_title, NULL AS order_id, NULL AS order_status,
      (SELECT COUNT(*) FROM messages m
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
          AND m.service_id IS ?) AS message_count,
      (SELECT COUNT(*) FROM messages m
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
          AND m.service_id IS ? AND m.attachment_storage_key IS NOT NULL) AS attachment_count,
      (SELECT COALESCE((SELECT content FROM messages m
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
          AND m.service_id IS ? ORDER BY m.created_at DESC LIMIT 1), '')) AS last_message,
      (SELECT COALESCE((SELECT created_at FROM messages m
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
          AND m.service_id IS ? ORDER BY m.created_at DESC LIMIT 1), '')) AS last_message_at
    FROM users a
    JOIN users b ON b.id = ?
    LEFT JOIN services s ON s.id = ?
    WHERE a.id = ?
  `, [aId, bId, bId, aId, serviceId, aId, bId, bId, aId, serviceId, aId, bId, bId, aId, serviceId, aId, bId, bId, aId, serviceId, bId, serviceId, aId]) as AdminConversationRow | undefined;

  if (!row || Number(row.message_count) === 0) return null;
  return mapConversation(row);
};

const findOrderConversation = async (orderId: string) => {
  const row = await selectOne(`
    SELECT 'order' AS kind, o.buyer_id AS a_id, b.name AS a_name, b.email AS a_email,
      b.avatar_url AS a_avatar, b.role AS a_role,
      o.freelancer_id AS b_id, f.name AS b_name, f.email AS b_email,
      f.avatar_url AS b_avatar, f.role AS b_role,
      o.service_id, o.service_title, o.id AS order_id, o.status AS order_status,
      (SELECT COUNT(*) FROM order_messages m WHERE m.order_id = o.id) AS message_count,
      0 AS attachment_count,
      (SELECT COALESCE((SELECT content FROM order_messages m WHERE m.order_id = o.id
        ORDER BY m.created_at DESC LIMIT 1), '')) AS last_message,
      (SELECT COALESCE((SELECT created_at FROM order_messages m WHERE m.order_id = o.id
        ORDER BY m.created_at DESC LIMIT 1), '')) AS last_message_at
    FROM orders o
    JOIN users b ON b.id = o.buyer_id
    JOIN users f ON f.id = o.freelancer_id
    WHERE o.id = ?
  `, [orderId]) as AdminConversationRow | undefined;

  if (!row) return null;
  return mapConversation(row);
};

export const readAdminInspectionConversation = async (
  conversationId: string,
)=> {
  const key = parseConversationId(conversationId);
  if (!key) return null;

  if (key.kind === 'direct') {
    const conversation = await findDirectConversation(key.aId, key.bId, key.serviceId);
    if (!conversation) return null;
    const rows = await selectMany(`
      SELECT m.id, m.sender_id, s.name AS sender_name, m.receiver_id, r.name AS receiver_name,
        m.content, m.created_at, m.attachment_name, m.attachment_mime, m.attachment_size
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.receiver_id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        AND m.service_id IS ?
      ORDER BY m.created_at ASC, m.id ASC LIMIT 2000
    `, [key.aId, key.bId, key.bId, key.aId, key.serviceId]) as unknown as TranscriptMessageRow[];

    return { conversation, items: rows.map(mapTranscriptMessage) };
  }

  const conversation = await findOrderConversation(key.orderId);
  if (!conversation) return null;

  const rows = await selectMany(`
    SELECT m.id, m.sender_id, u.name AS sender_name, NULL AS receiver_id,
      NULL AS receiver_name, m.content, m.created_at,
      NULL AS attachment_name, NULL AS attachment_mime, NULL AS attachment_size
    FROM order_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.order_id = ?
    ORDER BY m.created_at ASC, m.id ASC LIMIT 2000
  `, [key.orderId]) as unknown as TranscriptMessageRow[];

  return { conversation, items: rows.map(mapTranscriptMessage) };
};

export const findAdminChatAttachment = async (messageId: string) => {
  const row = await selectOne(`
    SELECT m.id, m.attachment_storage_key, m.attachment_name, m.attachment_mime,
      m.attachment_size, s.name AS sender_name, r.name AS receiver_name
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.receiver_id
    WHERE m.id = ? AND m.attachment_storage_key IS NOT NULL
  `, [messageId]) as
    | {
        id: string;
        attachment_storage_key: string;
        attachment_name: string;
        attachment_mime: string;
        attachment_size: number | null;
        sender_name: string;
        receiver_name: string;
      }
    | undefined;

  return row
    ? {
        messageId: row.id,
        storageKey: row.attachment_storage_key,
        name: row.attachment_name,
        mimeType: row.attachment_mime,
        size: Number(row.attachment_size ?? 0),
        senderName: row.sender_name,
        receiverName: row.receiver_name,
      }
    : null;
};

const PREVIEWABLE_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'text/uri-list', 'text/html', 'application/json',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
]);

interface VaultRow {
  id: string;
  version_number: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  relative_path: string;
  sha256: string;
  freelancer_notes: string | null;
  created_at: string;
}

const mapVaultFile = (row: VaultRow)=> ({
  id: row.id,
  versionNumber: Number(row.version_number),
  originalFilename: row.original_filename,
  mimeType: row.mime_type,
  fileSize: Number(row.file_size),
  relativePath: row.relative_path,
  sha256: row.sha256,
  freelancerNotes: row.freelancer_notes,
  createdAt: row.created_at,
  previewable: PREVIEWABLE_MIME.has(row.mime_type),
});

export const listAdminOrderVaultFiles = async (orderId: string)=> {
  const order = await selectOne('SELECT id FROM orders WHERE id = ?', [orderId]);
  if (!order) return null;

  const rows = await selectMany(`
    SELECT id, version_number, original_filename, mime_type, file_size,
      relative_path, sha256, freelancer_notes, created_at
    FROM order_deliveries WHERE order_id = ?
    ORDER BY version_number DESC, created_at DESC
  `, [orderId]) as unknown as VaultRow[];

  return rows.map(mapVaultFile);
};

export const findAdminVaultFile = async (orderId: string, deliveryId: string) => {
  const row = await selectOne(`
    SELECT d.id, d.file_path, d.original_filename, d.mime_type, d.file_size,
      d.version_number, d.sha256
    FROM order_deliveries d
    JOIN orders o ON o.id = d.order_id
    WHERE d.id = ? AND o.id = ?
  `, [deliveryId, orderId]) as
    | {
        id: string;
        file_path: string;
        original_filename: string;
        mime_type: string;
        file_size: number;
        version_number: number;
        sha256: string;
      }
    | undefined;

  return row
    ? {
        id: row.id,
        storagePath: row.file_path,
        name: row.original_filename,
        mimeType: row.mime_type,
        size: Number(row.file_size),
        versionNumber: Number(row.version_number),
        sha256: row.sha256,
      }
    : null;
};

export const getAdminOrderFullTranscript = async (orderId: string)=> {
  const detail = await getAdminOrderDetail(orderId);
  if (!detail) return null;

  const review = await selectOne(`
    SELECT id, client_name AS clientName, rating, comment,
      freelancer_reply AS freelancerReply, replied_at AS repliedAt, created_at AS createdAt
    FROM reviews WHERE order_id = ? LIMIT 1
  `, [orderId]) as AdminOrderReview | undefined;

  const vaultFiles = (await listAdminOrderVaultFiles(orderId)) ?? [];

  return { ...detail, vaultFiles, review: review ?? null };
};

export const getAdminUserDossier = async (userId: string)=> {
  const user = await getAdminUserById(userId);
  if (!user) return null;

  const sessions = (await listSessions({ userId, includeRevoked: true, limit: 100, offset: 0 }))
    .items as AdminDossierSession[];

  const familyLinks = await selectMany(`
    SELECT l.id,
      CASE WHEN l.parent_id = ? THEN 'parent' ELSE 'child' END AS relation,
      u.id AS counterpart_id, u.name AS counterpart_name, u.email AS counterpart_email,
      l.status, l.chat_access_enabled, l.created_at, l.responded_at
    FROM parent_child_links l
    JOIN users u ON u.id = CASE WHEN l.parent_id = ? THEN l.child_id ELSE l.parent_id END
    WHERE l.parent_id = ? OR l.child_id = ?
    ORDER BY l.created_at DESC
  `, [userId, userId, userId, userId]) as unknown as Array<{
    id: string;
    relation: 'parent' | 'child';
    counterpart_id: string;
    counterpart_name: string;
    counterpart_email: string;
    status: AdminDossierFamilyLink['status'];
    chat_access_enabled: number;
    created_at: string;
    responded_at: string | null;
  }>;

  const verifications = await selectMany(`
    SELECT v.id, v.child_id, u.name AS child_name,
      COALESCE(NULLIF(v.parent_email, ''), v.parent_phone) AS parent_email,
      v.parent_phone, v.status,
      v.parent_photo_path,
      v.created_at, v.submitted_at, v.reviewed_at
    FROM parent_verifications v
    JOIN users u ON u.id = v.child_id
    WHERE v.child_id = ?
      OR v.child_id IN (
        SELECT l.child_id FROM parent_child_links l
        WHERE l.parent_id = ? AND l.status = 'APPROVED'
      )
    ORDER BY v.created_at DESC
  `, [userId, userId]) as unknown as Array<{
    id: string;
    child_id: string;
    child_name: string;
    parent_email: string | null;
    parent_phone: string;
    status: string;
    parent_photo_path: string | null;
    created_at: string;
    submitted_at: string | null;
    reviewed_at: string | null;
  }>;

  const statsRow = await selectOne(`
    SELECT
      (SELECT COUNT(*) FROM orders o WHERE o.buyer_id = u.id) AS orders_as_buyer,
      (SELECT COUNT(*) FROM orders o WHERE o.freelancer_id = u.id) AS orders_as_freelancer,
      (SELECT COUNT(*) FROM orders o WHERE (o.buyer_id = u.id OR o.freelancer_id = u.id) AND o.status = 'COMPLETED') AS completed_orders,
      (SELECT COUNT(*) FROM services s WHERE s.freelancer_id = u.id) AS services,
      (SELECT COUNT(*) FROM services s WHERE s.freelancer_id = u.id AND s.status = 'active') AS active_services,
      (SELECT COUNT(*) FROM portfolio_items p WHERE p.user_id = u.id) AS portfolio,
      (SELECT COUNT(*) FROM community_posts c WHERE c.author_id = u.id) AS posts,
      (SELECT COUNT(*) FROM post_comments pc WHERE pc.user_id = u.id) AS comments,
      (SELECT COUNT(*) FROM reviews r WHERE r.freelancer_id = u.id) AS reviews_received,
      (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id) AS messages_sent,
      u.points_balance AS points_balance,
      (SELECT COUNT(*) FROM moderation_flags mf WHERE mf.user_id = u.id AND mf.status = 'Pending') AS pending_flags
    FROM users u WHERE u.id = ?
  `, [userId]) as {
    orders_as_buyer: number;
    orders_as_freelancer: number;
    completed_orders: number;
    services: number;
    active_services: number;
    portfolio: number;
    posts: number;
    comments: number;
    reviews_received: number;
    messages_sent: number;
    points_balance: number;
    pending_flags: number;
  } | undefined;

  return {
    user,
    sessions,
    familyLinks: familyLinks.map((row) => ({
      id: row.id,
      relation: row.relation,
      counterpartId: row.counterpart_id,
      counterpartName: row.counterpart_name,
      counterpartEmail: row.counterpart_email,
      status: row.status,
      chatAccessEnabled: Boolean(row.chat_access_enabled),
      createdAt: row.created_at,
      respondedAt: row.responded_at,
    })),
    verifications: verifications.map((row) => ({
      id: row.id,
      childId: row.child_id,
      childName: row.child_name,
      parentEmail: row.parent_email,
      parentPhone: row.parent_phone,
      status: row.status,
      hasPhoto: Boolean(row.parent_photo_path),
      createdAt: row.created_at,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
    })),
    stats: {
      ordersAsBuyer: Number(statsRow?.orders_as_buyer ?? 0),
      ordersAsFreelancer: Number(statsRow?.orders_as_freelancer ?? 0),
      completedOrders: Number(statsRow?.completed_orders ?? 0),
      services: Number(statsRow?.services ?? 0),
      activeServices: Number(statsRow?.active_services ?? 0),
      portfolio: Number(statsRow?.portfolio ?? 0),
      posts: Number(statsRow?.posts ?? 0),
      comments: Number(statsRow?.comments ?? 0),
      reviewsReceived: Number(statsRow?.reviews_received ?? 0),
      messagesSent: Number(statsRow?.messages_sent ?? 0),
      pointsBalance: Number(statsRow?.points_balance ?? 0),
      pendingFlags: Number(statsRow?.pending_flags ?? 0),
    },
  };
};

/* ------------------------------------------------------------------------ */
/* Content & marketplace control                                             */
/* ------------------------------------------------------------------------ */

export const listAdminContentServices = async (
  page: number,
  limit: number,
  filters: { q?: string; status?: 'active' | 'inactive' } = {},
)=> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push('(s.title LIKE ? OR s.category LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like, like);
  }

  if (filters.status) {
    clauses.push('s.status = ?');
    params.push(filters.status);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = await selectOne(`
    SELECT COUNT(*) AS total FROM services s JOIN users u ON u.id = s.freelancer_id ${whereSql}
  `, [...params]) as { total: number } | undefined;

  const rows = await selectMany(`
    SELECT s.id, s.freelancer_id, u.name AS freelancer_name, u.email AS freelancer_email,
      s.title, s.description, s.category, s.price, s.status, s.is_featured,
      s.featured_until, s.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.service_id = s.id) AS order_count
    FROM services s
    JOIN users u ON u.id = s.freelancer_id
    ${whereSql}
    ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `, [...params, limit, (page - 1) * limit]) as unknown as Array<{
    id: string;
    freelancer_id: string;
    freelancer_name: string;
    freelancer_email: string;
    title: string;
    description: string;
    category: string;
    price: number;
    status: 'active' | 'inactive';
    is_featured: number;
    featured_until: string | null;
    created_at: string;
    order_count: number;
  }>;

  return {
    items: rows.map((row) => ({
      id: row.id,
      freelancerId: row.freelancer_id,
      freelancerName: row.freelancer_name,
      freelancerEmail: row.freelancer_email,
      title: row.title,
      description: row.description,
      category: row.category,
      price: Number(row.price ?? 0),
      status: row.status,
      isFeatured: Boolean(row.is_featured),
      featuredUntil: row.featured_until,
      orderCount: Number(row.order_count ?? 0),
      createdAt: row.created_at,
    })),
    total: Number(countRow?.total ?? 0),
  };
};

export const updateAdminContentService = async (
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
)=> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const columns: Array<[keyof typeof patch, string]> = [
    ['title', 'title'],
    ['description', 'description'],
    ['category', 'category'],
    ['price', 'price'],
    ['status', 'status'],
    ['isFeatured', 'is_featured'],
    ['featuredUntil', 'featured_until'],
  ];

  for (const [field, column] of columns) {
    const value = patch[field];
    if (value === undefined) continue;
    assignments.push(`${column} = ?`);
    values.push(field === 'isFeatured' ? (value ? 1 : 0) as number : value as unknown);
  }

  if (!assignments.length) {
    return null;
  }

  const result = await execute(`UPDATE services SET ${assignments.join(', ')} WHERE id = ?`, [...values, serviceId]);
  if (!Number(result.rowCount)) return null;

  const row = await selectOne(`
    SELECT s.id, s.freelancer_id, u.name AS freelancer_name, u.email AS freelancer_email,
      s.title, s.description, s.category, s.price, s.status, s.is_featured,
      s.featured_until, s.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.service_id = s.id) AS order_count
    FROM services s JOIN users u ON u.id = s.freelancer_id WHERE s.id = ?
  `, [serviceId]) as {
    id: string;
    freelancer_id: string;
    freelancer_name: string;
    freelancer_email: string;
    title: string;
    description: string;
    category: string;
    price: number;
    status: 'active' | 'inactive';
    is_featured: number;
    featured_until: string | null;
    created_at: string;
    order_count: number;
  } | undefined;

  return row ? {
    id: row.id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    freelancerEmail: row.freelancer_email,
    title: row.title,
    description: row.description,
    category: row.category,
    price: Number(row.price ?? 0),
    status: row.status,
    isFeatured: Boolean(row.is_featured),
    featuredUntil: row.featured_until,
    orderCount: Number(row.order_count ?? 0),
    createdAt: row.created_at,
  } : null;
};

export const deleteAdminContentService = async (serviceId: string)=> {
  const hasOrders = await selectOne('SELECT 1 FROM orders WHERE service_id = ? LIMIT 1', [serviceId]);
  if (hasOrders) return 'has_orders';
  return Number((await execute('DELETE FROM services WHERE id = ?', [serviceId])).rowCount) > 0;
};

export const listAdminContentPortfolio = async (
  page: number,
  limit: number,
  q?: string,
)=> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (q) {
    const like = `%${q}%`;
    clauses.push('(p.title LIKE ? OR p.description LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like, like);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = await selectOne(`
    SELECT COUNT(*) AS total FROM portfolio_items p JOIN users u ON u.id = p.user_id ${whereSql}
  `, [...params]) as { total: number } | undefined;

  const rows = await selectMany(`
    SELECT p.id, p.user_id, u.name AS user_name, u.email AS user_email,
      p.title, p.description, p.image_url, p.project_url, p.created_at
    FROM portfolio_items p JOIN users u ON u.id = p.user_id
    ${whereSql}
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `, [...params, limit, (page - 1) * limit]) as unknown as Array<{
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    title: string;
    description: string | null;
    image_url: string | null;
    project_url: string | null;
    created_at: string;
  }>;

  return {
    items: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      projectUrl: row.project_url,
      createdAt: row.created_at,
    })),
    total: Number(countRow?.total ?? 0),
  };
};

export const updateAdminContentPortfolio = async (
  itemId: string,
  patch: { title?: string; description?: string | null; imageUrl?: string | null; projectUrl?: string | null },
)=> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of [['title', 'title'], ['description', 'description'], ['imageUrl', 'image_url'], ['projectUrl', 'project_url']] as const) {
    if (patch[field] !== undefined) {
      assignments.push(`${column} = ?`);
      values.push(patch[field] as unknown);
    }
  }

  if (assignments.length) {
    const result = await execute(`UPDATE portfolio_items SET ${assignments.join(', ')} WHERE id = ?`, [...values, itemId]);
    if (!Number(result.rowCount)) return null;
  }

  const row = await selectOne(`
    SELECT p.id, p.user_id, u.name AS user_name, u.email AS user_email,
      p.title, p.description, p.image_url, p.project_url, p.created_at
    FROM portfolio_items p JOIN users u ON u.id = p.user_id WHERE p.id = ?
  `, [itemId]) as {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    title: string;
    description: string | null;
    image_url: string | null;
    project_url: string | null;
    created_at: string;
  } | undefined;

  return row ? {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    projectUrl: row.project_url,
    createdAt: row.created_at,
  } : null;
};

export const deleteAdminContentPortfolio = async (itemId: string) => {
  const row = await selectOne('SELECT image_url FROM portfolio_items WHERE id = ?', [itemId]) as { image_url: string | null } | undefined;
  if (!row) return null;
  await execute('DELETE FROM portfolio_items WHERE id = ?', [itemId]);
  return { imageUrl: row.image_url };
};

export const listAdminContentPosts = async (
  page: number,
  limit: number,
  filters: { q?: string; status?: 'PUBLISHED' | 'DRAFT' } = {},
) => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push('(p.title LIKE ? OR p.content LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like, like);
  }

  if (filters.status) {
    clauses.push('p.status = ?');
    params.push(filters.status);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = await selectOne(`
    SELECT COUNT(*) AS total FROM community_posts p JOIN users u ON u.id = p.author_id ${whereSql}
  `, [...params]) as { total: number } | undefined;

  const rows = await selectMany(`
    SELECT p.id, p.title, p.content, p.category, p.status, p.author_id,
      u.name AS author_name, u.email AS author_email, p.views_count, p.likes_count,
      p.created_at,
      (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count
    FROM community_posts p JOIN users u ON u.id = p.author_id
    ${whereSql}
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `, [...params, limit, (page - 1) * limit]) as unknown as Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    status: 'PUBLISHED' | 'DRAFT';
    author_id: string;
    author_name: string;
    author_email: string;
    views_count: number;
    likes_count: number;
    created_at: string;
    comment_count: number;
  }>;

  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      status: row.status,
      authorId: row.author_id,
      authorName: row.author_name,
      authorEmail: row.author_email,
      viewsCount: Number(row.views_count ?? 0),
      likesCount: Number(row.likes_count ?? 0),
      commentCount: Number(row.comment_count ?? 0),
      createdAt: row.created_at,
    })),
    total: Number(countRow?.total ?? 0),
  };
};

export const setAdminContentPostStatus = async (postId: string, status: 'PUBLISHED' | 'DRAFT') =>
  Number((await execute('UPDATE community_posts SET status = ? WHERE id = ?', [status, postId])).rowCount) > 0;

export const deleteAdminContentPost = async (postId: string) => {
  const row = await selectOne('SELECT cover_image FROM community_posts WHERE id = ?', [postId]) as { cover_image: string | null } | undefined;
  if (!row) return null;
  await execute('DELETE FROM community_posts WHERE id = ?', [postId]);
  return { coverImage: row.cover_image };
};

export const listAdminContentComments = async (
  page: number,
  limit: number,
  q?: string,
) => {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q) {
    const like = `%${q}%`;
    clauses.push('(c.content ILIKE ? OR u.name ILIKE ? OR u.email ILIKE ? OR p.title ILIKE ? OR a.title ILIKE ?)');
    params.push(like, like, like, like, like);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const countRow = await selectOne(`
    SELECT COUNT(*) AS total FROM post_comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN community_posts p ON p.id = c.post_id
    LEFT JOIN articles a ON a.id = c.article_id
    ${whereSql}
  `, params) as { total: number } | undefined;
  const rows = await selectMany(`
    SELECT c.id, c.post_id, c.article_id, COALESCE(p.title, a.title) AS post_title,
      c.user_id, u.name AS user_name, u.email AS user_email, c.content,
      c.attachment_url, c.attachment_type, c.created_at
    FROM post_comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN community_posts p ON p.id = c.post_id
    LEFT JOIN articles a ON a.id = c.article_id
    ${whereSql}
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `, [...params, limit, (page - 1) * limit]) as Array<{
    id: string; post_id: string | null; article_id: string | null; post_title: string | null;
    user_id: string; user_name: string; user_email: string; content: string;
    attachment_url: string | null; attachment_type: 'IMAGE' | 'VIDEO' | 'FILE' | null; created_at: string;
  }>;
  return {
    items: rows.map((row) => ({
      id: row.id, postId: row.post_id, articleId: row.article_id, postTitle: row.post_title,
      userId: row.user_id, userName: row.user_name, userEmail: row.user_email, content: row.content,
      attachmentUrl: row.attachment_url, attachmentType: row.attachment_type, createdAt: row.created_at,
    })),
    total: Number(countRow?.total ?? 0),
  };
};

export const deleteAdminContentComment = async (commentId: string) => {
  const row = await selectOne('SELECT attachment_url FROM post_comments WHERE id = ?', [commentId]) as { attachment_url: string | null } | undefined;
  if (!row) return null;
  await execute('DELETE FROM post_comments WHERE id = ?', [commentId]);
  return { attachmentUrl: row.attachment_url };
};

export const unlinkAdminFamilyLink = async (linkId: string) => {
  const link = await selectOne('SELECT parent_id AS parentId, child_id AS childId FROM parent_child_links WHERE id = ?', [linkId]) as { parentId: string; childId: string } | undefined;
  if (!link) return null;
  await execute('DELETE FROM parent_child_links WHERE id = ?', [linkId]);
  return link;
};
