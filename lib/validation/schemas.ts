import { z } from 'zod';

import { DEFAULT_TIMEZONE, isValidTimeZone } from '../timezone';

export const profileSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1).max(120),
  role: z.enum(['user', 'pandit', 'admin']),
  language: z.string().min(2).max(12).default('en'),
  timezone: z.string().refine((value) => isValidTimeZone(value), {
    message: 'timezone must be a valid IANA timezone',
  }).default(DEFAULT_TIMEZONE),
  avatar_url: z.string().url().optional(),
});

export const birthProfileSchema = z.object({
  id: z.string().min(1),
  owner_id: z.string().min(1),
  name: z.string().min(1).max(120),
  date_of_birth: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'date_of_birth must be an ISO-like date',
  }),
  time_of_birth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  birth_time_accuracy: z.enum(['exact', 'approximate', 'unknown']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine((value) => isValidTimeZone(value), {
    message: 'timezone must be a valid IANA timezone',
  }).default(DEFAULT_TIMEZONE),
  notes: z.string().max(2000).optional(),
});

export const locationSchema = z.object({
  country: z.string().min(1),
  state: z.string().optional(),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine((value) => isValidTimeZone(value), {
    message: 'timezone must be a valid IANA timezone',
  }).default(DEFAULT_TIMEZONE),
});
