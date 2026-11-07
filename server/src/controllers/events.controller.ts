import type { Request, Response } from 'express';
import { getOwnStats } from '../services/freelancer.service';

export const myStats = async (req: Request, res: Response): Promise<void> => {
  const stats = await getOwnStats(req.user!.id);

  res.status(200).json({
    success: true,
    data: { stats },
  });
};
