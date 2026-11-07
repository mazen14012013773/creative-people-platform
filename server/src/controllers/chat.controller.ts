import type { Request, Response } from 'express';
import { getChatAttachment, getConversationMessages, getConversations, sendChatMessage } from '../services/chat.service';
import type { SendMessageInput } from '../validators/chat.validator';

export const conversations = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: await getConversations(req.user!.id) } });
};

export const messages = async (req: Request, res: Response): Promise<void> => {
  const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined;
  const items = await getConversationMessages(req.user!.id, String(req.params.peerId), serviceId);
  res.status(200).json({ success: true, data: { items } });
};

export const send = async (req: Request, res: Response): Promise<void> => {
  const message = await sendChatMessage(req.user!.id, req.body as SendMessageInput, req.file);
  res.status(201).json({ success: true, message: 'تم إرسال الرسالة', data: { message } });
};

export const attachment = async (req: Request, res: Response): Promise<void> => {
  const file = await getChatAttachment(String(req.params.id), req.user!.id);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(file.filePath, file.name, (error) => {
    if (error && !res.headersSent) res.status(404).end();
  });
};
