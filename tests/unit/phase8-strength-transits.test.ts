import { describe, expect, it } from 'vitest';

import { calculateNaisargikaBala } from '@/lib/astrology/planetary-strength';
import { calculateTransits } from '@/lib/astrology/transits';
import { classifyVedicChart } from '@/lib/astrology/vedic-primitives';
import {
  STRENGTH_TRANSIT_METHODOLOGY_VERSION,
  type AstronomicalPosition,
  type D1Chart,
  type PlanetName,
} from '@/lib/domain/types';
import {
  planetaryStrengthResultSchema,
  transitResultSchema,
} from '@/lib/validation/schemas';

const BODIES: readonly PlanetName[] = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus',
  'saturn', 'uranus', 'neptune', 'pluto', 'rahu', 'ketu',
];

const CONFIGURATION = {
  chartSystem: 'vedic',
  zodiacSystem: 'sidereal',
  ayanamsa: 'lahiri',
  nodeType: 'true',
  houseSystem: 'whole_sign',
  calculationFlags: ['swiss_ephemeris', 'speed'],
  methodologyVersion: 'kundli-vedic-core-v1',
} as const;

function makePosition(planet: PlanetName, longitude: number): AstronomicalPosition {
  return {
    planet,
    siderealLongitude: longitude,
    tropicalLongitude: longitude,
    latitude: 0,
    distanceAu: 1,
    longitudeSpeedDegreesPerDay: 0.1,
    latitudeSpeedDegreesPerDay: 0,
    distanceSpeedAuPerDay: 0,
    providerFlags: 258,
  };
}

function makeChart(): D1Chart {
  const classified = classifyVedicChart(
    10,
    BODIES.map((planet, index) => makePosition(planet, index * 27)),
  );
  const moon = classified.planets.find(({ planet }) => planet === 'moon');
  if (!moon) throw new Error('Synthetic chart is missing its Moon.');
  return {
    id: 'phase8-d1',
    birthProfileId: 'phase8-profile',
    chartType: 'd1',
    metadata: { chartSystem: 'vedic' },
    ...classified,
    midheavenLongitude: 0,
    midheavenSign: 'Aries',
    nakshatra: moon.nakshatra,
    status: 'available',
  };
}

describe('Phase 8 planetary strength', () => {
  it('returns exact Naisargika Bala rational evidence for the seven classical planets only', () => {
    const result = calculateNaisargikaBala(makeChart());

    expect(result).toEqual({
      methodologyVersion: STRENGTH_TRANSIT_METHODOLOGY_VERSION,
      chartId: 'phase8-d1',
      system: 'naisargika-bala-component',
      components: [
        { id: 'naisargika-bala', planet: 'saturn', rankRupas: 1, virupaNumerator: 60, virupaDenominator: 7, valueVirupas: 60 / 7, unit: 'virupa' },
        { id: 'naisargika-bala', planet: 'mars', rankRupas: 2, virupaNumerator: 120, virupaDenominator: 7, valueVirupas: 120 / 7, unit: 'virupa' },
        { id: 'naisargika-bala', planet: 'mercury', rankRupas: 3, virupaNumerator: 180, virupaDenominator: 7, valueVirupas: 180 / 7, unit: 'virupa' },
        { id: 'naisargika-bala', planet: 'jupiter', rankRupas: 4, virupaNumerator: 240, virupaDenominator: 7, valueVirupas: 240 / 7, unit: 'virupa' },
        { id: 'naisargika-bala', planet: 'venus', rankRupas: 5, virupaNumerator: 300, virupaDenominator: 7, valueVirupas: 300 / 7, unit: 'virupa' },
        { id: 'naisargika-bala', planet: 'moon', rankRupas: 6, virupaNumerator: 360, virupaDenominator: 7, valueVirupas: 360 / 7, unit: 'virupa' },
        { id: 'naisargika-bala', planet: 'sun', rankRupas: 7, virupaNumerator: 420, virupaDenominator: 7, valueVirupas: 60, unit: 'virupa' },
      ],
    });
    expect(planetaryStrengthResultSchema.safeParse(result).success).toBe(true);
    expect(planetaryStrengthResultSchema.safeParse({
      ...result,
      components: result.components.map((component, index) =>
        index === 0 ? { ...component, virupaNumerator: 61 } : component),
    }).success).toBe(false);
  });

  it('rejects incomplete classical-planet input rather than returning a partial strength result', () => {
    const chart = makeChart();
    expect(() => calculateNaisargikaBala({
      ...chart,
      planets: chart.planets.filter(({ planet }) => planet !== 'saturn'),
    })).toThrow(/each classical planet/i);
  });
});

