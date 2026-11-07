import type {
  IpBlock,
  ModerationFlag,
  ModerationResult,
  ModerationScanResult,
  Pagination,
  SessionsResult,
  SystemHealth,
  SystemSettingsPayload,
  SystemStatus,
} from '@/types';
import { api, unwrap } from './api';

export interface SessionsParams {
  q?: string;
  includeRevoked?: boolean;
  page?: number;
  limit?: number;
}

export interface ModerationParams {
  status?: 'Pending' | 'Resolved' | 'Dismissed';
  severity?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

export interface AdminSettingsResult {
  system: SystemStatus;
  blockedTerms: string[];
}

export interface IpBlocksResult {
  items: IpBlock[];
  pagination: Pagination;
}

export interface RestoreBackupResult {
  restored: Record<string, number>;
  skippedTables: string[];
  droppedColumns: string[];
}

export interface ResetDataResult {
  deleted: Record<string, number>;
  files: { removedEntries: number; errors: string[] };
  keptAdmins: number;
}

export const systemApi = {
  status: async (): Promise<SystemStatus> => {
    const response = await api.get('/system/status');
    return unwrap<{ system: SystemStatus }>(response).system;
  },

  health: async (): Promise<SystemHealth> => {
    const response = await api.get('/admin/system/health');
    return unwrap<{ metrics: SystemHealth }>(response).metrics;
  },

  settings: async (): Promise<AdminSettingsResult> => {
    const response = await api.get('/admin/system/settings');
    return unwrap<AdminSettingsResult>(response);
  },

  saveSettings: async (payload: SystemSettingsPayload): Promise<SystemStatus> => {
    const response = await api.patch('/admin/system/settings', payload);
    return unwrap<{ system: SystemStatus }>(response).system;
  },

  sessions: async (params: SessionsParams): Promise<SessionsResult> => {
    const response = await api.get('/admin/system/sessions', { params });
    return unwrap<SessionsResult>(response);
  },

  revokeSession: async (sessionId: number, reason: string): Promise<void> => {
    await api.post(`/admin/system/sessions/${sessionId}/revoke`, { reason });
  },

  forceLogout: async (userId: string, reason: string): Promise<number> => {
    const response = await api.post(`/admin/system/users/${userId}/revoke-all`, { reason });
    return unwrap<{ revoked: number }>(response).revoked;
  },

  ipBlocks: async (params: { page?: number; limit?: number }): Promise<IpBlocksResult> => {
    const response = await api.get('/admin/system/ip-blocks', { params });
    return unwrap<IpBlocksResult>(response);
  },

  blockIp: async (payload: {
    ip: string;
    reason: string;
    hours: number | null;
  }): Promise<IpBlock> => {
    const response = await api.post('/admin/system/ip-blocks', payload);
    return unwrap<{ block: IpBlock }>(response).block;
  },

  unblockIp: async (ip: string): Promise<void> => {
    await api.delete(`/admin/system/ip-blocks/${encodeURIComponent(ip)}`);
  },

  flags: async (params: ModerationParams): Promise<ModerationResult> => {
    const response = await api.get('/admin/system/moderation', { params });
    return unwrap<ModerationResult>(response);
  },

  actOnFlag: async (
    flagId: string,
    action: 'Resolve' | 'Dismiss' | 'Reopen',
    reason: string,
  ): Promise<ModerationFlag> => {
    const response = await api.patch(`/admin/system/moderation/${flagId}`, { action, reason });
    return unwrap<{ flag: ModerationFlag }>(response).flag;
  },

  cleanupFlag: async (flagId: string, reason: string): Promise<ModerationFlag> => {
    const response = await api.post(`/admin/system/moderation/${flagId}/cleanup`, { reason });
    return unwrap<{ flag: ModerationFlag }>(response).flag;
  },

  rescan: async (reason: string): Promise<ModerationScanResult> => {
    const response = await api.post('/admin/system/moderation/rescan', { reason });
    return unwrap<{ scan: ModerationScanResult }>(response).scan;
  },

  downloadBackup: async (): Promise<Blob> => {
    const response = await api.get('/admin/system/backup', { responseType: 'blob' });
    return response.data as Blob;
  },

  restoreBackup: async (file: File, reason: string): Promise<RestoreBackupResult> => {
    const form = new FormData();
    form.append('backup', file);
    form.append('reason', reason);
    const response = await api.post('/admin/system/restore', form, {
      headers: { 'Content-Type': null },
    });
    return unwrap<RestoreBackupResult>(response);
  },

  resetData: async (reason: string): Promise<ResetDataResult> => {
    const response = await api.post('/admin/system/reset-data', {
      confirmCode: 'RESET_ALL_DATA',
      reason,
    });
    return unwrap<ResetDataResult>(response);
  },
};
