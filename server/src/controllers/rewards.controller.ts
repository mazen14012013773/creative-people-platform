import type { Request, Response } from 'express';
import { getRewards, redeemReward } from '../models/rewards.model';
import type { RedeemRewardInput } from '../validators/rewards.validator';

export const showRewards = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: await getRewards(req.user!.id) });
};

export const redeem = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as RedeemRewardInput;
  res.status(201).json({ success: true, data: await redeemReward(req.user!.id, input.reward, input.serviceId) });
};
