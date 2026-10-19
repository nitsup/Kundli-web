import { createHash } from 'node:crypto';

import { AppError } from '@/lib/errors';
import type {
  BirthChart,
  CalculationConfiguration,
  CalculationInput,
  CalculationResult,
  D1Chart,
} from '@/lib/domain/types';
import { STRENGTH_TRANSIT_METHODOLOGY_VERSION } from '@/lib/domain/types';
import { calculateVimshottariDasha, VIMSHOTTARI_METHOD_VERSION } from '@/lib/astrology/vimshottari';
import { calculateNaisargikaBala } from '@/lib/astrology/planetary-strength';
import {
  calculateYogaDosha,
  YOGA_DOSHA_METHODOLOGY_VERSION,
} from '@/lib/astrology/yoga-dosha';
import { swissEphemerisProvider } from '@/lib/astrology/swiss-ephemeris-provider';
import {
  classifyVedicChart,
  getRashiPlacement,
  normalizeLongitude,
} from '@/lib/astrology/vedic-primitives';

export type AstrologyCalculationInput = CalculationInput;
export type AstrologyCalculationResult = CalculationResult;

export interface AstrologyCalculationEngine {
  calculate(input: AstrologyCalculationInput, configuration: CalculationConfiguration): Promise<AstrologyCalculationResult>;
  calculateBirthChart(input: AstrologyCalculationInput, configuration: CalculationConfiguration): Promise<BirthChart>;
}

const ENGINE_NAME = 'kundli-astrology-calculation-engine';
const ENGINE_VERSION = '1.1.0';

function createStableHash(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item).sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0)
          .map(([key, entry]) => [key, normalize(entry)]),
      );
    }
    return item;
  };
  return createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
}

function calculate(
  input: AstrologyCalculationInput,
  configuration: CalculationConfiguration,
) {
  const astronomy = swissEphemerisProvider.calculate(input, configuration);
  const classified = classifyVedicChart(
    astronomy.angles.siderealAscendantLongitude,
    astronomy.positions,
  );
  const generatedAt = new Date().toISOString();
  const calculationVersion = {
    engine: ENGINE_NAME,
    engineVersion: ENGINE_VERSION,
    provider: astronomy.provider.provider,
    providerVersion: astronomy.provider.providerVersion,
    ephemerisSource: astronomy.provider.ephemerisSource,
    ephemerisVersion: astronomy.provider.ephemerisVersion,
    methodologyVersion: configuration.methodologyVersion,
    dashaMethodologyVersion: VIMSHOTTARI_METHOD_VERSION,
    yogaDoshaMethodologyVersion: YOGA_DOSHA_METHODOLOGY_VERSION,
    strengthTransitMethodologyVersion: STRENGTH_TRANSIT_METHODOLOGY_VERSION,
  };
  const calculationInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== 'name'),
  );
  const calculationHash = createStableHash({
    input: calculationInput,
    configuration,
    version: calculationVersion,
  });
  const moon = classified.planets.find(({ planet }) => planet === 'moon');
  if (!moon) {
    throw new AppError('calculation', 'Astronomical result is missing the Moon position.');
  }
  const midheavenLongitude = normalizeLongitude(
    astronomy.angles.siderealMidheavenLongitude,
  );
  const chart: D1Chart = {
    id: `chart-${calculationHash.slice(0, 32)}`,
    birthProfileId: input.birthProfileId,
    chartType: 'd1',
    metadata: {
      chartSystem: 'vedic',
      zodiacSystem: 'sidereal',
      ayanamsa: 'Lahiri/Chitrapaksha',
      nodeType: 'true',
      houseSystem: 'whole_sign',
      generatedAt,
      provider: calculationVersion.provider,
      calculationVersion: calculationVersion.engineVersion,
      methodologyVersion: configuration.methodologyVersion,
      version: calculationVersion,
    },
    ...classified,
    midheavenLongitude,
    midheavenSign: getRashiPlacement(midheavenLongitude).name,
    nakshatra: moon.nakshatra,
    status: 'available',
  };
  const dasha = calculateVimshottariDasha(input.birthDateTimeUtc, chart);
  const yogaDosha = calculateYogaDosha(chart);
  const planetaryStrength = calculateNaisargikaBala(chart);
  const result: CalculationResult = {
    id: `calculation-${calculationHash}`,
    birthProfileId: input.birthProfileId,
    input,
    configuration,
    version: calculationVersion,
    charts: [chart],
    dasha,
    yogaDosha,
    planetaryStrength,
    status: 'available',
    createdAt: generatedAt,
  };

  return { chart, result };
}

export const astrologyEngineContract: AstrologyCalculationEngine = {
  async calculate(input, configuration) {
    return calculate(input, configuration).result;
  },
  async calculateBirthChart(input, configuration) {
    return calculate(input, configuration).chart;
  },
};