describe('Phase 8 explicit-instant transit positions', () => {
  it('uses the requested offset instant, preserves metadata, and classifies without rounding', () => {
    const result = calculateTransits({
      requestedInstant: '1999-12-31T19:00:00.000-05:00',
      latitude: 28.6139,
      longitude: 77.209,
    }, CONFIGURATION);

    expect(result).toMatchObject({
      methodologyVersion: STRENGTH_TRANSIT_METHODOLOGY_VERSION,
      requestedInstant: '1999-12-31T19:00:00.000-05:00',
      resolvedInstantUtc: '2000-01-01T00:00:00.000Z',
      location: { latitude: 28.6139, longitude: 77.209 },
      provider: {
        provider: 'Swiss Ephemeris Free Edition',
        providerVersion: '1.3.1',
      },
    });
    expect(result.positions).toHaveLength(12);
    for (const position of result.positions) {
      expect(position.longitude).toBeGreaterThanOrEqual(0);
      expect(position.longitude).toBeLessThan(360);
      expect(position.rashi.longitude).toBe(position.longitude);
      expect(position.nakshatra.longitude).toBe(position.longitude);
      expect(position.retrograde)
        .toBe(position.longitudeSpeedDegreesPerDay < 0);
    }
    expect(transitResultSchema.safeParse(result).success).toBe(true);
    expect(transitResultSchema.safeParse({
      ...result,
      resolvedInstantUtc: '2000-01-01T00:00:01.000Z',
    }).success).toBe(false);
  });

  it.each([
    '2000-02-29T00:00:00.000Z',
    '2024-03-10T06:59:59.999Z',
    '2024-03-10T07:00:00.000Z',
    '2024-11-03T05:59:59.999Z',
    '2024-11-03T06:00:00.000Z',
  ])('is deterministic at explicit calendar instant %s', (requestedInstant) => {
    const input = { requestedInstant, latitude: -33.8688, longitude: 151.2093 };
    const first = calculateTransits(input, CONFIGURATION);
    const second = calculateTransits(input, CONFIGURATION);

    expect(second).toEqual(first);
    expect(first.resolvedInstantUtc).toBe(requestedInstant);
  });

  it('normalizes equivalent offset representations to the same astronomy', () => {
    const utc = calculateTransits({
      requestedInstant: '2000-01-01T00:00:00.000Z',
      latitude: 0,
      longitude: 0,
    }, CONFIGURATION);
    const negativeOffset = calculateTransits({
      requestedInstant: '1999-12-31T19:00:00.000-05:00',
      latitude: 0,
      longitude: 0,
    }, CONFIGURATION);

    expect(negativeOffset.resolvedInstantUtc).toBe(utc.resolvedInstantUtc);
    expect(negativeOffset.julianDayUt).toBe(utc.julianDayUt);
    expect(negativeOffset.positions).toEqual(utc.positions);
  });

  it('rejects timestamps without an explicit offset and out-of-range coordinates', () => {
    expect(() => calculateTransits({
      requestedInstant: '2000-01-01T00:00:00.000',
      latitude: 0,
      longitude: 0,
    }, CONFIGURATION)).toThrow(/invalid/i);
    expect(() => calculateTransits({
      requestedInstant: '2000-01-01T00:00:00.000Z',
      latitude: 91,
      longitude: 0,
    }, CONFIGURATION)).toThrow(/invalid/i);
  });
});
