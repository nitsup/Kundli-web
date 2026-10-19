import { z } from 'zod';

import { isValidTimeZone } from '../timezone';

export const locationSchema = z.object({
  country: z.string().min(1),
  state: z.string().optional(),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine((value) => isValidTimeZone(value), {
    message: 'timezone must be a valid IANA timezone',
  }),
  timezoneSource: z.enum(['user', 'geocoding', 'calculation_provider', 'unknown']),
  locationSource: z.enum(['user', 'geocoding', 'unknown']),
  canonicalPlaceId: z.string().min(1).max(200).optional(),
  resolverName: z.string().min(1).max(120).optional(),
  resolverVersion: z.string().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
}).strict();
