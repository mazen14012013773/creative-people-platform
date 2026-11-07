import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getClient, query } from '../config/db';
import { uploadPrivateFile, createPrivateFileUrl } from '../services/storage.service';
import { notifyAdministrators, createUserNotification } from './notification.model';
import { AppError } from '../utils/app-error';
import { REPORT_PROOF_EXTENSIONS, REPORT_PROOF_EXTENSIONS_LABEL } from '../config/upload-rules';
import { matchesFileSignature } from '../utils/file-signature';
import type { z } from 'zod';
import type { accountReportActionSchema, accountReportQuerySchema, accountReportSchema } from '../validators/account-report.validator';

type CreateInput = z.infer<typeof accountReportSchema>;
type Query = z.infer<typeof accountReportQuerySchema>;
type Action = z.infer<typeof accountReportActionSchema>;
export interface ReportProofInput { buffer: Buffer; originalname: string; mimetype: string; size: number; }

const safeName = (name: string) => path.basename(name.replace(/[\\/]/g, '_')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'evidence';

export const submitAccountReport = async (reporterId: string, input: CreateInput, files: ReportProofInput[]) => {
  const target = (await query("SELECT id, name, role FROM users WHERE id = $1 AND role <> 'Admin' AND is_active = 1", [input.reportedUserId])).rows[0] as { id: string; name: string; role: string } | undefined;
  if (!target) throw new AppError('Reported account is not available.', 404);
  if (reporterId === target.id) throw new AppError('You cannot report your own account.', 400);
  if ((await query("SELECT 1 FROM account_reports WHERE reporter_id = $1 AND reported_user_id = $2 AND status = 'PENDING'", [reporterId, target.id])).rowCount) throw new AppError('You already have a pending report for this account.', 409);

  const id = randomUUID();
  const proofs: Array<{ id: string; name: string; mimeType: string; size: number; storageKey: string }> = [];
  try {
    for (const file of files) {
      const ext = REPORT_PROOF_EXTENSIONS[file.mimetype] ? `.${REPORT_PROOF_EXTENSIONS[file.mimetype]}` : '';
      if (!ext) throw new AppError(`الملف «${file.originalname}» غير مسموح كدليل. الامتدادات المسموحة: ${REPORT_PROOF_EXTENSIONS_LABEL}.`, 400);
      if (!matchesFileSignature(file.buffer, file.mimetype)) throw new AppError(`محتوى الملف «${file.originalname}» لا يطابق نوعه المعلن (${file.mimetype}). الامتدادات المسموحة: ${REPORT_PROOF_EXTENSIONS_LABEL}.`, 400);
      const fileId = randomUUID();
      const storageKey = path.posix.join(id, `${fileId}${ext}`);
      await uploadPrivateFile(storageKey, file.buffer, file.mimetype);
      proofs.push({ id: fileId, name: safeName(file.originalname), mimeType: file.mimetype, size: file.size, storageKey });
    }
    await query(`INSERT INTO account_reports (id, reporter_id, reported_user_id, reason_category, description, proof_files)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [id, reporterId, target.id, input.reasonCategory, input.description, JSON.stringify(proofs)]);
  } catch (error) {
    throw error;
  }
  await notifyAdministrators('بلاغ جديد عن حساب', `${target.name}: ${input.description.slice(0, 140)}`, '/admin/reports');
  return { id, status: 'PENDING' as const, createdAt: (await query('SELECT created_at FROM account_reports WHERE id = $1', [id])).rows[0].created_at as string };
};

export const listAccountReports = async (input: Query) => {
  const where = input.status ? 'WHERE ar.status = $1' : '';
  const params = input.status ? [input.status] : [];
  const total = Number((await query(`SELECT COUNT(*) AS total FROM account_reports ar ${where}`, params)).rows[0].total);
  const paging = [...params, input.limit, (input.page - 1) * input.limit];
  const rows = (await query(`SELECT ar.*, reporter.name AS reporter_name, reporter.email AS reporter_email,
    target.name AS reported_name, target.email AS reported_email, target.role AS reported_role
    FROM account_reports ar JOIN users reporter ON reporter.id = ar.reporter_id
    JOIN users target ON target.id = ar.reported_user_id ${where}
    ORDER BY CASE ar.status WHEN 'PENDING' THEN 0 ELSE 1 END, ar.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, paging)).rows as Array<Record<string, unknown> & { proof_files: string }>;
  return { items: rows.map(({ proof_files, ...row }) => ({ ...row, proofFiles: JSON.parse(proof_files) })), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
};

export const getReportEvidence = async (reportId: string, proofId: string) => {
  const row = (await query('SELECT proof_files FROM account_reports WHERE id = $1', [reportId])).rows[0] as { proof_files: string } | undefined;
  if (!row) throw new AppError('Report not found.', 404);
  const proofs = JSON.parse(row.proof_files) as Array<{ id: string; name: string; mimeType: string; storageKey: string }>;
  const proof = proofs.find((item) => item.id === proofId);
  if (!proof) throw new AppError('Evidence not found.', 404);
  return { ...proof, url: await createPrivateFileUrl(proof.storageKey) };
};

export const resolveAccountReport = async (reportId: string, adminId: string, input: Action) => {
 const client=await getClient();
 try { await client.query('BEGIN');
  const report = (await client.query('SELECT reported_user_id, status FROM account_reports WHERE id = $1 FOR UPDATE', [reportId])).rows[0] as { reported_user_id: string; status: string } | undefined;
  if (!report) throw new AppError('Report not found.', 404);
  if (report.status !== 'PENDING') throw new AppError('This report has already been processed.', 409);
  if (input.action !== 'DISMISS') {
    const target = (await client.query("SELECT id, role FROM users WHERE id = $1 AND role <> 'Admin'", [report.reported_user_id])).rows[0] as { id: string; role: string } | undefined;
    if (!target) throw new AppError('Reported account was removed.', 409);
    if (input.action === 'TEMP_BLOCK') {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await client.query('UPDATE users SET is_active = 0, account_suspended_until = $1, token_invalid_before = $2 WHERE id = $3', [until, new Date().toISOString(), target.id]);
    } else if (input.action === 'PERMANENT_BLOCK') {
      await client.query('UPDATE users SET is_active = 0, account_suspended_until = NULL, token_invalid_before = $1 WHERE id = $2', [new Date().toISOString(), target.id]);
    } else {
      await createUserNotification(target.id, 'ACCOUNT_STATUS', 'تنبيه من إدارة المنصة', input.notes || 'يرجى مراجعة قواعد الاستخدام.', '/');
    }
  }
  const status = input.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
  await client.query(`UPDATE account_reports SET status = $1, action_type = $2, admin_action_notes = $3, resolved_at = CURRENT_TIMESTAMP WHERE id = $4`, [status, input.action, input.notes || null, reportId]);
  await client.query(`INSERT INTO admin_audit_logs (id, admin_id, action, subject_type, subject_id, reason) VALUES ($1, $2, $3, 'ACCOUNT_REPORT', $4, $5) RETURNING id`, [randomUUID(), adminId, input.action, reportId, input.notes || '']);
  await client.query('COMMIT');
  return { id: reportId, status, action: input.action };
 } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
