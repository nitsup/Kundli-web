import { z } from 'zod';

import { AppError } from '@/lib/errors';
import type {
  CalculationConfiguration,
  TransitPlanetPosition,
  TransitResult,
} from '@/lib/domain/types';
import { STRENGTH_TRANSIT_METHODOLOGY_VERSION } from '@/lib/domain/types';
import { getNakshatraPlacement, getRashiPlacement, normalizeLongitude } from '@/lib/astrology/vedic-primitives';
import { swissEphemerisProvider } from '@/lib/astrology/swiss-ephemeris-provider';
import { calculationConfigurationSchema } from '@/lib/validation/calculation-schemas';

const transitInputSchema = z.object({
  requestedInstant: z.string().datetime({ offset: true }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();

export interface TransitCalculationInput {
  requestedInstant: string;
  latitude: number;
  longitude: number;
}

export function calculateTransits(
  inputValue: TransitCalculationInput,
  configurationValue: CalculationConfiguration,
): TransitResult {
  const parsedInput = transitInputSchema.safeParse(inputValue);
  if (!parsedInput.success) {
    throw new AppError('validation', 'Transit input is invalid.', parsedInput.error.issues);
  }
  const parsedConfiguration = calculationConfigurationSchema.safeParse(configurationValue);
  if (!parsedConfiguration.success) {
    throw new AppError(
      'validation',
      'Transit calculation configuration is invalid.',
      parsedConfiguration.error.issues,
    );
  }
  if (parsedConfiguration.data.divisionalCharts?.some((chart) => chart !== 'd1')) {
    throw new AppError(
      'validation',
      'Transit configuration cannot request unsupported divisional charts.',
    );
  }

  const resolvedInstantUtc = new Date(parsedInput.data.requestedInstant).toISOString();
  const astronomical = swissEphemerisProvider.calculateAt(
    resolvedInstantUtc,
    parsedInput.data.latitude,
    parsedInput.data.longitude,
    parsedConfiguration.data,
  );
  const positions: TransitPlanetPosition[] = astronomical.positions.map((position) => {
    const longitude = normalizeLongitude(position.siderealLongitude);
    return {
      planet: position.planet,
      rawSiderealLongitude: position.siderealLongitude,
      longitude,
      tropicalLongitude: normalizeLongitude(position.tropicalLongitude),
      longitudeSpeedDegreesPerDay: position.longitudeSpeedDegreesPerDay,
      retrograde: position.longitudeSpeedDegreesPerDay < 0,
      rashi: getRashiPlacement(longitude),
      nakshatra: getNakshatraPlacement(longitude),
    };
  });

  return {
    methodologyVersion: STRENGTH_TRANSIT_METHODOLOGY_VERSION,
    requestedInstant: parsedInput.data.requestedInstant,
    resolvedInstantUtc,
    julianDayUt: astronomical.julianDayUt,
    location: {
      latitude: parsedInput.data.latitude,
      longitude: parsedInput.data.longitude,
    },
    provider: astronomical.provider,
    positions,
  };
}
