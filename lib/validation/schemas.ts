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
  timezoneSource: z.enum(['user', 'geocoding', 'calculation_provider', 'unknown']).optional(),
  locationSource: z.enum(['user', 'geocoding', 'unknown']).optional(),
});

export const calculationConfigurationSchema = z.object({
  chartSystem: z.enum(['vedic', 'western', 'unknown']),
  ayanamsa: z.string().min(1).max(80).optional(),
  houseSystem: z.string().min(1).max(80).optional(),
  divisionalCharts: z.array(z.enum(['d1', 'd7', 'd9', 'd10', 'd12', 'custom'])).max(20).optional(),
}).strict();

export const calculationVersionSchema = z.object({
  engine: z.string().min(1).max(120),
  engineVersion: z.string().min(1).max(120),
  provider: z.string().min(1).max(120).optional(),
  providerVersion: z.string().min(1).max(120).optional(),
  ephemerisVersion: z.string().min(1).max(120).optional(),
  methodologyVersion: z.string().min(1).max(120).optional(),
}).strict();

export const calculationInputSchema = z.object({
  birthProfileId: z.string().min(1),
  name: z.string().min(1).max(120),
  dateOfBirth: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'dateOfBirth must be a valid ISO date'),
  timeOfBirth: z.string().refine((value) => /^(\d{2}):(\d{2})(?::(\d{2}))?$/.test(value) && (() => {
    const [, hours, minutes, seconds] = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)!;
    return Number(hours) < 24 && Number(minutes) < 60 && (!seconds || Number(seconds) < 60);
  })(), 'timeOfBirth must be a valid 24-hour time'),
  timeAccuracy: z.enum(['exact', 'approximate', 'unknown']),
  location: locationSchema,
}).strict();

const planetSchema = z.enum(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']);
const degreePositionSchema = z.object({
  degrees: z.number().min(0).lt(30),
  minutes: z.number().int().min(0).lt(60),
  seconds: z.number().min(0).lt(60).optional(),
});
export const chartMetadataSchema = z.object({
  chartSystem: z.enum(['vedic', 'western', 'unknown']),
  ayanamsa: z.string().optional(),
  houseSystem: z.string().optional(),
  generatedAt: z.string().datetime().optional(),
  provider: z.string().min(1).optional(),
  calculationVersion: z.string().min(1).optional(),
});
export const planetPositionSchema = z.object({
  planet: planetSchema,
  longitude: z.number().min(0).lt(360),
  position: degreePositionSchema,
  sign: z.string().min(1),
  house: z.number().int().min(1).max(12).optional(),
  retrograde: z.boolean().optional(),
  combust: z.boolean().optional(),
  dignity: z.enum(['exalted', 'debilitated', 'own_sign', 'neutral', 'unknown']).optional(),
  nakshatra: z.object({ name: z.string().min(1), lord: planetSchema.optional(), pada: z.number().int().min(1).max(4).optional(), longitude: z.number().min(0).lt(360).optional() }).optional(),
  aspects: z.array(planetSchema).optional(),
  conjunctions: z.array(planetSchema).optional(),
});
export const housePositionSchema = z.object({
  house: z.number().int().min(1).max(12),
  sign: z.string().min(1),
  lord: planetSchema.optional(),
  occupants: z.array(planetSchema).optional(),
  aspects: z.array(planetSchema).optional(),
  startLongitude: z.number().min(0).lt(360).optional(),
  endLongitude: z.number().min(0).lt(360).optional(),
});
export const birthChartSchema = z.object({
  id: z.string().min(1),
  birthProfileId: z.string().min(1),
  chartType: z.enum(['d1', 'd7', 'd9', 'd10', 'd12', 'custom']),
  metadata: chartMetadataSchema,
  planets: z.array(planetPositionSchema),
  houses: z.array(housePositionSchema),
  ascendant: z.string().optional(),
  nakshatra: z.object({ name: z.string().min(1), pada: z.number().int().min(1).max(4).optional(), ruler: planetSchema.optional(), longitude: z.number().min(0).lt(360).optional() }).optional(),
  status: z.enum(['available', 'unavailable', 'pending', 'error']),
});
export const calculationResultSchema = z.object({
  id: z.string().min(1),
  birthProfileId: z.string().min(1),
  input: calculationInputSchema,
  configuration: calculationConfigurationSchema,
  version: calculationVersionSchema,
  charts: z.array(birthChartSchema),
  status: z.enum(['available', 'unavailable', 'pending', 'error']),
  createdAt: z.string().datetime(),
});
export const dashaPeriodSchema = z.object({
  id: z.string().min(1),
  system: z.enum(['vimshottari', 'yogini', 'ashtottari', 'unknown']),
  lord: planetSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  active: z.boolean().optional(),
  parentId: z.string().min(1).optional(),
  status: z.enum(['available', 'unavailable', 'pending', 'error']),
});
export const presentationModeSchema = z.enum(['simple', 'advanced']);
export const reportRequestSchema = z.object({
  birthProfileId: z.string().min(1),
  chartId: z.string().min(1).optional(),
  type: z.enum(['kundli', 'summary', 'dasha', 'yoga', 'dosha', 'matching', 'panchang', 'horoscope']),
  sections: z.array(z.string().min(1)),
  presentationMode: presentationModeSchema,
});
