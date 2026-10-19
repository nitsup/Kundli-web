import { describe, expect, it } from 'vitest';

import { calculateYogaDosha } from '@/lib/astrology/yoga-dosha';
import { classifyVedicChart } from '@/lib/astrology/vedic-primitives';
import type {
  AstronomicalPosition,
  D1Chart,
  PlanetName,
} from '@/lib/domain/types';
import { yogaDoshaResultSchema } from '@/lib/validation/schemas';

const BODIES: readonly PlanetName[] = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus',
  'saturn', 'uranus', 'neptune', 'pluto', 'rahu', 'ketu',
];

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

function makeChart(
  longitudes: Partial<Record<PlanetName, number>> = {},
  ascendantLongitude = 10,
): D1Chart {
  const classified = classifyVedicChart(
    ascendantLongitude,
    BODIES.map((planet, index) =>
      makePosition(planet, longitudes[planet] ?? 5 + index * 27),
    ),
  );
  const moon = classified.planets.find(({ planet }) => planet === 'moon');
  if (!moon) throw new Error('Synthetic chart is missing its Moon.');
  return {
    id: 'test-d1',
    birthProfileId: 'test-profile',
    chartType: 'd1',
    metadata: { chartSystem: 'vedic' },
    ...classified,
    midheavenLongitude: 0,
    midheavenSign: 'Aries',
    nakshatra: moon.nakshatra,
    status: 'available',
  };
}

function findRule(
  result: ReturnType<typeof calculateYogaDosha>,
  ruleId: string,
) {
  const rule = [...result.yogas, ...result.doshas].find(
    (evaluation) => evaluation.ruleId === ruleId,
  );
  if (!rule) throw new Error(`Missing rule result: ${ruleId}`);
  return rule;
}

