import { randomUUID } from 'node:crypto';
import { query, getClient } from '../config/db';

export interface ParentLinkRow { id: string; parent_id: string; child_id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; created_at: string; parent_name?: string; parent_avatar?: string | null; child_name?: string; child_avatar?: string | null; child_email?: string; }

export const findChildByEmail = async (email: string) => (await query("SELECT id, name, email, role FROM users WHERE lower(email) = lower($1) AND role = 'Freelancer' AND is_active = 1", [email])).rows[0] as { id: string; name: string; email: string; role: string } | undefined;
export const findParentById = async (id: string) => (await query("SELECT id, name, email, role FROM users WHERE id = $1 AND role = 'Parent' AND is_active = 1", [id])).rows[0] as { id: string; name: string; email: string; role: string } | undefined;
export const findPendingParentLink = async (parentId: string, childId: string) => (await query("SELECT id FROM parent_child_links WHERE parent_id = $1 AND child_id = $2 AND status = 'PENDING'", [parentId, childId])).rows[0];
export const createParentLink = async (parentId: string, childId: string): Promise<string> => {
  const id = randomUUID();
  await query("INSERT INTO parent_child_links (id, parent_id, child_id, status) VALUES ($1, $2, $3, 'PENDING') RETURNING id", [id, parentId, childId]);
  return id;
};
export const getChildLinkRequests = async (childId: string) => (await query(`SELECT l.id, l.parent_id AS "parentId", l.child_id AS "childId", l.status, l.created_at AS "createdAt", p.name AS "parentName", p.avatar_url AS "parentAvatar"
  FROM parent_child_links l JOIN users p ON p.id = l.parent_id WHERE l.child_id = $1 AND l.status = 'PENDING' ORDER BY l.created_at`, [childId])).rows as Array<{ id: string; parentId: string; childId: string; status: 'PENDING'; createdAt: string; parentName: string; parentAvatar: string | null }>;
export const respondToParentLink = async (id: string, childId: string, status: 'APPROVED' | 'REJECTED'): Promise<ParentLinkRow | undefined> => {
  // Approving the guardian link never grants chat visibility; the child opts
  // in separately through approveLinkedParentChatAccess.
  const result = await query("UPDATE parent_child_links SET status = $1, chat_access_enabled = 0, responded_at = CURRENT_TIMESTAMP WHERE id = $2 AND child_id = $3 AND status = 'PENDING' RETURNING id, parent_id, child_id, status, created_at", [status, id, childId]);
  return result.rows[0] as ParentLinkRow | undefined;
};
export const listLinkedChildren = async (parentId: string) => {
  const children = (await query(`SELECT u.id, u.name, u.avatar_url AS "avatarUrl",
      l.parent_display_name AS "parentDisplayName", l.parent_avatar_data_url AS "parentAvatarDataUrl",
      u.title, u.location, u.bio,
      u.github_url AS "githubUrl", u.linkedin_url AS "linkedinUrl", u.website_url AS "websiteUrl",
      u.is_available AS "isAvailable", u.is_verified AS "isVerified",
      l.created_at AS "linkedAt",
      (SELECT COUNT(*) FROM portfolio_items p WHERE p.user_id = u.id) AS "portfolioCount",
      (SELECT COUNT(*) FROM services s WHERE s.freelancer_id = u.id AND s.status = 'active') AS "serviceCount",
      (SELECT COUNT(*) FROM community_posts c WHERE c.author_id = u.id AND c.status = 'PUBLISHED') AS "postCount",
      (SELECT COUNT(*) FROM reviews r WHERE r.freelancer_id = u.id) AS "reviewCount"
    FROM parent_child_links l JOIN users u ON u.id = l.child_id
  WHERE l.parent_id = $1 AND l.status = 'APPROVED' AND u.is_active = 1 ORDER BY l.responded_at DESC`, [parentId])).rows as Array<Record<string, any> & { id: string }>;
  return Promise.all(children.map(async (child) => ({ ...child,
    skills: (await query(`SELECT s.id, s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = $1 ORDER BY s.name`, [child.id])).rows,
    services: (await query("SELECT id, title, description, category, media_json AS \"mediaJson\", sources_json AS \"sourcesJson\", created_at AS \"createdAt\" FROM services WHERE freelancer_id = $1 AND status = 'active' ORDER BY created_at DESC", [child.id])).rows,
    posts: (await query("SELECT id, title, content, category, cover_image AS \"coverImage\", created_at AS \"createdAt\", views_count AS \"viewsCount\", likes_count AS \"likesCount\" FROM community_posts WHERE author_id = $1 AND status = 'PUBLISHED' ORDER BY created_at DESC", [child.id])).rows,
    portfolio: (await query("SELECT id, title, description, image_url AS \"imageUrl\", project_url AS \"projectUrl\", created_at AS \"createdAt\" FROM portfolio_items WHERE user_id = $1 ORDER BY created_at DESC", [child.id])).rows,
  })));
};

