import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  CHAT_FILE_EXTENSIONS, CHAT_FILE_EXTENSIONS_LABEL, COMMENT_FILE_EXTENSIONS, COMMENT_FILE_EXTENSIONS_LABEL,
  IMAGE_EXTENSIONS_LABEL, IMAGE_MIME_EXTENSIONS, SERVICE_MEDIA_EXTENSIONS, SERVICE_MEDIA_EXTENSIONS_LABEL,
  rejectedFileMessage,
} from '../config/upload-rules';
import { matchesFileSignature } from '../utils/file-signature';
import { AppError } from '../utils/app-error';
import { createPrivateFileUrl, deleteCloudFile, deletePublicFile, listPublicFiles, uploadPrivateFile, uploadPublicFile } from './storage.service';

type UploadFolder = 'portfolio' | 'avatars' | 'community';
export interface SavedChatAttachment { storageKey: string; name: string; mimeType: string; size: number }

const safeOriginalName = (value: string): string => {
  const name = path.win32.basename(value).replace(/[\\/]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return name.slice(0, 140);
};
const validateBuffer = (file: Express.Multer.File, label: string): void => {
  if (!file.buffer?.length || !matchesFileSignature(file.buffer, file.mimetype)) {
    throw new AppError(`محتوى الملف «${file.originalname}» لا يطابق نوعه المعلن. الامتدادات المسموحة: ${label}.`, 400);
  }
};

export const saveChatAttachment = async (userId: string, file: Express.Multer.File): Promise<SavedChatAttachment> => {
  const extension = CHAT_FILE_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, CHAT_FILE_EXTENSIONS_LABEL), 400);
  validateBuffer(file, CHAT_FILE_EXTENSIONS_LABEL);
  const key = `chat/${userId}/${randomUUID()}.${extension}`;
  const storageKey = await uploadPrivateFile(key, file.buffer, file.mimetype);
  const name = safeOriginalName(file.originalname);
  return { storageKey, name: name || `attachment.${extension}`, mimeType: file.mimetype, size: file.size };
};

export const getPrivateFileUrl = (storageKey: string, downloadName?: string): Promise<string> => createPrivateFileUrl(storageKey, 300, downloadName);
export const deleteChatAttachment = (storageKey: string): Promise<void> => deleteCloudFile(storageKey);

export const uploadServiceMedia = async (userId: string, file: Express.Multer.File): Promise<{ url: string; type: 'image' | 'video' }> => {
  const extension = SERVICE_MEDIA_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, SERVICE_MEDIA_EXTENSIONS_LABEL), 400);
  validateBuffer(file, SERVICE_MEDIA_EXTENSIONS_LABEL);
  const key = `services/${userId}/${randomUUID()}.${extension}`;
  const url = await uploadPublicFile(key, file.buffer, file.mimetype);
  return { url, type: file.mimetype.startsWith('video/') ? 'video' : 'image' };
};

export const listUploadedServiceMedia = async (userId: string): Promise<Array<{ url: string; type: 'image' | 'video' }>> =>
  (await listPublicFiles(`services/${userId}`)).filter(({ name }) => /^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(name)).map(({ name, url }) => {
    const extension = path.extname(name).slice(1).toLowerCase();
    return { url, type: ['mp4', 'webm', 'mov'].includes(extension) ? 'video' : 'image' };
  });

export const deleteUploadedServiceMedia = async (userId: string, fileName: string): Promise<void> => {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(fileName)) throw new AppError('ملف الوسيط غير صالح.', 400);
  await deletePublicFile(`services/${userId}/${fileName}`);
};

export const uploadImage = async (userId: string, file: Express.Multer.File, folder: UploadFolder): Promise<string> => {
  const extension = IMAGE_MIME_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, IMAGE_EXTENSIONS_LABEL), 400);
  validateBuffer(file, IMAGE_EXTENSIONS_LABEL);
  return uploadPublicFile(`${folder}/${userId}/${randomUUID()}.${extension}`, file.buffer, file.mimetype);
};

export const saveCommunityCommentAttachment = async (userId: string, file: Express.Multer.File): Promise<{ url: string; type: 'IMAGE' | 'VIDEO' | 'FILE' }> => {
  const extension = COMMENT_FILE_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, COMMENT_FILE_EXTENSIONS_LABEL), 400);
  validateBuffer(file, COMMENT_FILE_EXTENSIONS_LABEL);
  const key = `community-comments/${userId}/${randomUUID()}.${extension}`;
  const url = await uploadPublicFile(key, file.buffer, file.mimetype);
  const type = file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype.startsWith('video/') ? 'VIDEO' : 'FILE';
  return { url, type };
};

export const deleteLocalImage = async (imageUrl: string): Promise<void> => {
  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return;
    const objectPath = url.pathname.slice(index + marker.length).split('/').slice(1).map(decodeURIComponent).join('/');
    if (objectPath) await deletePublicFile(objectPath);
  } catch { /* External image URLs are not managed by this application. */ }
};
