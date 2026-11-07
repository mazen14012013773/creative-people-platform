import { api, unwrap } from './api';

export type RewardCode = 'FEATURED_PROFILE' | 'BOOST_SERVICE';
export interface RewardsOverview {
  balance: number;
  isVerified: boolean;
  isFeatured: boolean;
  featuredUntil: string | null;
  history: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
  services: Array<{ id: string; title: string }>;
}

export const rewardsApi = {
  get: async (): Promise<RewardsOverview> => unwrap<RewardsOverview>(await api.get('/rewards')),
  redeem: async (reward: RewardCode, serviceId?: string): Promise<{ reward: RewardCode; cost: number; balance: number }> =>
    unwrap(await api.post('/rewards/redeem', { reward, ...(serviceId ? { serviceId } : {}) })),
};
