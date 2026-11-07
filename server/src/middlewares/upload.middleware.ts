import multer from 'multer';
import {
  CHAT_FILE_EXTENSIONS,
  CHAT_FILE_EXTENSIONS_LABEL,
  COMMENT_FILE_EXTENSIONS,
  COMMENT_FILE_EXTENSIONS_LABEL,
  IMAGE_EXTENSIONS_LABEL,
  IMAGE_MIME_EXTENSIONS,
  ORDER_DELIVERY_EXTENSIONS,
  ORDER_DELIVERY_EXTENSIONS_LABEL,
  REPORT_PROOF_EXTENSIONS,
  REPORT_PROOF_EXTENSIONS_LABEL,
  SERVICE_MEDIA_EXTENSIONS,
  SERVICE_MEDIA_EXTENSIONS_LABEL,
  rejectedFileMessage,
  type MimeExtensionMap,
} from '../config/upload-rules';
import { AppError } from '../utils/app-error';

const isAllowed = (map: MimeExtensionMap, mimetype: string): boolean =>
  Object.prototype.hasOwnProperty.call(map, mimetype);

const rejectFile = (file: Express.Multer.File, allowedLabel: string): AppError =>
  new AppError(rejectedFileMessage(file.originalname, allowedLabel), 400);

const makeUploader = (maxFileSize: number, files: number, map: MimeExtensionMap, label: string, extraLimits: { fields?: number; parts?: number } = {}) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize, files, ...extraLimits },
    fileFilter: (_req, file, callback) => {
      if (!isAllowed(map, file.mimetype)) {
        callback(rejectFile(file, label));
        return;
      }
      callback(null, true);
    },
  });

export const uploadSingleImage = makeUploader(3 * 1024 * 1024, 1, IMAGE_MIME_EXTENSIONS, IMAGE_EXTENSIONS_LABEL);

export const uploadServiceMedia = makeUploader(25 * 1024 * 1024, 1, SERVICE_MEDIA_EXTENSIONS, SERVICE_MEDIA_EXTENSIONS_LABEL);

export const uploadCommentAttachment = makeUploader(15 * 1024 * 1024, 1, COMMENT_FILE_EXTENSIONS, COMMENT_FILE_EXTENSIONS_LABEL);

export const uploadChatAttachment = makeUploader(15 * 1024 * 1024, 1, CHAT_FILE_EXTENSIONS, CHAT_FILE_EXTENSIONS_LABEL);

export const uploadOrderDeliveries = makeUploader(25 * 1024 * 1024, 5, ORDER_DELIVERY_EXTENSIONS, ORDER_DELIVERY_EXTENSIONS_LABEL, { fields: 2, parts: 7 });

export const uploadReportEvidence = makeUploader(10 * 1024 * 1024, 5, REPORT_PROOF_EXTENSIONS, REPORT_PROOF_EXTENSIONS_LABEL, { fields: 3, parts: 8 });

export const uploadBackupFile = makeUploader(
  50 * 1024 * 1024,
  1,
  { 'application/json': 'json', 'text/json': 'json', 'application/octet-stream': 'json' },
  'JSON',
);
