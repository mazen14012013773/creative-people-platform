import type { Request, Response } from 'express';
import { recordAdminAudit } from '../models/admin.model';
import { AppError } from '../utils/app-error';
import {
  buildBackup,
  buildBackupFilename,
  resetOperationalData,
  restoreBackup,
} from '../services/backup.service';
import {
  applyModerationCleanup,
  banIpAddress,
  forceLogoutUser,
  getAdminSessions,
  getBlockedIpList,
  getBlockedTerms,
  getModerationFlags,
  getSystemHealth,
  getSystemStatus,
  rescanAllProfiles,
  reviewModerationFlag,
  revokeSingleSession,
  unbanIpAddress,
  updateSettings,
} from '../services/system.service';
import type {
  CreateIpBlockInput,
  IpBlocksQueryInput,
  ModerationActionInput,
  ModerationCleanupInput,
  ModerationQueryInput,
  ModerationRescanInput,
  ResetDataInput,
  RestoreBackupInput,
  SessionRevokeInput,
  SessionRevokeParamsInput,
  SessionsQueryInput,
  SystemSettingsInput,
  UserSessionsRevokeInput,
} from '../validators/system.validator';

const ACTION_STATUS = {
  Resolve: 'Resolved',
  Dismiss: 'Dismissed',
  Reopen: 'Pending',
} as const;

export const status = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { system: getSystemStatus() },
  });
};

export const health = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { metrics: getSystemHealth() },
  });
};

export const settings = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { system: getSystemStatus(), blockedTerms: getBlockedTerms() },
  });
};

export const saveSettings = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as SystemSettingsInput;
  const system = await updateSettings(req.user!.id, body, body.reason);

  res.status(200).json({
    success: true,
    message: system.maintenanceEnabled
      ? 'تم تفعيل وضع الصيانة، المستخدمون غير الإداريين سيُوجّهون لصفحة الصيانة'
      : 'تم تحديث إعدادات النظام',
    data: { system },
  });
};

export const sessions = async (req: Request, res: Response): Promise<void> => {
  const result = getAdminSessions(req.query as unknown as SessionsQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const revokeSessions = async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body as UserSessionsRevokeInput;
  const result = await forceLogoutUser(req.user!.id, String(req.params.id), reason);

  res.status(200).json({
    success: true,
    message:
      result.revoked > 0
        ? 'تم إنهاء كل جلسات المستخدم على جميع الأجهزة'
        : 'لا توجد جلسات نشطة لهذا المستخدم',
    data: result,
  });
};

export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as SessionRevokeParamsInput;
  const { reason } = req.body as SessionRevokeInput;
  const result = revokeSingleSession(req.user!.id, id, reason);

  res.status(200).json({
    success: true,
    message: 'تم إنهاء الجلسة المحددة',
    data: result,
  });
};

export const ipBlocks = async (req: Request, res: Response): Promise<void> => {
  const result = getBlockedIpList(req.query as unknown as IpBlocksQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const createIpBlock = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateIpBlockInput;
  const block = banIpAddress({
    ip: body.ip,
    reason: body.reason,
    hours: body.hours ?? null,
    adminId: req.user!.id,
    requesterIp: req.ip ?? null,
  });

  res.status(201).json({
    success: true,
    message: 'تم حظر عنوان الـ IP',
    data: { block },
  });
};

export const removeIpBlock = async (req: Request, res: Response): Promise<void> => {
  unbanIpAddress(String(req.params.ip), req.user!.id);

  res.status(200).json({
    success: true,
    message: 'تم رفع الحظر عن العنوان',
  });
};

export const flags = async (req: Request, res: Response): Promise<void> => {
  const result = getModerationFlags(req.query as unknown as ModerationQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const flagAction = async (req: Request, res: Response): Promise<void> => {
  const { action, reason } = req.body as ModerationActionInput;
  const flag = reviewModerationFlag(
    String(req.params.id),
    ACTION_STATUS[action],
    req.user!.id,
    reason,
  );

  res.status(200).json({
    success: true,
    message: 'تم تحديث حالة البلاغ',
    data: { flag },
  });
};

export const flagCleanup = async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body as ModerationCleanupInput;
  const result = await applyModerationCleanup(String(req.params.id), req.user!.id, reason);

  res.status(200).json({
    success: true,
    message: 'تم تطبيق التنظيف المقترح على البروفايل',
    data: { flag: result.flag },
  });
};

export const rescan = async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body as ModerationRescanInput;
  const result = await rescanAllProfiles(req.user!.id, reason);

  res.status(200).json({
    success: true,
    message: `تم فحص ${result.scanned} حساب مستقل، والمضبوطات على ${result.flagged}`,
    data: { scan: result },
  });
};

export const backup = async (req: Request, res: Response): Promise<void> => {
  const payload = await buildBackup();

  await recordAdminAudit(req.user!.id, 'system_backup_download', 'system', 'database',
    'تنزيل نسخة احتياطية كاملة من قاعدة البيانات', {
      tables: Object.keys(payload.tables).length,
      createdAt: payload.meta.createdAt,
    });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${buildBackupFilename()}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(JSON.stringify(payload));
};

export const restore = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError('يجب رفع ملف النسخة الاحتياطية (JSON)', 422);
  }

  const { reason } = req.body as RestoreBackupInput;
  const result = await restoreBackup(req.user!.id, req.file.buffer, reason);

  res.status(200).json({
    success: true,
    message: `تمت استعادة ${Object.keys(result.restored).length} جدول بنجاح`,
    data: result,
  });
};

export const resetData = async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body as ResetDataInput;
  const result = await resetOperationalData(req.user!.id, reason);

  res.status(200).json({
    success: true,
    message: `تم مسح بيانات المنصة وملفاتها مع الاحتفاظ بـ ${result.keptAdmins} حساب إدارة`,
    data: result,
  });
};
