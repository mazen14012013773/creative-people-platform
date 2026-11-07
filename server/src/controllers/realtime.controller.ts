import type { Request, Response } from 'express';
import { openRealtimeStream } from '../services/realtime.service';

export const stream = (req: Request, res: Response): void => {
  openRealtimeStream(req.user!.id, res);
};
