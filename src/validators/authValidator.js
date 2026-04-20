import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  birthDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid birth date')
    .refine((value) => new Date(value) <= new Date(), 'Birth date cannot be in the future')
    .optional(),
  password: z.string().min(8).max(128),
  role: z.enum(['Seller', 'Bidder']).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  birthDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid birth date')
    .refine((value) => new Date(value) <= new Date(), 'Birth date cannot be in the future')
    .optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(300).optional()
});