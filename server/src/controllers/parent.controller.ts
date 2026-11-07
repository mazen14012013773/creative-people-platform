import type { Request, Response } from 'express';
import { adminParentVerificationPhoto, adminParentVerificationQueue, approveParentVerification, getPublicParentVerification, linkedChildren, pendingLinkRequests, requestParentLink, respondToLinkRequest, reviewParentVerificationRequest, startParentVerification, childParentChatSettings, childParentAccessHistory, parentChildConversations, parentChildMessages, parentChildMessageAttachment, approveLegacyParentChatAccess, updateParentChildDisplay } from '../services/parent.service';
import type { AdminParentVerificationsQueryInput, ParentLinkRequestInput } from '../validators/parent.validator';

export const requestLink = async (req: Request<unknown, unknown, ParentLinkRequestInput>, res: Response) => res.status(201).json({ success: true, data: await requestParentLink(req.user!.id, req.body.childEmail) });
export const listLinkRequests = async (req: Request, res: Response) => res.json({ success: true, data: { items: await pendingLinkRequests(req.user!.id) } });
export const respondLink = async (req: Request, res: Response) => res.json({ success: true, data: await respondToLinkRequest(req.user!.id, String(req.body.linkId), req.body.status) });
export const listLinkedChildrenHandler = async (req: Request, res: Response) => res.json({ success: true, data: { items: await linkedChildren(req.user!.id) } });
export const updateChildDisplay = async (req: Request, res: Response) => res.json({ success: true, data: await updateParentChildDisplay(req.user!.id, String(req.params.childId), req.body.displayName, req.file) });
export const listChildParentChatSettings = async (req: Request, res: Response) => res.json({ success: true, data: { items: await childParentChatSettings(req.user!.id) } });
export const approveLegacyChatAccess = async (req: Request, res: Response) => res.json({ success: true, data: await approveLegacyParentChatAccess(req.user!.id, req.body.linkId) });
export const listChildParentAccessHistory = async (req: Request, res: Response) => res.json({ success: true, data: { items: await childParentAccessHistory(req.user!.id) } });
export const listParentChildConversations = async (req: Request, res: Response) => res.json({ success: true, data: { items: await parentChildConversations(req.user!.id, String(req.params.childId)) } });
export const listParentChildMessages = async (req: Request, res: Response) => res.json({ success: true, data: { items: await parentChildMessages(req.user!.id, String(req.params.childId), String(req.params.peerId), typeof req.query.serviceId === 'string' ? req.query.serviceId : null) } });
export const getParentChildMessageAttachment = async (req: Request, res: Response) => {
  const file = await parentChildMessageAttachment(req.user!.id, String(req.params.childId), String(req.params.messageId));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(file.mimeType);
  res.setHeader('Content-Disposition', /^(image|video)\//i.test(file.mimeType) ? 'inline' : 'attachment');
  res.redirect(302, file.url);
};
export const startVerification = async (req: Request, res: Response) => res.status(201).json({ success: true, data: await startParentVerification(req.user!.id, req.body.email) });
export const getVerification = async (req: Request, res: Response) => res.json({ success: true, data: await getPublicParentVerification(String(req.query.token)) });
export const approveVerification = async (req: Request, res: Response) => res.json({ success: true, data: await approveParentVerification(String(req.body.token), Number(req.body.mathAnswer), req.file) });
export const adminVerificationQueue = async (req: Request, res: Response) => res.json({ success: true, data: await adminParentVerificationQueue(req.query as unknown as AdminParentVerificationsQueryInput) });
export const adminVerificationPhoto = async (req: Request, res: Response) => {
  const file = await adminParentVerificationPhoto(String(req.params.id));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(file.mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.redirect(302, file.url);
};
export const reviewVerification = async (req: Request, res: Response) => res.json({ success: true, data: await reviewParentVerificationRequest(String(req.params.id), req.user!.id, req.body.approve, String(req.body.reason || 'Administrative action')) });
