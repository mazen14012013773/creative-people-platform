import { Router } from 'express';
import { addTicketMessage, createTicket, myTickets, ticketAttachment, ticketMessages } from '../controllers/support.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadChatAttachment } from '../middlewares/upload.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { supportMessageParamsSchema, supportMessageSchema, supportTicketCreateSchema, supportTicketParamsSchema } from '../validators/support.validator';

export const supportRouter = Router();
supportRouter.use(authenticate, authorize('Freelancer', 'Buyer', 'Parent', 'Admin'));
supportRouter.get('/tickets/mine', authorize('Freelancer', 'Buyer', 'Parent'), asyncHandler(myTickets));
supportRouter.post('/tickets', authorize('Freelancer', 'Buyer', 'Parent'), publicActionLimiter,
  uploadChatAttachment.single('file'), validate({ body: supportTicketCreateSchema }), asyncHandler(createTicket));
supportRouter.get('/tickets/:id/messages', validate({ params: supportTicketParamsSchema }), asyncHandler(ticketMessages));
supportRouter.post('/tickets/:id/messages', publicActionLimiter, uploadChatAttachment.single('file'),
  validate({ params: supportTicketParamsSchema, body: supportMessageSchema }), asyncHandler(addTicketMessage));
supportRouter.get('/tickets/:id/messages/:messageId/attachment', validate({ params: supportMessageParamsSchema }), asyncHandler(ticketAttachment));
