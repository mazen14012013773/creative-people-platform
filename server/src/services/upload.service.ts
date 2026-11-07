import { randomUUID } from 'node:crypto';
import { readdir, rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import { privateChatFilesDir, uploadsDir } from '../config/paths';
import {
  CHAT_FILE_EXTENSIONS,
  CHAT_FILE_EXTENSIONS_LABEL,
  COMMENT_FILE_EXTENSIONS,
  COMMENT_FILE_EXTENSIONS_LABEL,
  IMAGE_EXTENSIONS_LABEL,
  IMAGE_MIME_EXTENSIONS,
  SERVICE_MEDIA_EXTENSIONS,
  SERVICE_MEDIA_EXTENSIONS_LABEL,
  rejectedFileMessage,
} from '../config/upload-rules';
import { matchesFileSignatureFromPath } from '../utils/file-signature';
import { moveTempFile } from '../utils/file-storage';
import { AppError } from '../utils/app-error';

type UploadFolder = 'portfolio' | 'avatars' | 'community';

export interface SavedChatAttachment {
  storageKey: string;
  name: string;
  mimeType: string;
  size: number;
}

export const saveChatAttachment = async (
  userId: string,
  file: Express.Multer.File,
): Promise<SavedChatAttachment> => {
  const extension = CHAT_FILE_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, CHAT_FILE_EXTENSIONS_LABEL), 400);
  if (!matchesFileSignatureFromPath(file.path, file.mimetype)) throw new AppError(`محتوى الملف لا يطابق نوعه المعلن (${file.mimetype}). الامتدادات المسموحة: ${CHAT_FILE_EXTENSIONS_LABEL}.`, 400);
  const storedName = `${randomUUID()}.${extension}`;
  const storageKey = path.posix.join(userId, storedName);
  try {
    await moveTempFile(file.path, path.join(privateChatFilesDir, userId, storedName), 0o600);
  } catch (error) {
    console.error('Chat attachment save failed:', error);
    throw new AppError('تعذر حفظ الملف المرفق.', 500);
  }
  const rawName = decodeMultipartFilename(file.originalname)
    .replace(/[\\/]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return { storageKey, name: rawName.slice(0, 140) || `attachment.${extension}`, mimeType: file.mimetype, size: file.size };
};

const decodeMultipartFilename = (value: string): string => {
  if (!/[ÃÂØÙ]/.test(value)) return path.win32.basename(value);
  const decoded = Buffer.from(path.win32.basename(value), 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? path.win32.basename(value) : decoded;
};

export const resolveChatAttachmentPath = (storageKey: string): string => {
  const resolved = path.resolve(privateChatFilesDir, storageKey);
  if (!resolved.startsWith(`${privateChatFilesDir}${path.sep}`)) throw new AppError('الملف غير موجود.', 404);
  return resolved;
};

export const deleteChatAttachment = async (storageKey: string): Promise<void> => {
  await rm(resolveChatAttachmentPath(storageKey), { force: true });
};

export const uploadServiceMedia = async (
  userId: string,
  file: Express.Multer.File,
): Promise<{ url: string; type: 'image' | 'video' }> => {
  const extension = SERVICE_MEDIA_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, SERVICE_MEDIA_EXTENSIONS_LABEL), 400);
  if (!matchesFileSignatureFromPath(file.path, file.mimetype)) throw new AppError(`محتوى الملف لا يطابق نوعه المعلن (${file.mimetype}). الامتدادات المسموحة: ${SERVICE_MEDIA_EXTENSIONS_LABEL}.`, 400);
  const fileName = `${randomUUID()}.${extension}`;
  const targetDirectory = path.join(uploadsDir, 'services', userId);
  try {
    await moveTempFile(file.path, path.join(targetDirectory, fileName));
  } catch (error) {
    console.error('Service media upload failed:', error);
    throw new AppError('تعذر حفظ الملف، حاول مرة أخرى.', 500);
  }
  return { url: `/uploads/services/${userId}/${fileName}`, type: file.mimetype.startsWith('video/') ? 'video' : 'image' };
};

export const listUploadedServiceMedia = async (userId: string): Promise<Array<{ url: string; type: 'image' | 'video' }>> => {
  const directory = path.join(uploadsDir, 'services', userId);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && /^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(entry.name))
    .map((entry) => {
      const extension = path.extname(entry.name).slice(1).toLowerCase();
      const type = ['mp4', 'webm', 'mov'].includes(extension) ? 'video' : 'image';
      return { url: `/uploads/services/${userId}/${entry.name}`, type };
    });
};

export const deleteUploadedServiceMedia = async (userId: string, fileName: string): Promise<void> => {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(fileName)) {
    throw new AppError('ملف الوسيط غير صالح.', 400);
  }
  const target = path.join(uploadsDir, 'services', userId, fileName);
  try {
    await unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new AppError('ملف الوسيط غير موجود.', 404);
    throw error;
  }
};

export const uploadImage = async (
  userId: string,
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<string> => {
  const extension = IMAGE_MIME_EXTENSIONS[file.mimetype];

  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, IMAGE_EXTENSIONS_LABEL), 400);
  if (!matchesFileSignatureFromPath(file.path, file.mimetype)) {
    throw new AppError(`محتوى الصورة لا يطابق نوعها المعلن (${file.mimetype}). الامتدادات المسموحة: ${IMAGE_EXTENSIONS_LABEL}.`, 400);
  }

  const fileName = `${randomUUID()}.${extension}`;
  const targetDirectory = path.join(uploadsDir, folder, userId);
  const targetPath = path.join(targetDirectory, fileName);

  try {
    await moveTempFile(file.path, targetPath);
  } catch (error) {
    console.error('Local image upload failed:', error);
    throw new AppError('تعذر حفظ الصورة، يرجى المحاولة مرة أخرى', 500);
  }

  return `/uploads/${folder}/${userId}/${fileName}`;
};

export const saveCommunityCommentAttachment = async (
  userId: string,
  file: Express.Multer.File,
): Promise<{ url: string; type: 'IMAGE' | 'VIDEO' | 'FILE' }> => {
  const extension = COMMENT_FILE_EXTENSIONS[file.mimetype];
  if (!extension) throw new AppError(rejectedFileMessage(file.originalname, COMMENT_FILE_EXTENSIONS_LABEL), 400);
  if (!matchesFileSignatureFromPath(file.path, file.mimetype)) throw new AppError(`محتوى الملف لا يطابق نوعه المعلن (${file.mimetype}). الامتدادات المسموحة: ${COMMENT_FILE_EXTENSIONS_LABEL}.`, 400);
  const fileName = `${randomUUID()}.${extension}`;
  const directory = path.join(uploadsDir, 'community-comments', userId);
  try {
    await moveTempFile(file.path, path.join(directory, fileName), 0o600);
  } catch (error) {
    console.error('Community comment attachment save failed:', error);
    throw new AppError('تعذر حفظ المرفق. حاول مرة أخرى.', 500);
  }
  const type = file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype.startsWith('video/') ? 'VIDEO' : 'FILE';
  return { url: `/uploads/community-comments/${userId}/${fileName}`, type };
};

export const deleteLocalImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl.startsWith('/uploads/')) {
    return;
  }

  const relativePath = imageUrl.slice('/uploads/'.length);
  const targetPath = path.resolve(uploadsDir, relativePath);

  if (!targetPath.startsWith(`${uploadsDir}${path.sep}`)) {
    return;
  }

  await rm(targetPath, { force: true });
};
