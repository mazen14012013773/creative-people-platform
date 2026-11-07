import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

let storageClient: SupabaseClient | undefined;

const getStorage = (isPrivate = false) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError('Cloud file storage is not configured.', 503);
  }
  storageClient ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return storageClient.storage.from(isPrivate ? env.SUPABASE_PRIVATE_STORAGE_BUCKET : env.SUPABASE_STORAGE_BUCKET);
};

const normalizeKey = (key: string): string => {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => part === '..' || part === '.')) {
    throw new AppError('Invalid cloud storage key.', 400);
  }
  return normalized;
};

export const uploadPublicFile = async (
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> => {
  const bucket = getStorage();
  const storageKey = normalizeKey(key);
  const { error } = await bucket.upload(storageKey, new Uint8Array(buffer), {
    contentType,
    upsert: false,
  });
  if (error) throw new AppError('Cloud file upload failed.', 502);
  return bucket.getPublicUrl(storageKey).data.publicUrl;
};

export const uploadPrivateFile = async (
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> => {
  const bucket = getStorage(true);
  const storageKey = normalizeKey(key);
  const { error } = await bucket.upload(storageKey, new Uint8Array(buffer), {
    contentType,
    upsert: false,
  });
  if (error) throw new AppError('Cloud file upload failed.', 502);
  return storageKey;
};

export const createPrivateFileUrl = async (key: string, expiresInSeconds = 300, downloadName?: string): Promise<string> => {
  const { data, error } = await getStorage(true).createSignedUrl(normalizeKey(key), expiresInSeconds,
    downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) throw new AppError('Cloud file is unavailable.', 404);
  return data.signedUrl;
};

export const deleteCloudFile = async (key: string): Promise<void> => {
  const { error } = await getStorage(true).remove([normalizeKey(key)]);
  if (error) throw new AppError('Cloud file deletion failed.', 502);
};

export const deletePublicFile = async (key: string): Promise<void> => {
  const { error } = await getStorage().remove([normalizeKey(key)]);
  if (error) throw new AppError('Cloud file deletion failed.', 502);
};

export const downloadPrivateFile = async (key: string): Promise<Buffer> => {
  const { data, error } = await getStorage(true).download(normalizeKey(key));
  if (error || !data) throw new AppError('Cloud file is unavailable.', 404);
  return Buffer.from(await data.arrayBuffer());
};

export const listPublicFiles = async (prefix: string): Promise<Array<{ name: string; url: string }>> => {
  const folder = normalizeKey(prefix);
  const { data, error } = await getStorage().list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new AppError('Cloud file listing failed.', 502);
  const bucket = getStorage();
  return (data ?? []).filter((item) => item.name).map((item) => {
    const key = `${folder}/${item.name}`;
    return { name: item.name, url: bucket.getPublicUrl(key).data.publicUrl };
  });
};
