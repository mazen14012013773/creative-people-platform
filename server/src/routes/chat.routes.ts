import { Router } from 'express';
import { attachment, conversations, messages, send } from '../controllers/chat.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { chatMessagesQuerySchema, chatPeerParamsSchema, sendMessageSchema } from '../validators/chat.validator';
import { uploadChatAttachment } from '../middlewares/upload.middleware';
import { uuidParamSchema } from '../validators/common.validator';

export const chatRouter = Router();

chatRouter.use(authenticate, authorize('Freelancer', 'Buyer'));
chatRouter.get('/conversations', asyncHandler(conversations));
chatRouter.get('/messages/:id/attachment', validate({ params: uuidParamSchema }), asyncHandler(attachment));
chatRouter.get(
  '/conversations/:peerId/messages',
  validate({ params: chatPeerParamsSchema, query: chatMessagesQuerySchema }),
  asyncHandler(messages),
);
chatRouter.post('/messages', publicActionLimiter, uploadChatAttachment.single('file'), validate({ body: sendMessageSchema }), asyncHandler(send));
