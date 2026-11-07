export const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  role TEXT NOT NULL DEFAULT 'Freelancer' CHECK (role IN ('Freelancer', 'Admin', 'Buyer', 'Parent')),
  bio TEXT,
  title TEXT,
  location TEXT,
  min_budget REAL CHECK (min_budget IS NULL OR min_budget >= 0),
  hourly_rate REAL CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  avatar_url TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  parent_photo TEXT,
  parent_approval_token TEXT,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'PENDING_PARENT_APPROVAL', 'PENDING_ADMIN_REVIEW', 'REJECTED')),
  github_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  featured_until TEXT,
  avg_response_hours REAL CHECK (avg_response_hours IS NULL OR avg_response_hours >= 0),
  token_invalid_before TEXT,
  profile_complete INTEGER NOT NULL DEFAULT 1 CHECK (profile_complete IN (0, 1)),
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  account_suspended_until TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  deleted_at TEXT,
  is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

export const SCHEMA_SQL = `${USERS_TABLE_SQL}
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  category TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'HIDDEN')),
  published_at TEXT NOT NULL,
  read_time INTEGER NOT NULL CHECK (read_time > 0)
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category_published ON articles (category, status, published_at DESC);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 20 AND 12000),
  cover_image TEXT,
  author_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('FREELANCER', 'CLIENT', 'ADMIN')),
  category TEXT NOT NULL CHECK (category IN ('تجربتي', 'درس برمجة', 'مشروعي', 'نصائح', 'أخرى')),
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'DRAFT')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON community_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE
);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY NOT NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  category TEXT NOT NULL,
  media_json TEXT NOT NULL DEFAULT '[]',
  sources_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  featured_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  service_id TEXT NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  buyer_id TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  price_amount REAL NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'AWAITING_REVIEW', 'COMPLETED', 'CANCELLED')),
  delivery_version INTEGER NOT NULL DEFAULT 0 CHECK (delivery_version >= 0),
  revision_notes TEXT,
  service_title TEXT NOT NULL,
  due_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+7 days')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON orders (buyer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_freelancer_status ON orders (freelancer_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_deliveries (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  relative_path TEXT NOT NULL DEFAULT '',
  sha256 TEXT NOT NULL DEFAULT '',
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  freelancer_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_order_version ON order_deliveries (order_id, version_number, created_at);

CREATE TABLE IF NOT EXISTS order_messages (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_order_messages_order_created ON order_messages (order_id, created_at, id);

CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id, created_at);

CREATE TABLE IF NOT EXISTS points_history (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  source_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_points_history_user_created ON points_history (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS order_idempotency_keys (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services (id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 2000),
  attachment_storage_key TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  attachment_size INTEGER CHECK (attachment_size IS NULL OR attachment_size >= 0),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (sender_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  guest_email TEXT,
  subject TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 3 AND 120),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY NOT NULL,
  ticket_id TEXT NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('USER', 'ADMIN')),
  sender_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 4000),
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IS NULL OR attachment_type IN ('IMAGE', 'VIDEO', 'FILE')),
  attachment_name TEXT,
  attachment_mime TEXT,
  attachment_size INTEGER CHECK (attachment_size IS NULL OR attachment_size >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (length(trim(message)) > 0 OR attachment_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_updated ON support_tickets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_admin_updated ON support_tickets (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages (ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  freelancer_reply TEXT,
  replied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS account_reports (
  id TEXT PRIMARY KEY NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL CHECK (reason_category IN ('FRAUD', 'INAPPROPRIATE', 'IMPERSONATION', 'NONCOMPLIANCE', 'OTHER')),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 4000),
  proof_files TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
  admin_action_notes TEXT,
  action_type TEXT CHECK (action_type IS NULL OR action_type IN ('TEMP_BLOCK', 'PERMANENT_BLOCK', 'WARNING', 'DISMISS')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_reports_status ON account_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_reports_reported ON account_reports (reported_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_reports_one_pending ON account_reports (reporter_id, reported_user_id) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS profile_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type = 'View'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('NEW_MESSAGE', 'NEW_REVIEW', 'ACCOUNT_STATUS', 'NEW_REPORT', 'ADMIN_ANNOUNCEMENT', 'NEW_POST_COMMENT', 'NEW_POST_LIKE', 'PARENT_LINK_REQUEST', 'REWARD_EARNED', 'BADGE_EARNED', 'NEW_ORDER', 'ORDER_UPDATE')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '/',
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS parent_child_links (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  chat_access_enabled INTEGER NOT NULL DEFAULT 0 CHECK (chat_access_enabled IN (0, 1)),
  parent_display_name TEXT,
  parent_avatar_data_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at TEXT,
  CHECK (parent_id <> child_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_child_pending ON parent_child_links(parent_id, child_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_child_links(parent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_links_child ON parent_child_links(child_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS parent_access_logs (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('VIEW_CONVERSATIONS', 'VIEW_MESSAGES')),
  peer_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_parent_access_logs_child ON parent_access_logs(child_id, created_at DESC);

CREATE TABLE IF NOT EXISTS parent_verifications (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  challenge_a INTEGER NOT NULL DEFAULT 0,
  challenge_b INTEGER NOT NULL DEFAULT 0,
  otp_hash TEXT,
  otp_expires_at TEXT,
  otp_attempts INTEGER NOT NULL DEFAULT 0 CHECK (otp_attempts >= 0),
  parent_photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_PARENT_APPROVAL' CHECK (status IN ('PENDING_PARENT_APPROVAL', 'PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_parent_verifications_status ON parent_verifications(status, created_at);

CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT REFERENCES community_posts (id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((post_id IS NOT NULL) + (article_id IS NOT NULL) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes (post_id, user_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_user_article ON post_likes (article_id, user_id) WHERE article_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT REFERENCES community_posts (id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '' CHECK (length(trim(content)) <= 2000),
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IS NULL OR attachment_type IN ('IMAGE', 'VIDEO', 'FILE')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((post_id IS NOT NULL) + (article_id IS NOT NULL) = 1),
  CHECK (length(trim(content)) > 0 OR attachment_url IS NOT NULL),
  CHECK ((attachment_url IS NULL) = (attachment_type IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments (post_id, created_at) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_article ON post_comments (article_id, created_at) WHERE article_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  admin_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_discovery
  ON users (is_active, is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_location ON users (location);
CREATE INDEX IF NOT EXISTS idx_users_min_budget ON users (min_budget);
CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills (skill_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_freelancer_status ON services (freelancer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (sender_id, receiver_id, service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages (receiver_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_freelancer ON reviews (freelancer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_freelancer ON reports (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_freelancer
  ON profile_events (freelancer_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON notifications (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox
  ON user_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  agent_hash TEXT NOT NULL,
  route_count INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS ip_blocks (
  ip TEXT PRIMARY KEY NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS moderation_flags (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  rule TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  excerpt TEXT NOT NULL,
  suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
  resolved_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_seen
  ON user_sessions (last_seen DESC, route_count DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_moderation_status
  ON moderation_flags (status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation_flags (user_id);

CREATE INDEX IF NOT EXISTS idx_users_verified
  ON users (is_verified, is_active, is_featured DESC);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_users_profile_completion
AFTER UPDATE OF name, role, title, location ON users
FOR EACH ROW
WHEN NEW.profile_complete != CASE
  WHEN NEW.role = 'Freelancer'
    AND length(trim(NEW.name)) >= 2
    AND length(trim(COALESCE(NEW.title, ''))) >= 2
    AND length(trim(COALESCE(NEW.location, ''))) >= 2 THEN 1
  WHEN NEW.role IN ('Buyer', 'Parent', 'Admin') AND length(trim(NEW.name)) >= 2 THEN 1
  ELSE 0
END
BEGIN
  UPDATE users SET profile_complete = CASE
    WHEN NEW.role = 'Freelancer'
      AND length(trim(NEW.name)) >= 2
      AND length(trim(COALESCE(NEW.title, ''))) >= 2
      AND length(trim(COALESCE(NEW.location, ''))) >= 2 THEN 1
    WHEN NEW.role IN ('Buyer', 'Parent', 'Admin') AND length(trim(NEW.name)) >= 2 THEN 1
    ELSE 0
  END
  WHERE id = NEW.id;
END;

CREATE VIEW IF NOT EXISTS freelancer_stats AS
SELECT
  u.id AS freelancer_id,
  (SELECT COUNT(*) FROM reviews r WHERE r.freelancer_id = u.id) AS review_count,
  COALESCE(
    (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.freelancer_id = u.id),
    0
  ) AS avg_rating,
  (SELECT COUNT(*) FROM profile_events pe
   WHERE pe.freelancer_id = u.id AND pe.event_type = 'View') AS view_count
FROM users u;
`;
