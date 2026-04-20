import { z } from 'zod';

const auctionBaseSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(80),
  images: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    return [value];
  }, z.array(z.string()).optional()),
  basePrice: z.coerce.number().positive(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date()
});

export const createAuctionSchema = auctionBaseSchema.refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const updateAuctionSchema = auctionBaseSchema.partial().refine((data) => {
  if (!data.startTime || !data.endTime) return true;
  return data.endTime > data.startTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const auctionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  status: z.enum(['Upcoming', 'Live', 'Ended']).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['newest', 'endingSoon', 'priceAsc', 'priceDesc']).default('newest'),
  endingSoon: z.coerce.boolean().optional()
});