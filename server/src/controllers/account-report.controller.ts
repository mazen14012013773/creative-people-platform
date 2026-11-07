import type { Request, Response } from 'express';
import { getReportEvidence, listAccountReports, resolveAccountReport, submitAccountReport } from '../models/account-report.model';
import type { z } from 'zod';
import type { accountReportActionSchema, accountReportQuerySchema, accountReportSchema } from '../validators/account-report.validator';

export const createAccountReport = async (req: Request, res: Response): Promise<void> => {
  const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
  const report = await submitAccountReport(req.user!.id, req.body as z.infer<typeof accountReportSchema>, files);
  res.status(201).json({ success: true, data: { report } });
};

export const listAccountReportsHandler = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: await listAccountReports(req.query as unknown as z.infer<typeof accountReportQuerySchema>) });
};

export const resolveAccountReportHandler = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { report: await resolveAccountReport(String(req.params.id), req.user!.id, req.body as z.infer<typeof accountReportActionSchema>) } });
};

export const accountReportEvidence = async (req: Request, res: Response): Promise<void> => {
  const file = await getReportEvidence(String(req.params.id), String(req.params.evidenceId));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox; frame-ancestors 'none'");
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.setHeader('Content-Type', file.mimeType === 'text/plain' ? 'text/plain; charset=utf-8' : file.mimeType);
  res.redirect(302, file.url);
};