describe('versioned D1 Yoga/Dosha rules', () => {
  it('detects same-Rashi Budha-Aditya and Chandra-Mangala conditions with evidence', () => {
    const result = calculateYogaDosha(makeChart({
      sun: 40,
      mercury: 45,
      moon: 190,
      mars: 195,
    }));
    const budhaAditya = findRule(result, 'budha-aditya-yoga');
    const chandraMangala = findRule(result, 'chandra-mangala-yoga');

    expect(budhaAditya).toMatchObject({
      category: 'yoga',
      baseConditionMet: true,
      detected: true,
      cancellationApplied: false,
      conditionEvidence: {
        kind: 'same-rashi',
        satisfied: true,
        placements: [
          { planet: 'sun', rashiId: 'taurus', longitude: 40 },
          { planet: 'mercury', rashiId: 'taurus', longitude: 45 },
        ],
      },
      cancellationEvidence: [],
    });
    expect(chandraMangala).toMatchObject({
      baseConditionMet: true,
      detected: true,
      conditionEvidence: {
        kind: 'same-rashi',
        placements: [
          { planet: 'moon', rashiId: 'libra' },
          { planet: 'mars', rashiId: 'libra' },
        ],
      },
    });
    expect(yogaDoshaResultSchema.safeParse(result).success).toBe(true);
  });

  it('uses half-open Rashi classification for same-sign Yoga boundaries', () => {
    const beforeBoundary = calculateYogaDosha(makeChart({
      sun: 29.999999,
      mercury: 29.999999,
      moon: 10,
      mars: 10,
    }));
    const atBoundary = calculateYogaDosha(makeChart({
      sun: 29.999999,
      mercury: 30,
      moon: 10,
      mars: 30,
    }));

    expect(findRule(beforeBoundary, 'budha-aditya-yoga').detected).toBe(true);
    expect(findRule(atBoundary, 'budha-aditya-yoga')).toMatchObject({
      baseConditionMet: false,
      detected: false,
      conditionEvidence: { satisfied: false },
    });
    expect(findRule(beforeBoundary, 'chandra-mangala-yoga').detected).toBe(true);
    expect(findRule(atBoundary, 'chandra-mangala-yoga').detected).toBe(false);
  });

  it('evaluates Mangala Dosha houses from the canonical Ascendant-based D1 house assignment', () => {
    for (let house = 1; house <= 12; house += 1) {
      const ascendantLongitude = 40;
      const ascendantSignIndex = Math.floor(ascendantLongitude / 30);
      const marsSignIndex = (ascendantSignIndex + house - 1) % 12;
      const marsLongitude = marsSignIndex * 30 + 5;
      const chart = makeChart({ mars: marsLongitude }, ascendantLongitude);
      const dosha = findRule(calculateYogaDosha(chart), 'mangala-dosha');
      const conditionMet = [1, 2, 4, 7, 8, 12].includes(house);
      const cancellationMet = ['aries', 'scorpio', 'capricorn']
        .includes(chart.planets.find(({ planet }) => planet === 'mars')!.rashi.id);

      expect(chart.planets.find(({ planet }) => planet === 'mars')?.house).toBe(house);
      expect(dosha.baseConditionMet).toBe(conditionMet);
      expect(dosha.cancellationApplied).toBe(conditionMet && cancellationMet);
      expect(dosha.detected).toBe(conditionMet && !cancellationMet);
      expect(dosha.conditionEvidence).toMatchObject({
        kind: 'house-from-ascendant',
        house,
        ascendantRashiId: 'taurus',
        requiredHouses: [1, 2, 4, 7, 8, 12],
      });
    }
  });

  it.each([
    ['own-sign', 15, 15, 'own_sign'],
    ['exalted', 280, 280, 'exalted'],
  ] as const)(
    'reports the %s cancellation separately from the base condition',
    (_label, ascendant, mars, dignity) => {
      const dosha = findRule(
        calculateYogaDosha(makeChart({ mars }, ascendant)),
        'mangala-dosha',
      );
      expect(dosha).toMatchObject({
        baseConditionMet: true,
        detected: false,
        cancellationApplied: true,
        conditionEvidence: { satisfied: true },
        cancellationEvidence: [{
          kind: 'dignity-state',
          satisfied: true,
          state: dignity,
          qualifyingStates: ['own_sign', 'moolatrikona', 'exalted'],
        }],
      });
    },
  );

  it('records a qualifying cancellation without applying it when the base condition fails', () => {
    const dosha = findRule(
      calculateYogaDosha(makeChart({ mars: 280 }, 10)),
      'mangala-dosha',
    );
    expect(dosha).toMatchObject({
      baseConditionMet: false,
      detected: false,
      cancellationApplied: false,
      cancellationEvidence: [{
        kind: 'dignity-state',
        satisfied: true,
        state: 'exalted',
      }],
    });
  });

  it('does not let unrelated bodies alter rule results and is timezone independent', () => {
    const chart = makeChart({ sun: 40, mercury: 45, moon: 190, mars: 195 });
    const unrelatedChange = makeChart({
      sun: 40,
      mercury: 45,
      moon: 190,
      mars: 195,
      uranus: 321,
      neptune: 122,
      pluto: 272,
    });
    const before = calculateYogaDosha(chart);
    const previousTimezone = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Honolulu';
      const honolulu = calculateYogaDosha(chart);
      process.env.TZ = 'Europe/Paris';
      const paris = calculateYogaDosha(chart);

      expect(honolulu).toEqual(before);
      expect(paris).toEqual(before);
    } finally {
      if (previousTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previousTimezone;
      }
    }
    expect(calculateYogaDosha(unrelatedChange)).toEqual(before);
  });

  it('rejects self-contradictory rule output in the contract schema', () => {
    const result = calculateYogaDosha(makeChart({ sun: 40, mercury: 45 }));
    expect(yogaDoshaResultSchema.safeParse(result).success).toBe(true);
    expect(yogaDoshaResultSchema.safeParse({
      ...result,
      yogas: result.yogas.map((rule, index) =>
        index === 0 ? { ...rule, detected: false } : rule),
    }).success).toBe(false);
    expect(yogaDoshaResultSchema.safeParse({
      ...result,
      yogas: result.yogas.slice().reverse(),
    }).success).toBe(false);
  });
});