export const updateLinkedChildDisplay = async (parentId: string, childId: string, displayName: string | null | undefined, avatarDataUrl?: string): Promise<boolean> => {
  const updates: string[] = [];
  const values: Array<string | null> = [];
  if (displayName !== undefined) { values.push(displayName); updates.push(`parent_display_name = $${values.length}`); }
  if (avatarDataUrl !== undefined) { values.push(avatarDataUrl); updates.push(`parent_avatar_data_url = $${values.length}`); }
  if (!updates.length) return false;
  values.push(parentId, childId);
  const result = await query(`UPDATE parent_child_links SET ${updates.join(', ')}
    WHERE parent_id = $${values.length-1} AND child_id = $${values.length} AND status = 'APPROVED' RETURNING id`, values);
  return (result.rowCount ?? 0) > 0;
};

export const linkedParentsForChild = async (childId: string) => (await query(`
  SELECT l.id AS "linkId", p.id AS "parentId", p.name AS "parentName", p.avatar_url AS "parentAvatar", l.chat_access_enabled AS "chatAccessEnabled"
  FROM parent_child_links l JOIN users p ON p.id = l.parent_id WHERE l.child_id = $1 AND l.status = 'APPROVED'
  ORDER BY l.responded_at DESC
`, [childId])).rows as Array<{ linkId: string; parentId: string; parentName: string; parentAvatar: string | null; chatAccessEnabled: number }>;

export const parentHasChatConsent = async (parentId: string, childId: string): Promise<boolean> => (await query(`SELECT 1 FROM parent_child_links WHERE parent_id = $1 AND child_id = $2 AND status = 'APPROVED' AND chat_access_enabled = 1`, [parentId, childId])).rowCount! > 0;

export const approveLinkedParentChatAccess = async (childId: string, linkId: string): Promise<string | undefined> => {
  const result = await query(`UPDATE parent_child_links SET chat_access_enabled = 1 WHERE id = $1 AND child_id = $2 AND status = 'APPROVED' AND chat_access_enabled = 0 RETURNING parent_id`, [linkId, childId]);
  return (result.rows[0] as { parent_id: string } | undefined)?.parent_id;
};

