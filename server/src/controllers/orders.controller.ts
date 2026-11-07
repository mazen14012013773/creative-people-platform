import type { Request, Response } from 'express';
import { ZipArchive } from 'archiver';
import {
  acceptDelivery, cancelOrder, createOrder, deliverOrder, getDeliveryForDownload, getDeliveryForPreview,
  getOrder, listOrders, requestRevision, reviewOrder, listOrderMessages, createOrderMessage,
  replyToOrderReview, getOrderArchiveFiles, startOrder,
} from '../models/orders.model';
import { AppError } from '../utils/app-error';
import type { DeliveryBody, RevisionBody, ReviewBody, OrderMessageBody, OrderReviewReply } from '../validators/order.validator';

const getIdempotencyKey = (req: Request): string => {
  const header = req.get('Idempotency-Key');
  if (!header || header.length < 8 || header.length > 128 || !/^[\x21-\x7e]+$/.test(header)) {
    throw new AppError('أرسل ترويسة Idempotency-Key فريدة بطول 8 إلى 128 حرفًا.', 400);
  }
  return header;
};

export const list = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { items: await listOrders(req.user!.id) } });
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = await createOrder(req.user!.id, req.body.serviceId as string, getIdempotencyKey(req));
  res.status(result.replayed ? 200 : 201).json({ success: true, data: result });
};

export const show = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { order: await getOrder(String(req.params.id), req.user!.id) } });
};

export const listMessages = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { items: await listOrderMessages(String(req.params.id), req.user!.id) } });
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as OrderMessageBody;
  res.status(201).json({ success: true, data: { message: await createOrderMessage(String(req.params.id), req.user!.id, body.content) } });
};

export const start = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { order: await startOrder(String(req.params.id), req.user!.id) } });
};

export const deliver = async (req: Request, res: Response): Promise<void> => {
  const files = Array.isArray(req.files) ? req.files : [];
  const body = req.body as DeliveryBody;
  const result = await deliverOrder(String(req.params.id), req.user!.id, files, body.notes, body.link);
  res.status(201).json({ success: true, data: result });
};

export const revise = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as RevisionBody;
  res.json({ success: true, data: { order: await requestRevision(String(req.params.id), req.user!.id, body.notes) } });
};

export const accept = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { order: await acceptDelivery(String(req.params.id), req.user!.id) } });
};

export const review = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as ReviewBody;
  res.status(201).json({ success: true, data: { order: await reviewOrder(String(req.params.id), req.user!.id, body.rating, body.comment) } });
};

export const reply = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as OrderReviewReply;
  res.status(201).json({ success: true, data: { review: await replyToOrderReview(String(req.params.id), req.user!.id, body.reply) } });
};

export const cancel = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { order: await cancelOrder(String(req.params.id), req.user!.id) } });
};

export const download = async (req: Request, res: Response): Promise<void> => {
  const file = await getDeliveryForDownload(String(req.params.id), String(req.params.deliveryId), req.user!.id);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', file.mimeType);
  res.download(file.filePath, file.name, (error) => {
    if (error && !res.headersSent) res.status(404).end();
  });
};

export const previewDelivery = async (req: Request, res: Response): Promise<void> => {
  const file = await getDeliveryForPreview(String(req.params.id), String(req.params.deliveryId), req.user!.id);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', file.mimeType === 'text/html'
    ? "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; sandbox allow-scripts; frame-ancestors 'none'"
    : "default-src 'none'; sandbox; frame-ancestors 'none'");
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.setHeader('Content-Type', file.mimeType === 'text/html' ? 'text/html; charset=utf-8' : ['text/plain', 'text/uri-list', 'application/json'].includes(file.mimeType) ? 'text/plain; charset=utf-8' : file.mimeType);
  res.sendFile(file.filePath, (error) => { if (error && !res.headersSent) res.status(404).end(); });
};

export const downloadAll = async (req: Request, res: Response): Promise<void> => {
  const orderId = String(req.params.id);
  const files = await getOrderArchiveFiles(orderId, req.user!.id);
  res.status(200);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="mabdeen-order-${orderId}-files.zip"`);
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('warning', (error: Error) => res.destroy(error));
  archive.on('error', (error: Error) => res.destroy(error));
  archive.pipe(res);
  for (const file of files) archive.file(file.filePath, { name: file.archivePath });
  await archive.finalize();
};
