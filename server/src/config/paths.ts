import path from 'node:path';
import { env } from './env';

const serverRoot = path.resolve(__dirname, '../..');

const resolveFromServer = (value: string): string => {
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value);
};

export const databasePath = resolveFromServer(env.DATABASE_PATH);
export const uploadsDir = resolveFromServer(env.UPLOAD_DIR);
export const uploadsTempDir = path.resolve(uploadsDir, '../uploads-tmp');
export const privateChatFilesDir = path.resolve(uploadsDir, '../private-chat-files');
export const privateVaultDir = path.resolve(uploadsDir, '../private-vault');
export const privateReportEvidenceDir = path.resolve(uploadsDir, '../private-report-evidence');
export const privateParentVerificationDir = path.resolve(uploadsDir, '../private-parent-verifications');
export const clientDistDir = path.resolve(serverRoot, '../client/dist');
export const clientIndexFile = path.join(clientDistDir, 'index.html');