export const recordParentAccess = async (parentId: string, childId: string, action: 'VIEW_CONVERSATIONS' | 'VIEW_MESSAGES', peerId?: string) => {
  await query(`INSERT INTO parent_access_logs (id, parent_id, child_id, action, peer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [randomUUID(), parentId, childId, action, peerId ?? null]);
};

export const getChildParentAccessLog = async (childId: string) => (await query(`
  SELECT l.id, l.action, l.created_at AS "createdAt", p.name AS "parentName", peer.name AS "peerName"
  FROM parent_access_logs l JOIN users p ON p.id = l.parent_id LEFT JOIN users peer ON peer.id = l.peer_id
  WHERE l.child_id = $1 ORDER BY l.created_at DESC LIMIT 100
`, [childId])).rows as Array<{ id: string; action: string; createdAt: string; parentName: string; peerName: string | null }>;

export const getChildConversations = async (childId: string) => (await query(`
  SELECT CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS "peerId", peer.name AS "peerName",
    peer.avatar_url AS "peerAvatar", m.service_id AS "serviceId", s.title AS "serviceTitle", MAX(m.created_at) AS "lastMessageAt",
    (SELECT content FROM messages last WHERE ((last.sender_id = $2 AND last.receiver_id = peer.id) OR (last.sender_id = peer.id AND last.receiver_id = $3)) AND last.service_id IS NOT DISTINCT FROM m.service_id ORDER BY last.created_at DESC LIMIT 1) AS "lastMessage"
  FROM messages m JOIN users peer ON peer.id = CASE WHEN m.sender_id = $4 THEN m.receiver_id ELSE m.sender_id END
  LEFT JOIN services s ON s.id = m.service_id WHERE m.sender_id = $5 OR m.receiver_id = $6
  GROUP BY peer.id, peer.name, peer.avatar_url, m.service_id, s.title ORDER BY "lastMessageAt" DESC
`, [childId, childId, childId, childId, childId, childId])).rows;

export const getChildConversationMessages = async (childId: string, peerId: string, serviceId: string | null) => (await query(`
  SELECT m.id, m.sender_id AS "senderId", sender.name AS "senderName", m.receiver_id AS "receiverId", receiver.name AS "receiverName",
    m.content, m.created_at AS "createdAt", m.attachment_name AS "attachmentName", m.attachment_mime AS "attachmentMime"
  FROM messages m JOIN users sender ON sender.id = m.sender_id JOIN users receiver ON receiver.id = m.receiver_id
  WHERE ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $3 AND m.receiver_id = $4)) AND m.service_id IS NOT DISTINCT FROM $5
  ORDER BY m.created_at ASC, m.id ASC
`, [childId, peerId, peerId, childId, serviceId])).rows;

export const findLinkedChildMessageAttachment = async (messageId: string, childId: string) => (await query(`
  SELECT id, sender_id AS "senderId", receiver_id AS "receiverId", attachment_storage_key AS "storageKey",
    attachment_name AS name, attachment_mime AS "mimeType"
  FROM messages WHERE id = $1 AND (sender_id = $2 OR receiver_id = $3) AND attachment_storage_key IS NOT NULL
