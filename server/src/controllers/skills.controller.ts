import type { Request, Response } from 'express';
import { listSkills } from '../models/skill.model';

export const getSkills = async (_req: Request, res: Response): Promise<void> => {
  const skills = await listSkills();

  res.status(200).json({
    success: true,
    data: { skills },
  });
};
