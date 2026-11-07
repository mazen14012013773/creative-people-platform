import { createHash } from 'node:crypto';
import { chmodSync, closeSync, mkdirSync, openSync, readSync, renameSync } from 'node:fs';
import { chmod, copyFile, mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

export const moveTempFile = async (tempPath: string, targetPath: string, mode?: number): Promise<void> => {
  await mkdir(path.dirname(targetPath), { recursive: true });
  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    await copyFile(tempPath, targetPath);
    await unlink(tempPath);
  }
  if (mode !== undefined) await chmod(targetPath, mode);
};

export const removeTempFile = async (tempPath: string | undefined): Promise<void> => {
  if (!tempPath) return;
  await unlink(tempPath).catch(() => undefined);
};

export const hashFileSha256 = (filePath: string): string => {
  const hash = createHash('sha256');
  const descriptor = openSync(filePath, 'r');
  try {
    const chunk = Buffer.allocUnsafe(64 * 1024);
    let read = 0;
    while ((read = readSync(descriptor, chunk, 0, chunk.length, null)) > 0) {
      hash.update(chunk.subarray(0, read));
    }
  } finally {
    closeSync(descriptor);
  }
  return hash.digest('hex');
};

export const moveTempFileSync = (tempPath: string, targetPath: string, mode?: number): void => {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  renameSync(tempPath, targetPath);
  if (mode !== undefined) chmodSync(targetPath, mode);
};
