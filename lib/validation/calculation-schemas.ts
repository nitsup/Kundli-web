import { z } from 'zod';

import { CHART_TYPES, VEDIC_METHODOLOGY_VERSION } from '../domain/types';
import {
  isLocalBirthTimeConsistentWithOffset,
  resolveLocalBirthTime,
} from '../timezone';
import { locationSchema } from './location-schema';

export const calculationConfigurationSchema = z.object({
  chartSystem: z.literal('vedic'),
  zodiacSystem: z.literal('sidereal'),
  ayanamsa: z.literal('lahiri'),
  nodeType: z.literal('true'),
  houseSystem: z.literal('whole_sign'),
  calculationFlags: z.array(z.enum(['swiss_ephemeris', 'speed'])).length(2)
    .refine((flags) => new Set(flags).size === flags.length, {
      message: 'calculationFlags must contain each enabled flag once',
    })
    .refine((flags) => flags.includes('swiss_ephemeris') && flags.includes('speed'), {
      message: 'Swiss Ephemeris and speed flags are required',
    }),
  methodologyVersion: z.literal(VEDIC_METHODOLOGY_VERSION),
  divisionalCharts: z.array(z.enum(CHART_TYPES)).max(20).optional(),
}).strict();

export const calculationVersionSchema = z.object({
  engine: z.string().min(1).max(120),
  engineVersion: z.string().min(1).max(120),
  provider: z.string().min(1).max(120).optional(),
  providerVersion: z.string().min(1).max(120).optional(),
  ephemerisSource: z.string().min(1).max(240).optional(),
  ephemerisVersion: z.string().min(1).max(120).optional(),
  methodologyVersion: z.string().min(1).max(120).optional(),
  dashaMethodologyVersion: z.string().min(1).max(120).optional(),
  yogaDoshaMethodologyVersion: z.string().min(1).max(120).optional(),
  strengthTransitMethodologyVersion: z.string().min(1).max(120).optional(),
}).strict();

export const calculationInputSchema = z.object({
  birthProfileId: z.string().min(1),
  name: z.string().min(1).max(120),
  dateOfBirth: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    if (Number(value.slice(0, 4)) < 1) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'dateOfBirth must be a valid ISO date'),
  timeOfBirth: z.string().refine((value) => /^(\d{2}):(\d{2})(?::(\d{2}))?$/.test(value) && (() => {
    const [, hours, minutes, seconds] = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)!;
    return Number(hours) < 24 && Number(minutes) < 60 && (!seconds || Number(seconds) < 60);
  })(), 'timeOfBirth must be a valid 24-hour time'),
  birthDateTimeUtc: z.string().datetime({ offset: false }),
  timezoneOffset: z.string().regex(/^[+-]\d{2}:\d{2}(?::\d{2})?$/),
  timezoneDatabaseVersion: z.string().min(1).max(32).regex(/^[A-Za-z0-9._+-]+$/),
  dstFoldResolution: z.enum(['earlier', 'later']).optional(),
  timeAccuracy: z.enum(['exact', 'approximate', 'unknown']),
  location: locationSchema,
}).strict().superRefine((input, context) => {
  const runtimeTimezoneDatabaseVersion = process.versions.tz;
  if (!runtimeTimezoneDatabaseVersion) {
    context.addIssue({
      code: 'custom',
      path: ['timezoneDatabaseVersion'],
      message: 'The Node runtime timezone database version is unavailable',
    });
    return;
  }

  if (input.timezoneDatabaseVersion !== runtimeTimezoneDatabaseVersion) {
    if (!isLocalBirthTimeConsistentWithOffset(
      input.dateOfBirth,
      input.timeOfBirth,
      input.birthDateTimeUtc,
      input.timezoneOffset,
    )) {
      context.addIssue({
        code: 'custom',
        path: ['birthDateTimeUtc'],
        message: 'UTC instant and recorded offset do not match the local birth date and time',
      });
    }
    return;
  }

  try {
    const resolved = resolveLocalBirthTime(
      input.dateOfBirth,
      input.timeOfBirth,
      input.location.timezone,
      input.dstFoldResolution,
    );
    if (resolved.birthDateTimeUtc !== input.birthDateTimeUtc) {
      context.addIssue({
        code: 'custom',
        path: ['birthDateTimeUtc'],
        message: 'UTC instant does not match the local birth date, time, timezone, and fold choice',
      });
    }
    if (resolved.timezoneOffset !== input.timezoneOffset) {
      context.addIssue({
        code: 'custom',
        path: ['timezoneOffset'],
        message: 'Timezone offset does not match the local birth date and timezone',
      });
    }
  } catch (error) {
    context.addIssue({
      code: 'custom',
      path: ['birthDateTimeUtc'],
      message: error instanceof Error ? error.message : 'Birth local time cannot be resolved',
    });
  }
});
