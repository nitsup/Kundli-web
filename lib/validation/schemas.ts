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
  owner_id: z.string().min(1).optional(),
  client_id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  date_of_birth: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, {
    message: 'date_of_birth must be a valid ISO date',
  }),
  time_of_birth: z.string().refine((value) => {
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (!match) {
      return false;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = match[3] ? Number(match[3]) : 0;
    return hours < 24 && minutes < 60 && seconds < 60;
  }, {
    message: 'time_of_birth must be a valid 24-hour time',
  }),
  birth_time_accuracy: z.enum(['exact', 'approximate', 'unknown']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine((value) => isValidTimeZone(value), {
    message: 'timezone must be a valid IANA timezone',
  }).default(DEFAULT_TIMEZONE),
  notes: z.string().max(2000).optional(),
}).refine(({ owner_id, client_id }) => Boolean(owner_id) !== Boolean(client_id), {
  message: 'exactly one of owner_id or client_id is required',
  path: ['owner_id'],
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