`, [messageId, childId, childId])).rows[0] as { id: string; senderId: string; receiverId: string; storageKey: string; name: string; mimeType: string } | undefined;

export interface ParentVerificationRow { id: string; child_id: string; child_name?: string; child_email?: string; parent_phone: string; parent_email: string | null; token_hash: string; challenge_a: number; challenge_b: number; parent_photo_path: string | null; status: string; created_at: string; submitted_at: string | null; }
export const createParentVerification = async (childId: string, parentEmail: string, tokenHash: string, challengeA: number, challengeB: number) => {
  await query(`INSERT INTO parent_verifications (id, child_id, parent_phone, parent_email, token_hash, challenge_a, challenge_b, status)
    VALUES ($1, $2, '', $3, $4, $5, $6, 'PENDING_PARENT_APPROVAL')
    ON CONFLICT(child_id) DO UPDATE SET parent_email = excluded.parent_email, token_hash = excluded.token_hash,
      challenge_a = excluded.challenge_a, challenge_b = excluded.challenge_b,
      otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0, parent_photo_path = NULL, status = 'PENDING_PARENT_APPROVAL',
      created_at = CURRENT_TIMESTAMP, submitted_at = NULL, reviewed_at = NULL, reviewed_by = NULL RETURNING id`, [randomUUID(), childId, parentEmail, tokenHash, challengeA, challengeB]);
};
export const findParentVerificationByToken = async (tokenHash: string) => (await query(`SELECT v.*, u.name AS child_name, u.email AS child_email FROM parent_verifications v JOIN users u ON u.id = v.child_id WHERE v.token_hash = $1`, [tokenHash])).rows[0] as ParentVerificationRow | undefined;
export const approveParentVerificationByToken = async (id: string, childId: string, photoPath: string) => {
  const c = await getClient();
  try { await c.query('BEGIN');
    const result = await c.query(`UPDATE parent_verifications SET status = 'PENDING_ADMIN_REVIEW', parent_photo_path = $1, submitted_at = CURRENT_TIMESTAMP, token_hash = 'used-' || md5(random()::text || clock_timestamp()::text) WHERE id = $2 AND child_id = $3 AND status = 'PENDING_PARENT_APPROVAL' RETURNING id`, [photoPath, id, childId]);
    if (result.rowCount) await c.query("UPDATE users SET account_status = 'PENDING_ADMIN_REVIEW' WHERE id = $1 AND role = 'Freelancer'", [childId]);
    await c.query('COMMIT'); return result;
  } catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
};
export const findParentVerificationPhoto = async (id: string) => (await query('SELECT parent_photo_path AS "photoPath" FROM parent_verifications WHERE id = $1', [id])).rows[0] as { photoPath: string | null } | undefined;
export const listParentVerifications = async (input: { page: number; limit: number }) => {
  const [count, items] = await Promise.all([
    query("SELECT COUNT(*) AS total FROM parent_verifications WHERE status = 'PENDING_ADMIN_REVIEW'"),
    query(`SELECT v.id, v.child_id AS "childId", u.name AS "childName", u.email AS "childEmail", COALESCE(NULLIF(v.parent_email, ''), v.parent_phone) AS "parentEmail", v.status, v.created_at AS "createdAt", v.submitted_at AS "submittedAt", CASE WHEN v.parent_photo_path IS NOT NULL THEN 1 ELSE 0 END AS "hasPhoto" FROM parent_verifications v JOIN users u ON u.id = v.child_id WHERE v.status = 'PENDING_ADMIN_REVIEW' ORDER BY v.created_at LIMIT $1 OFFSET $2`, [input.limit, (input.page - 1) * input.limit]),
  ]);
  return { items: items.rows as Array<{ id: string; childId: string; childName: string; childEmail: string; parentEmail: string; status: 'PENDING_ADMIN_REVIEW'; createdAt: string; submittedAt: string | null; hasPhoto: number }>, total: Number(count.rows[0]?.total ?? 0) };
};
export const reviewParentVerification = async (id: string, adminId: string, approve: boolean) => {
  const status = approve ? 'APPROVED' : 'REJECTED';
  const c = await getClient();
  try { await c.query('BEGIN');
  const result = await c.query(`UPDATE parent_verifications SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3 AND status = 'PENDING_ADMIN_REVIEW' RETURNING child_id, COALESCE(NULLIF(parent_email, ''), parent_phone) AS parent_email`, [status, adminId, id]);
  if (!result.rowCount) { await c.query('COMMIT'); return undefined; }
  const row = result.rows[0] as { child_id: string; parent_email: string };
  // Rejection keeps the account active so the minor can sign in and retry the
  // verification with corrected data instead of being permanently locked out.
  await c.query('UPDATE users SET account_status = $1, is_active = 1, is_verified = $2, parent_approval_token = NULL WHERE id = $3', [approve ? 'ACTIVE' : 'REJECTED', approve ? 1 : 0, row.child_id]);
  await c.query('COMMIT'); return row;
  } catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
};
export const markAccountVerificationPending = async (childId: string, parentEmail: string, token: string) => query("UPDATE users SET parent_email = $1, parent_approval_token = $2, account_status = 'PENDING_PARENT_APPROVAL' WHERE id = $3 AND role = 'Freelancer' AND is_active = 1 RETURNING id", [parentEmail, token, childId]);
