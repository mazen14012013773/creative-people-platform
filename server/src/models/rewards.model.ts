import { randomUUID } from 'node:crypto';
import { getClient, query } from '../config/db';
import { AppError } from '../utils/app-error';
import { getFreelancerLevel } from '../utils/freelancer-level';
import { insertUserNotificationRecord } from './notification.model';

export type RewardCode = 'FEATURED_PROFILE' | 'BOOST_SERVICE';

export const awardPoints = async (userId: string, amount: number, reason: string, sourceKey: string): Promise<boolean> => {
  const client = await getClient(); let beforeBalance = 0; let after = 0;
  try {
    await client.query('BEGIN');
    const before = (await client.query("SELECT points_balance FROM users WHERE id=$1 AND role='Freelancer' FOR UPDATE", [userId])).rows[0] as {points_balance:number}|undefined;
    if (!before) { await client.query('COMMIT'); return false; }
    beforeBalance = Number(before.points_balance);
    const inserted = await client.query(`INSERT INTO points_history(id,user_id,amount,reason,source_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT(source_key) DO NOTHING RETURNING id`, [randomUUID(),userId,amount,reason,sourceKey]);
    if (!inserted.rowCount) { await client.query('COMMIT'); return false; }
    const updated = await client.query('UPDATE users SET points_balance=points_balance+$1 WHERE id=$2 AND role=\'Freelancer\' RETURNING points_balance',[amount,userId]);
    after = Number(updated.rows[0]?.points_balance ?? beforeBalance);
    if (beforeBalance <= 500 && after > 500) await client.query("UPDATE users SET is_featured=1,featured_until=$1 WHERE id=$2 AND role='Freelancer'",[new Date(Date.now()+7*24*60*60*1000).toISOString(),userId]);
    await client.query('COMMIT');
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  if (getFreelancerLevel(after).number > getFreelancerLevel(beforeBalance).number) {
    const level=getFreelancerLevel(after); await insertUserNotificationRecord(userId,'REWARD_EARNED',`مبروك! وصلت إلى المستوى ${level.number}`,`وصلت إلى ${level.title}. استمر في إنجاز الطلبات والتقييمات لفتح مزايا جديدة.`,'/dashboard');
  }
  return true;
};

export interface AdminPointsOverview {
  freelancersCount: number;
  totalBalance: number;
  totalEarned: number;
  totalSpent: number;
  levelDistribution: Array<{ level: number; title: string; minPoints: number; freelancers: number }>;
  topFreelancers: Array<{
    id: string;
    name: string;
    email: string;
    pointsBalance: number;
    level: number;
    levelTitle: string;
  }>;
  recentHistory: Array<{
    id: string;
    userName: string;
    userEmail: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

export const getAdminPointsOverview = async (): Promise<AdminPointsOverview> => {
  const totals = (await query(
    `SELECT COUNT(*) AS freelancersCount,
       COALESCE(SUM(points_balance), 0) AS totalBalance
     FROM users WHERE role = 'Freelancer' AND is_deleted = 0`,
  )).rows[0] as { freelancersCount: number; totalBalance: number } | undefined;

  const earned = (await query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM points_history WHERE amount > 0`,
  )).rows[0] as { total: number } | undefined;
  const spent = (await query(
    `SELECT COALESCE(SUM(-amount), 0) AS total FROM points_history WHERE amount < 0`,
  )).rows[0] as { total: number } | undefined;

  const levelBounds = [
    { level: 1, title: 'مستقل صاعد', minPoints: 0, maxPoints: 200 },
    { level: 2, title: 'مستقل محترف', minPoints: 201, maxPoints: 500 },
    { level: 3, title: 'مستقل نخبة', minPoints: 501, maxPoints: null },
  ];
  const levelDistribution = await Promise.all(levelBounds.map(async (bound) => {
    const row = bound.maxPoints === null
      ? (await query(
          `SELECT COUNT(*) AS total FROM users
           WHERE role = 'Freelancer' AND is_deleted = 0 AND points_balance > 500`,
        )).rows[0] as { total: number } | undefined
      : (await query(
          `SELECT COUNT(*) AS total FROM users
          WHERE role = 'Freelancer' AND is_deleted = 0 AND points_balance >= $1 AND points_balance <= $2`,
          [bound.minPoints, bound.maxPoints])).rows[0] as { total: number } | undefined;
    return { level: bound.level, title: bound.title, minPoints: bound.minPoints, freelancers: Number(row?.total ?? 0) };
  }));

  const topFreelancers = (await query(
    `SELECT u.id, u.name, u.email, u.points_balance AS pointsBalance
     FROM users u WHERE u.role = 'Freelancer' AND u.is_deleted = 0 AND u.points_balance > 0
     ORDER BY u.points_balance DESC, lower(u.name) ASC LIMIT 10`,
  )).rows as Array<{ id: string; name: string; email: string; pointsBalance: number }>;
  const mappedTop = topFreelancers.map((row) => {
    const levelInfo = getFreelancerLevel(Number(row.pointsBalance));
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      pointsBalance: Number(row.pointsBalance),
      level: levelInfo.number,
      levelTitle: levelInfo.title,
    };
  });

  const recentHistory = (await query(
    `SELECT h.id, COALESCE(u.name, 'مستخدم محذوف') AS userName, COALESCE(u.email, '') AS userEmail,
       h.amount, h.reason, h.created_at AS createdAt
     FROM points_history h LEFT JOIN users u ON u.id = h.user_id
     ORDER BY h.created_at DESC LIMIT 20`,
  )).rows as AdminPointsOverview['recentHistory'];

  return {
    freelancersCount: Number(totals?.freelancersCount ?? 0),
    totalBalance: Number(totals?.totalBalance ?? 0),
    totalEarned: Number(earned?.total ?? 0),
    totalSpent: Number(spent?.total ?? 0),
    levelDistribution,
    topFreelancers: mappedTop,
    recentHistory,
  };
};

export const getRewards = async (userId: string) => {
  const user = (await query(`SELECT points_balance, is_verified, is_featured, featured_until
    FROM users WHERE id = $1 AND role = 'Freelancer'`, [userId])).rows[0] as {
      points_balance: number; is_verified: number; is_featured: number; featured_until: string | null;
    } | undefined;
  if (!user) throw new AppError('Rewards are available to freelancers only.', 403);
  const history = (await query(`SELECT id, amount, reason, created_at AS "createdAt" FROM points_history
    WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [userId])).rows as Array<{
      id: string; amount: number; reason: string; createdAt: string;
    }>;
  const services = (await query(`SELECT id, title FROM services WHERE freelancer_id = $1 AND status = 'active' ORDER BY created_at DESC`, [userId])).rows as Array<{ id: string; title: string }>;
  return {
    balance: Number(user.points_balance),
    isVerified: Boolean(user.is_verified),
    featuredUntil: user.featured_until,
    isFeatured: Boolean(user.is_featured) && (!user.featured_until || user.featured_until > new Date().toISOString()),
    history,
    services,
  };
};

export const redeemReward = async (userId: string, reward: RewardCode, serviceId?: string) => {
 const client=await getClient();
 try { await client.query('BEGIN');
  const user = (await client.query(`SELECT points_balance, is_verified, is_featured, featured_until FROM users
    WHERE id = $1 AND role = 'Freelancer' FOR UPDATE`, [userId])).rows[0] as {
      points_balance: number; is_verified: number; is_featured: number; featured_until: string | null;
    } | undefined;
  if (!user) throw new AppError('Rewards are available to freelancers only.', 403);

  const costs: Record<RewardCode, number> = { FEATURED_PROFILE: 150, BOOST_SERVICE: 100 };
  const listCost = costs[reward];
  const discount = getFreelancerLevel(Number(user.points_balance)).rewardDiscount;
  const cost = Math.ceil(listCost * (1 - discount / 100));
  if (user.points_balance < cost) throw new AppError('رصيد النقاط غير كافٍ لهذه المكافأة.', 400, { balance: user.points_balance, required: cost });
  if (reward === 'FEATURED_PROFILE' && user.is_featured && !user.featured_until) throw new AppError('الملف مميز بالفعل دون تاريخ انتهاء.', 400);
  if (reward === 'BOOST_SERVICE') {
    if (!serviceId) throw new AppError('اختر خدمة لتمييزها.', 400);
    const service = (await client.query(`SELECT id FROM services WHERE id = $1 AND freelancer_id = $2 AND status = 'active'`,[serviceId,userId])).rows[0];
    if (!service) throw new AppError('الخدمة غير موجودة أو غير متاحة للتمييز.', 400);
  }

  const debit = await client.query(`UPDATE users SET points_balance = points_balance - $1
    WHERE id = $2 AND role = 'Freelancer' AND points_balance >= $3 RETURNING id`,[cost,userId,cost]);
  if (!debit.rowCount) throw new AppError('رصيد النقاط غير كافٍ لهذه المكافأة.', 400);

  const sourceKey = `redeem:${randomUUID()}`;
  const labels: Record<RewardCode, string> = {
    FEATURED_PROFILE: 'استبدال تمييز الملف الشخصي لمدة 7 أيام',
    BOOST_SERVICE: 'استبدال تمييز خدمة لمدة 7 أيام',
  };
  await client.query(`INSERT INTO points_history (id,user_id,amount,reason,source_key) VALUES ($1,$2,$3,$4,$5) RETURNING id`,[randomUUID(),userId,-cost,labels[reward],sourceKey]);

  if (reward === 'FEATURED_PROFILE') {
    const now = Date.now();
    const existingUntil = user.is_featured && user.featured_until ? Date.parse(user.featured_until) : now;
    const startsAt = Math.max(now, Number.isFinite(existingUntil) ? existingUntil : now);
    const until = new Date(startsAt + 7 * 24 * 60 * 60 * 1000).toISOString();
    await client.query('UPDATE users SET is_featured = 1, featured_until = $1 WHERE id = $2',[until,userId]);
    await client.query(`INSERT INTO user_notifications(id,user_id,type,title,message,link) VALUES($1,$2,'BADGE_EARNED',$3,$4,$5) RETURNING id`,[randomUUID(),userId,'تم تمييز بروفايلك','ظهر بروفايلك ضمن الحسابات المميزة لمدة 7 أيام.',`/freelancers/${userId}`]);
  } else {
    const activeService = (await client.query('SELECT is_featured, featured_until FROM services WHERE id = $1 AND freelancer_id = $2',[serviceId!,userId])).rows[0] as { is_featured: number; featured_until: string | null };
    const currentUntil = activeService.is_featured && activeService.featured_until ? Date.parse(activeService.featured_until) : Date.now();
    const until = new Date(Math.max(Date.now(), Number.isFinite(currentUntil) ? currentUntil : Date.now()) + 7 * 24 * 60 * 60 * 1000).toISOString();
    await client.query('UPDATE services SET is_featured = 1, featured_until = $1 WHERE id = $2 AND freelancer_id = $3',[until,serviceId!,userId]);
    await client.query(`INSERT INTO user_notifications(id,user_id,type,title,message,link) VALUES($1,$2,'BADGE_EARNED',$3,$4,$5) RETURNING id`,[randomUUID(),userId,'تم تمييز خدمتك','أصبحت خدمتك مميزة وستظهر عليها الشارة لمدة 7 أيام.',`/freelancers/${userId}?serviceId=${encodeURIComponent(serviceId!)}`]);
  }

  const balance=Number((await client.query('SELECT points_balance FROM users WHERE id = $1',[userId])).rows[0].points_balance);
  await client.query('COMMIT'); return { reward, cost, balance };
 } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
