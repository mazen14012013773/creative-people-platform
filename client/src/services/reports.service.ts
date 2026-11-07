import { api, unwrap } from './api';

export type ReportCategory = 'FRAUD' | 'INAPPROPRIATE' | 'IMPERSONATION' | 'NONCOMPLIANCE' | 'OTHER';
export const reportsApi = {
  submit: async (reportedUserId: string, reasonCategory: ReportCategory, description: string, files: File[]) => {
    const form = new FormData();
    form.append('reportedUserId', reportedUserId);
    form.append('reasonCategory', reasonCategory);
    form.append('description', description);
    files.forEach((file) => form.append('proofFiles', file));
    const response = await api.post('/reports', form, { headers: { 'Content-Type': null } });
    return unwrap<{ report: { id: string; status: string; createdAt: string } }>(response).report;
  },
};
