import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

export const updateBuyerProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).transform(sanitizePlainText).pipe(z.string().min(2).max(100)),
});

export type UpdateBuyerProfileInput = z.infer<typeof updateBuyerProfileSchema>;
