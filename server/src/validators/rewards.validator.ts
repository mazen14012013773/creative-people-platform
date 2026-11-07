import { z } from 'zod';

export const redeemRewardSchema = z.object({
  reward: z.enum(['FEATURED_PROFILE', 'BOOST_SERVICE']),
  serviceId: z.string().uuid().optional(),
});

export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
