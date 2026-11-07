import { randomUUID } from 'node:crypto';
import { query, getClient } from '../config/db';
import type { InboxNotificationType, SiteNotification } from '../types/notification';
import { emitRealtimeEvent, emitRealtimeEventToAll } from '../services/realtime.service';

export interface InboxNotification { id: string; type: InboxNotificationType; title: string; message: string; link: string; isRead: boolean; createdAt: string; }
interface InboxNotificationRow extends Omit<InboxNotification, 'isRead' | 'createdAt'> { is_read: boolean | number; created_at: string; }
const mapInboxNotification = (row: InboxNotificationRow): InboxNotification => ({ id: row.id, type: row.type, title: row.title, message: row.message, link: row.link, isRead: Boolean(row.is_read), createdAt: row.created_at });

export const insertUserNotificationRecord = async (userId: string, type: InboxNotificationType, title: string, message: string, link = '/') => {
  await query(`INSERT INTO user_notifications (id,user_id,type,title,message,link) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [randomUUID(), userId, type, title, message, link]);
};
export const createUserNotification = async (userId: string, type: InboxNotificationType, title: string, message: string, link = '/') => {
  await insertUserNotificationRecord(userId, type, title, message, link); emitRealtimeEvent(userId, 'notification');
};
export const notifyAdministrators = async (title: string, message: string, link: string) => {
  const { rows } = await query("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1");
  for (const admin of rows as Array<{ id: string }>) await createUserNotification(admin.id, 'NEW_REPORT', title, message, link);
};
export const createBroadcastInboxNotifications = async (title: string, message: string) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id FROM users WHERE is_active = 1');
    for (const user of rows as Array<{ id: string }>) {
      await client.query(`INSERT INTO user_notifications (id,user_id,type,title,message,link) VALUES ($1,$2,'ADMIN_ANNOUNCEMENT',$3,$4,'/')`, [randomUUID(), user.id, title, message]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  emitRealtimeEventToAll('notification');
};
export const listUserNotifications = async (userId: string): Promise<InboxNotification[]> => {
  const { rows } = await query(`SELECT id,type,title,message,link,is_read,created_at FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [userId]);
  return (rows as InboxNotificationRow[]).map(mapInboxNotification);
};
export const countUnreadNotifications = async (userId: string): Promise<number> => {
  const { rows } = await query('SELECT COUNT(*) AS count FROM user_notifications WHERE user_id = $1 AND is_read = 0', [userId]); return Number(rows[0]?.count ?? 0);
};
export const markUserNotificationRead = async (userId: string, notificationId: string): Promise<boolean> => {
  const { rowCount } = await query('UPDATE user_notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [notificationId, userId]); return (rowCount ?? 0) > 0;
};
export const markAllUserNotificationsRead = async (userId: string) => { await query('UPDATE user_notifications SET is_read = 1 WHERE user_id = $1 AND is_read = 0', [userId]); };

interface NotificationRow { id: string; title: string; message: string; is_active: boolean | number; created_at: string; }
const mapNotification = (row: NotificationRow): SiteNotification => ({ id: row.id, title: row.title, message: row.message, isActive: Boolean(row.is_active), createdAt: row.created_at });
export const listActiveNotifications = async (): Promise<SiteNotification[]> => {
  const { rows } = await query('SELECT id,title,message,is_active,created_at FROM notifications WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'); return (rows as NotificationRow[]).map(mapNotification);
};
export const listNotificationsForAdmin = async (input: { page: number; limit: number }): Promise<{ items: SiteNotification[]; total: number }> => {
  const [{ rows: countRows }, { rows }] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM notifications'),
    query('SELECT id,title,message,is_active,created_at FROM notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2', [input.limit, (input.page - 1) * input.limit]),
  ]);
  return { items: (rows as NotificationRow[]).map(mapNotification), total: Number(countRows[0]?.total ?? 0) };
};
export const createNotification = async (title: string, message: string, adminId: string): Promise<SiteNotification> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`INSERT INTO notifications (id,title,message,created_by) VALUES ($1,$2,$3,$4) RETURNING id,title,message,is_active,created_at`, [randomUUID(), title, message, adminId]);
    const users = await client.query('SELECT id FROM users WHERE is_active = 1');
    for (const user of users.rows as Array<{ id: string }>) await client.query(`INSERT INTO user_notifications (id,user_id,type,title,message,link) VALUES ($1,$2,'ADMIN_ANNOUNCEMENT',$3,$4,'/')`, [randomUUID(), user.id, title, message]);
    await client.query('COMMIT');
    emitRealtimeEventToAll('notification');
    return mapNotification(rows[0] as NotificationRow);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
export const setNotificationActive = async (id: string, isActive: boolean): Promise<SiteNotification | null> => {
  const { rows } = await query('UPDATE notifications SET is_active = $1 WHERE id = $2 RETURNING id,title,message,is_active,created_at', [isActive ? 1 : 0, id]);
  return rows[0] ? mapNotification(rows[0] as NotificationRow) : null;
};
