import { z } from 'zod';

export const placeBidSchema = z.object({
  auctionId: z.string().min(1),
  bidAmount: z.coerce.number().positive()
});