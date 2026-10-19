import { z } from 'zod';

import {
  CHART_TYPES,
  STRENGTH_TRANSIT_METHODOLOGY_VERSION,
} from '../domain/types';
import {
  CLASSICAL_DIGNITY_DATASET,
  NAKSHATRA_DATASET,
  RASHI_DATASET,
  getDignityAssessment,
  getNakshatraPlacement,
  getRashiPlacement,
  normalizeLongitude,
} from '../astrology/vedic-primitives';
import {
  getVimshottariAntardashaBoundaries,
  getVimshottariMahadashaDurationMicroseconds,
  VIMSHOTTARI_SEQUENCE,
  VIMSHOTTARI_METHOD_VERSION,
  VIMSHOTTARI_SECONDS_PER_YEAR,
  VIMSHOTTARI_MICROSECONDS_PER_YEAR,
  VIMSHOTTARI_CYCLE_YEARS,
  progressToDuration,
} from '../astrology/vimshottari';
import {
  calculateYogaDosha,
  YOGA_DOSHA_METHODOLOGY_VERSION,
} from '../astrology/yoga-dosha';
import type { YogaDoshaChartInput } from '../astrology/yoga-dosha';
import {
  calculateNaisargikaBala,
  NAISARGIKA_PLANET_ORDER,
} from '../astrology/planetary-strength';
import {
  calculationConfigurationSchema,
  calculationInputSchema,
  calculationVersionSchema,
} from './calculation-schemas';
import { locationSchema } from './location-schema';
import { DEFAULT_TIMEZONE, isValidTimeZone } from '../timezone';

export {
  calculationConfigurationSchema,
  calculationInputSchema,
  calculationVersionSchema,
  locationSchema,
};

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
    if (Number(value.slice(0, 4)) < 1) {
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
  }),
  notes: z.string().max(2000).optional(),
}).refine(({ owner_id, client_id }) => Boolean(owner_id) !== Boolean(client_id), {
  message: 'exactly one of owner_id or client_id is required',
  path: ['owner_id'],
});

const planetSchema = z.enum(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'uranus', 'neptune', 'pluto', 'rahu', 'ketu']);
const rashiLordSchema = z.enum(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']);
const nakshatraLordSchema = z.enum(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']);
const degreePositionSchema = z.object({
  degrees: z.number().min(0).lt(30),
  minutes: z.number().int().min(0).lt(60),
  seconds: z.number().min(0).lt(60).optional(),
});
const rashiIdSchema = z.string().refine(
  (id) => RASHI_DATASET.some((rashi) => rashi.id === id),
  'Unknown Rashi identifier',
);
const nakshatraIdSchema = z.string().refine(
  (id) => NAKSHATRA_DATASET.some((nakshatra) => nakshatra.id === id),
  'Unknown Nakshatra identifier',
);
const rashiPlacementSchema = z.object({
  id: rashiIdSchema,
  index: z.number().int().min(1).max(12),
  name: z.string().min(1),
  sanskritName: z.string().min(1),
  lord: rashiLordSchema,
  startLongitude: z.number().min(0).lt(360),
  endLongitude: z.number().gt(0).max(360),
  longitude: z.number().min(0).lt(360),
  degreeWithinRashi: z.number().min(0).lt(30),
}).superRefine((placement, context) => {
  const expected = getRashiPlacement(placement.longitude);
  if (
    placement.id !== expected.id ||
    placement.index !== expected.index ||
    placement.name !== expected.name ||
    placement.sanskritName !== expected.sanskritName ||
    placement.lord !== expected.lord ||
    placement.startLongitude !== expected.startLongitude ||
    placement.endLongitude !== expected.endLongitude ||
    placement.degreeWithinRashi !== expected.degreeWithinRashi
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Rashi classification must match its unrounded sidereal longitude',
    });
  }
});
const nakshatraPlacementSchema = z.object({
  id: nakshatraIdSchema,
  index: z.number().int().min(1).max(27),
  name: z.string().min(1),
  lord: nakshatraLordSchema,
  startLongitude: z.number().min(0).lt(360),
  endLongitude: z.number().gt(0).max(360),
  padaBoundaries: z.tuple([
    z.number().min(0).lt(360),
    z.number().min(0).lt(360),
    z.number().min(0).lt(360),
    z.number().min(0).lt(360),
    z.number().gt(0).max(360),
  ]),
  pada: z.number().int().min(1).max(4),
  degreeWithinNakshatra: z.number().min(0).lt(360 / 27),
  longitude: z.number().min(0).lt(360),
  degreePosition: degreePositionSchema,
}).superRefine((placement, context) => {
  const expected = getNakshatraPlacement(placement.longitude);
  if (
    placement.id !== expected.id ||
    placement.index !== expected.index ||
    placement.name !== expected.name ||
    placement.lord !== expected.lord ||
    placement.startLongitude !== expected.startLongitude ||
    placement.endLongitude !== expected.endLongitude ||
    placement.pada !== expected.pada ||
    placement.degreeWithinNakshatra !== expected.degreeWithinNakshatra ||
    JSON.stringify(placement.degreePosition) !== JSON.stringify(expected.degreePosition) ||
    placement.padaBoundaries.some((boundary, index) => boundary !== expected.padaBoundaries[index])
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Nakshatra/Pada classification must match its unrounded sidereal longitude',
    });
  }
});
const dignityAssessmentSchema = z.object({
  state: z.enum(['exalted', 'debilitated', 'moolatrikona', 'own_sign', 'neutral', 'not_applicable']),
  sign: rashiIdSchema,
  degreeWithinSign: z.number().min(0).lt(30),
  moolatrikonaRange: z.object({
    sign: rashiIdSchema,
    startDegree: z.number().min(0).lt(30),
    endDegree: z.number().gt(0).max(30),
  }).optional(),
});
export const chartMetadataSchema = z.object({
  chartSystem: z.enum(['vedic', 'western', 'unknown']),
  zodiacSystem: z.enum(['sidereal', 'tropical']).optional(),
  ayanamsa: z.string().optional(),
  nodeType: z.enum(['true', 'mean']).optional(),
  houseSystem: z.string().optional(),
  calculationFlags: z.array(z.number().int().nonnegative()).optional(),
  generatedAt: z.string().datetime().optional(),
  provider: z.string().min(1).optional(),
  calculationVersion: z.string().min(1).optional(),
  methodologyVersion: z.string().min(1).max(120).optional(),
  version: calculationVersionSchema.optional(),
});
export const planetPositionSchema = z.object({
  planet: planetSchema,
  rawSiderealLongitude: z.number(),
  longitude: z.number().min(0).lt(360),
  rawTropicalLongitude: z.number().optional(),
  tropicalLongitude: z.number().min(0).lt(360).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  distanceAu: z.number().nonnegative().optional(),
  longitudeSpeedDegreesPerDay: z.number().optional(),
  latitudeSpeedDegreesPerDay: z.number().optional(),
  distanceSpeedAuPerDay: z.number().optional(),
  providerFlags: z.number().int().nonnegative().optional(),
  position: degreePositionSchema,
  sign: z.string().min(1),
  rashi: rashiPlacementSchema,
  house: z.number().int().min(1).max(12),
  retrograde: z.boolean().optional(),
  combust: z.boolean().optional(),
  dignity: dignityAssessmentSchema,
  nakshatra: nakshatraPlacementSchema,
  aspects: z.array(planetSchema).optional(),
  conjunctions: z.array(planetSchema).optional(),
}).superRefine((position, context) => {
  const normalizedLongitude = normalizeLongitude(position.rawSiderealLongitude);
  const dignityIsApplicable = CLASSICAL_DIGNITY_DATASET[position.planet] !== undefined;

  if (position.longitude !== normalizedLongitude || position.rashi.longitude !== normalizedLongitude) {
    context.addIssue({
      code: 'custom',
      path: ['longitude'],
      message: 'Normalized sidereal longitude must match the raw provider longitude',
    });
  }
  if (
    position.rawTropicalLongitude !== undefined &&
    position.tropicalLongitude !== normalizeLongitude(position.rawTropicalLongitude)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['tropicalLongitude'],
      message: 'Normalized tropical longitude must match the raw provider longitude',
    });
  }
  if (position.nakshatra.longitude !== normalizedLongitude) {
    context.addIssue({
      code: 'custom',
      path: ['nakshatra', 'longitude'],
      message: 'Nakshatra/Pada must use the normalized sidereal longitude',
    });
  }
  if (position.sign !== position.rashi.name) {
    context.addIssue({
      code: 'custom',
      path: ['sign'],
      message: 'Sign name must match the structured Rashi classification',
    });
  }
  if (
    position.position.degrees !== Math.floor(position.rashi.degreeWithinRashi) ||
    position.position.minutes !== Math.floor(
      (position.rashi.degreeWithinRashi - position.position.degrees) * 60,
    )
  ) {
    context.addIssue({
      code: 'custom',
      path: ['position'],
      message: 'Displayed Rashi degree must derive from the unrounded longitude',
    });
  }
  if (
    position.dignity.sign !== position.rashi.id ||
    position.dignity.degreeWithinSign !== position.rashi.degreeWithinRashi
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dignity'],
      message: 'Dignity assessment must match the classified sign and degree',
    });
  }
  const expectedDignity = getDignityAssessment(
    position.planet,
    getRashiPlacement(position.rashi.longitude),
  );
  if (
    position.dignity.state !== expectedDignity.state ||
    JSON.stringify(position.dignity.moolatrikonaRange) !==
      JSON.stringify(expectedDignity.moolatrikonaRange)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dignity'],
      message: 'Dignity assessment must match the versioned classical dataset',
    });
  }
  if (
    dignityIsApplicable === (position.dignity.state === 'not_applicable')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dignity', 'state'],
      message: 'Classical dignity applicability does not match the body type',
    });
  }
});
export const housePositionSchema = z.object({
  house: z.number().int().min(1).max(12),
  signId: rashiIdSchema,
  sign: z.string().min(1),
  lord: rashiLordSchema,
  occupants: z.array(planetSchema),
  aspects: z.array(planetSchema).optional(),
  startLongitude: z.number().min(0).lt(360),
  endLongitude: z.number().gt(0).max(360),
});
export const birthChartSchema = z.object({
  id: z.string().min(1),
  birthProfileId: z.string().min(1),
  chartType: z.enum(CHART_TYPES),
  metadata: chartMetadataSchema,
  planets: z.array(planetPositionSchema),
  houses: z.array(housePositionSchema),
  ascendant: z.string().min(1),
  ascendantLongitude: z.number().min(0).lt(360),
  ascendantDegree: degreePositionSchema,
  ascendantRashi: rashiPlacementSchema,
  ascendantNakshatra: nakshatraPlacementSchema,
  midheavenLongitude: z.number().min(0).lt(360),
  midheavenSign: z.string().min(1),
  nakshatra: nakshatraPlacementSchema,
  status: z.enum(['available', 'unavailable', 'pending', 'error']),
}).superRefine((chart, context) => {
  if (
    chart.ascendantLongitude !== chart.ascendantRashi.longitude ||
    chart.ascendant !== chart.ascendantRashi.name ||
    chart.ascendantNakshatra.longitude !== chart.ascendantLongitude ||
    chart.ascendantDegree.degrees !== Math.floor(chart.ascendantRashi.degreeWithinRashi) ||
    chart.ascendantDegree.minutes !== Math.floor(
      (chart.ascendantRashi.degreeWithinRashi - chart.ascendantDegree.degrees) * 60,
    ) ||
    chart.midheavenSign !== getRashiPlacement(chart.midheavenLongitude).name
  ) {
    context.addIssue({
      code: 'custom',
      path: ['ascendantRashi'],
      message: 'Ascendant Rashi must match the normalized sidereal ascendant',
    });
  }
  if (chart.planets.length !== 12 || chart.houses.length !== 12) {
    context.addIssue({
      code: 'custom',
      path: ['houses'],
      message: 'D1 Whole Sign chart must contain twelve houses and twelve astronomical points',
    });
  }
  const expectedPlanets = [
    'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn',
    'uranus', 'neptune', 'pluto', 'rahu', 'ketu',
  ];
  if (
    new Set(chart.planets.map(({ planet }) => planet)).size !== expectedPlanets.length ||
    expectedPlanets.some((planet) => !chart.planets.some((position) => position.planet === planet))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['planets'],
      message: 'D1 chart must contain each supported astronomical body exactly once',
    });
  }
  const ascendantIndex = chart.ascendantRashi.index - 1;
  chart.houses.forEach((house, houseOffset) => {
    const expectedRashi = RASHI_DATASET[(ascendantIndex + houseOffset) % 12];
    if (
      house.house !== houseOffset + 1 ||
      house.signId !== expectedRashi.id ||
      house.sign !== expectedRashi.name ||
      house.lord !== expectedRashi.lord ||
      house.startLongitude !== expectedRashi.startLongitude ||
      house.endLongitude !== expectedRashi.endLongitude
    ) {
      context.addIssue({
        code: 'custom',
        path: ['houses', houseOffset],
        message: 'Whole Sign house must match the Ascendant Rashi sequence',
      });
    }
    const expectedOccupants = chart.planets
      .filter((planet) => planet.house === houseOffset + 1)
      .map(({ planet }) => planet)
      .sort();
    if ([...house.occupants].sort().join(',') !== expectedOccupants.join(',')) {
      context.addIssue({
        code: 'custom',
        path: ['houses', houseOffset, 'occupants'],
        message: 'Whole Sign house occupants must match the planets assigned to that house',
      });
    }
  });
  const moon = chart.planets.find(({ planet }) => planet === 'moon');
  if (!moon || JSON.stringify(chart.nakshatra) !== JSON.stringify(moon.nakshatra)) {
    context.addIssue({
      code: 'custom',
      path: ['nakshatra'],
      message: 'Chart Nakshatra summary must match the Moon classification',
    });
  }
  chart.planets.forEach((planet, planetIndex) => {
    const expectedHouse = ((planet.rashi.index - 1 - ascendantIndex + 12) % 12) + 1;
    if (planet.house !== expectedHouse) {
      context.addIssue({
        code: 'custom',
        path: ['planets', planetIndex, 'house'],
        message: 'Planet house must be derived from its Rashi and Ascendant Rashi',
      });
    }
  });
});
const yogaDoshaEvidenceSchema = z.discriminatedUnion('kind', [
  z.object({
    conditionId: z.string().min(1),
    kind: z.literal('same-rashi'),
    satisfied: z.boolean(),
    placements: z.array(z.object({
      planet: planetSchema,
      rashiId: rashiIdSchema,
      longitude: z.number().min(0).lt(360),
    }).strict()).length(2),
  }).strict(),
  z.object({
    conditionId: z.string().min(1),
    kind: z.literal('house-from-ascendant'),
    satisfied: z.boolean(),
    planet: planetSchema,
    planetRashiId: rashiIdSchema,
    house: z.number().int().min(1).max(12),
    ascendantRashiId: rashiIdSchema,
    requiredHouses: z.array(z.number().int().min(1).max(12)).length(6),
  }).strict(),
  z.object({
    conditionId: z.string().min(1),
    kind: z.literal('dignity-state'),
    satisfied: z.boolean(),
    planet: planetSchema,
    rashiId: rashiIdSchema,
    state: z.enum([
      'exalted', 'debilitated', 'moolatrikona', 'own_sign', 'neutral', 'not_applicable',
    ]),
    qualifyingStates: z.array(z.enum([
      'exalted', 'debilitated', 'moolatrikona', 'own_sign', 'neutral', 'not_applicable',
    ])).min(1),
  }).strict(),
]);

const astrologyRuleEvaluationSchema = z.object({
  ruleId: z.enum(['budha-aditya-yoga', 'chandra-mangala-yoga', 'mangala-dosha']),
  name: z.string().min(1),
  methodologyVersion: z.literal(YOGA_DOSHA_METHODOLOGY_VERSION),
  category: z.enum(['yoga', 'dosha']),
  baseConditionMet: z.boolean(),
  detected: z.boolean(),
  cancellationApplied: z.boolean(),
  conditionEvidence: yogaDoshaEvidenceSchema,
  cancellationEvidence: z.array(yogaDoshaEvidenceSchema),
}).strict().superRefine((evaluation, context) => {
  const cancellationApplied = evaluation.baseConditionMet &&
    evaluation.cancellationEvidence.some(({ satisfied }) => satisfied);
  if (
    evaluation.conditionEvidence.satisfied !== evaluation.baseConditionMet ||
    evaluation.cancellationApplied !== cancellationApplied ||
    evaluation.detected !== (evaluation.baseConditionMet && !cancellationApplied)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Rule detection must agree with its base condition and cancellation evidence',
    });
  }
});

export const yogaDoshaResultSchema = z.object({
  methodologyVersion: z.literal(YOGA_DOSHA_METHODOLOGY_VERSION),
  chartId: z.string().min(1),
  yogas: z.array(astrologyRuleEvaluationSchema).length(2),
  doshas: z.array(astrologyRuleEvaluationSchema).length(1),
}).strict().superRefine((result, context) => {
  const expectedYogaIds = ['budha-aditya-yoga', 'chandra-mangala-yoga'];
  const evaluations = [...result.yogas, ...result.doshas];
  if (
    result.yogas.some((rule, index) =>
      rule.ruleId !== expectedYogaIds[index] || rule.category !== 'yoga') ||
    result.doshas[0]?.ruleId !== 'mangala-dosha' ||
    result.doshas[0]?.category !== 'dosha' ||
    evaluations.some((rule) => rule.methodologyVersion !== result.methodologyVersion)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Yoga/Dosha rules must use the canonical ordered rule set',
    });
  }
});

const naisargikaBalaComponentSchema = z.object({
  id: z.literal('naisargika-bala'),
  planet: rashiLordSchema,
  rankRupas: z.number().int().min(1).max(7),
  virupaNumerator: z.number().int().positive(),
  virupaDenominator: z.literal(7),
  valueVirupas: z.number().positive(),
  unit: z.literal('virupa'),
}).strict();

export const planetaryStrengthResultSchema = z.object({
  methodologyVersion: z.literal(STRENGTH_TRANSIT_METHODOLOGY_VERSION),
  chartId: z.string().min(1),
  system: z.literal('naisargika-bala-component'),
  components: z.array(naisargikaBalaComponentSchema).length(7),
}).strict().superRefine((result, context) => {
  const planets = result.components.map(({ planet }) => planet);
  const completePlanetSet = planets.length === NAISARGIKA_PLANET_ORDER.length &&
    new Set(planets).size === NAISARGIKA_PLANET_ORDER.length &&
    NAISARGIKA_PLANET_ORDER.every(({ planet }) => planets.includes(planet));
  const expected = completePlanetSet
    ? calculateNaisargikaBala({
        id: result.chartId,
        planets: planets.map((planet) => ({ planet })),
      })
    : undefined;
  if (!expected || !structurallyEqual(expected, result)) {
    context.addIssue({
      code: 'custom',
      message: 'Naisargika Bala values must match the canonical seven-planet table',
    });
  }
});

const transitPlanetPositionSchema = z.object({
  planet: planetSchema,
  rawSiderealLongitude: z.number(),
  longitude: z.number().min(0).lt(360),
  tropicalLongitude: z.number().min(0).lt(360),
  longitudeSpeedDegreesPerDay: z.number(),
  retrograde: z.boolean(),
  rashi: rashiPlacementSchema,
  nakshatra: nakshatraPlacementSchema,
}).strict();

export const transitResultSchema = z.object({
  methodologyVersion: z.literal(STRENGTH_TRANSIT_METHODOLOGY_VERSION),
  requestedInstant: z.string().datetime({ offset: true }),
  resolvedInstantUtc: z.string().datetime({ offset: false }),
  julianDayUt: z.number().finite(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).strict(),
  provider: z.object({
    provider: z.string().min(1),
    providerVersion: z.string().min(1),
    ephemerisSource: z.string().min(1),
    ephemerisVersion: z.string().min(1),
  }).strict(),
  positions: z.array(transitPlanetPositionSchema).length(12),
}).strict().superRefine((result, context) => {
  const expectedInstant = new Date(Date.parse(result.requestedInstant));
  const expectedPlanets = [
    'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
    'saturn', 'uranus', 'neptune', 'pluto', 'rahu', 'ketu',
  ];
  const normalizedPosition = result.positions.every((position) => {
    const longitude = normalizeLongitude(position.rawSiderealLongitude);
    const expectedRashi = getRashiPlacement(longitude);
    const expectedNakshatra = getNakshatraPlacement(longitude);
    return position.longitude === longitude &&
      position.retrograde === (position.longitudeSpeedDegreesPerDay < 0) &&
      structurallyEqual(position.rashi, expectedRashi) &&
      structurallyEqual(position.nakshatra, expectedNakshatra);
  });
  const rahu = result.positions.find(({ planet }) => planet === 'rahu');
  const ketu = result.positions.find(({ planet }) => planet === 'ketu');
  if (
    !Number.isFinite(expectedInstant.getTime()) ||
    expectedInstant.toISOString() !== result.resolvedInstantUtc ||
    new Set(result.positions.map(({ planet }) => planet)).size !== 12 ||
    expectedPlanets.some((planet) =>
      !result.positions.some((position) => position.planet === planet)) ||
    !normalizedPosition ||
    !rahu || !ketu ||
    normalizeLongitude(rahu.longitude + 180) !== ketu.longitude
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Transit output must agree with its explicit instant and canonical classifications',
    });
  }
});

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]));
  }
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] &&
      structurallyEqual(leftRecord[key], rightRecord[key]));
}

function toYogaDoshaChartInput(
  chart: z.infer<typeof birthChartSchema>,
): YogaDoshaChartInput | undefined {
  const ascendantRashi = RASHI_DATASET.find(
    ({ id }) => id === chart.ascendantRashi.id,
  );
  if (!ascendantRashi) return undefined;
  const planets = [];
  for (const position of chart.planets) {
    const rashi = RASHI_DATASET.find(({ id }) => id === position.rashi.id);
    if (!rashi) return undefined;
    planets.push({
      planet: position.planet,
      rashi: { id: rashi.id },
      longitude: position.longitude,
      house: position.house,
      dignity: { state: position.dignity.state },
    });
  }
  return {
    id: chart.id,
    ascendantRashi,
    planets,
  };
}

export const calculationResultSchema = z.object({
  id: z.string().min(1),
  birthProfileId: z.string().min(1),
  input: calculationInputSchema,
  configuration: calculationConfigurationSchema,
  version: calculationVersionSchema,
  charts: z.array(birthChartSchema),
  dasha: z.lazy(() => vimshottariDashaResultSchema).optional(),
  yogaDosha: yogaDoshaResultSchema.optional(),
  planetaryStrength: planetaryStrengthResultSchema.optional(),
  status: z.enum(['available', 'unavailable', 'pending', 'error']),
  createdAt: z.string().datetime(),
}).superRefine((result, context) => {
  const moon = result.charts.find((chart) => chart.chartType === 'd1')
    ?.planets.find(({ planet }) => planet === 'moon');
  if (
    result.version.methodologyVersion !== result.configuration.methodologyVersion ||
    result.charts.some((chart) =>
      chart.metadata.methodologyVersion !== result.configuration.methodologyVersion
    )
  ) {
    context.addIssue({
      code: 'custom',
      path: ['version', 'methodologyVersion'],
      message: 'Calculation, chart, and configuration methodology versions must agree',
    });
  }
  if (
    result.dasha &&
    (
      result.version.dashaMethodologyVersion !== result.dasha.methodologyVersion ||
      result.dasha.birthInstant !== result.input.birthDateTimeUtc ||
      result.dasha.moon.siderealLongitude !== moon?.longitude ||
      result.dasha.moon.nakshatraId !== moon?.nakshatra.id ||
      result.dasha.moon.nakshatraName !== moon?.nakshatra.name ||
      result.dasha.moon.nakshatraLord !== moon?.nakshatra.lord ||
      result.dasha.moon.nakshatraIndex !== moon?.nakshatra.index ||
      result.dasha.moon.pada !== moon?.nakshatra.pada ||
      result.dasha.moon.nakshatraElapsedDegrees !==
        moon?.nakshatra.degreeWithinNakshatra ||
      result.dasha.moon.nakshatraProgress !==
        moon?.nakshatra.degreeWithinNakshatra /
          (moon.nakshatra.endLongitude - moon.nakshatra.startLongitude)
    )
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dasha'],
      message: 'Dasha methodology and birth instant must match the calculation result',
    });
  }
  if (result.version.dashaMethodologyVersion && !result.dasha) {
    context.addIssue({
      code: 'custom',
      path: ['dasha'],
      message: 'A versioned Dasha result must be present',
    });
  }
  if (result.version.yogaDoshaMethodologyVersion && !result.yogaDosha) {
    context.addIssue({
      code: 'custom',
      path: ['yogaDosha'],
      message: 'A versioned Yoga/Dosha result must be present',
    });
  }
  if (
    result.version.strengthTransitMethodologyVersion &&
    !result.planetaryStrength
  ) {
    context.addIssue({
      code: 'custom',
      path: ['planetaryStrength'],
      message: 'A versioned planetary-strength result must be present',
    });
  }
  if (result.planetaryStrength) {
    const d1Chart = result.charts.find((chart) => chart.chartType === 'd1');
    const hasCompleteClassicalSet = d1Chart &&
      d1Chart.planets.filter(({ planet }) =>
        NAISARGIKA_PLANET_ORDER.some((entry) => entry.planet === planet)).length ===
          NAISARGIKA_PLANET_ORDER.length &&
      NAISARGIKA_PLANET_ORDER.every(({ planet }) =>
        d1Chart.planets.filter((position) => position.planet === planet).length === 1);
    const expected = d1Chart && hasCompleteClassicalSet
      ? calculateNaisargikaBala({
          id: d1Chart.id,
          planets: d1Chart.planets.map(({ planet }) => ({ planet })),
        })
      : undefined;
    if (
      !expected ||
      result.version.strengthTransitMethodologyVersion !==
        result.planetaryStrength.methodologyVersion ||
      !structurallyEqual(expected, result.planetaryStrength)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['planetaryStrength'],
        message: 'Planetary-strength values must match the versioned D1 inputs',
      });
    }
  }
  if (result.yogaDosha) {
    const d1Chart = result.charts.find((chart) => chart.chartType === 'd1');
    const yogaDoshaChart = d1Chart
      ? toYogaDoshaChartInput(d1Chart)
      : undefined;
    if (
      !d1Chart || !yogaDoshaChart ||
      result.version.yogaDoshaMethodologyVersion !==
        result.yogaDosha.methodologyVersion ||
      result.yogaDosha.chartId !== d1Chart.id ||
      !structurallyEqual(
        calculateYogaDosha(yogaDoshaChart),
        result.yogaDosha,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['yogaDosha'],
        message: 'Yoga/Dosha result must match its versioned D1 chart inputs',
      });
    }
  }
  result.charts.forEach((chart, index) => {
    if (
      chart.chartType !== 'd1' ||
      chart.metadata.chartSystem !== result.configuration.chartSystem ||
      chart.metadata.zodiacSystem !== result.configuration.zodiacSystem ||
      chart.metadata.ayanamsa !== 'Lahiri/Chitrapaksha' ||
      chart.metadata.nodeType !== result.configuration.nodeType ||
      chart.metadata.houseSystem !== result.configuration.houseSystem
    ) {
      context.addIssue({
        code: 'custom',
        path: ['charts', index, 'metadata'],
        message: 'Chart metadata must match the approved D1 calculation configuration',
      });
    }
  });
});

const epochMicrosecondsSchema = z.string().regex(/^-?\d+$/);

function parseMicroseconds(value: string): bigint | undefined {
  if (!/^-?\d+$/.test(value)) return undefined;
  return BigInt(value);
}

function epochMicrosecondsToIso(epochMicroseconds: string): string | undefined {
  const epoch = parseMicroseconds(epochMicroseconds);
  if (epoch === undefined) return undefined;
  let milliseconds = epoch / BigInt(1000);
  if (epoch < BigInt(0) && epoch % BigInt(1000) !== BigInt(0)) {
    milliseconds -= BigInt(1);
  }
  const date = new Date(Number(milliseconds));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const vimshottariAntardashaSchema = z.object({
  id: z.string().min(1),
  lord: nakshatraLordSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startEpochMicroseconds: epochMicrosecondsSchema,
  endEpochMicroseconds: epochMicrosecondsSchema,
  durationMicroseconds: z.string().regex(/^\d+$/),
  durationYears: z.number().nonnegative(),
  fullDurationMicroseconds: z.string().regex(/^\d+$/),
  fullDurationYears: z.number().positive(),
  elapsedAtBirthMicroseconds: z.string().regex(/^\d+$/),
  remainingAtBirthMicroseconds: z.string().regex(/^\d+$/),
  activeAtBirth: z.boolean(),
}).strict().superRefine((period, context) => {
  const start = parseMicroseconds(period.startEpochMicroseconds);
  const end = parseMicroseconds(period.endEpochMicroseconds);
  const duration = parseMicroseconds(period.durationMicroseconds);
  const fullDuration = parseMicroseconds(period.fullDurationMicroseconds);
  const elapsedAtBirth = parseMicroseconds(period.elapsedAtBirthMicroseconds);
  const remainingAtBirth = parseMicroseconds(period.remainingAtBirthMicroseconds);
  if (
    start === undefined ||
    end === undefined ||
    duration === undefined ||
    fullDuration === undefined ||
    elapsedAtBirth === undefined ||
    remainingAtBirth === undefined
  ) {
    context.addIssue({ code: 'custom', message: 'Antardasha durations must be integer microseconds' });
    return;
  }
  if (
    end < start ||
    end - start !== duration ||
    elapsedAtBirth + remainingAtBirth !== fullDuration ||
    remainingAtBirth !== duration ||
    period.durationYears !== Number(duration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    period.fullDurationYears !==
      Number(fullDuration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    epochMicrosecondsToIso(period.startEpochMicroseconds) !== period.startsAt ||
    epochMicrosecondsToIso(period.endEpochMicroseconds) !== period.endsAt
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Antardasha timestamps and exact duration must agree',
    });
  }
});

const vimshottariMahadashaSchema = z.object({
  id: z.string().min(1),
  lord: nakshatraLordSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startEpochMicroseconds: epochMicrosecondsSchema,
  endEpochMicroseconds: epochMicrosecondsSchema,
  durationMicroseconds: z.string().regex(/^\d+$/),
  durationYears: z.number().nonnegative(),
  fullDurationMicroseconds: z.string().regex(/^\d+$/),
  fullDurationYears: z.number().positive(),
  elapsedAtBirthMicroseconds: z.string().regex(/^\d+$/),
  remainingAtBirthMicroseconds: z.string().regex(/^\d+$/),
  elapsedAtBirthYears: z.number().nonnegative(),
  remainingAtBirthYears: z.number().nonnegative(),
  activeAtBirth: z.boolean(),
  antardashas: z.array(vimshottariAntardashaSchema).max(9),
}).strict().superRefine((period, context) => {
  const start = parseMicroseconds(period.startEpochMicroseconds);
  const end = parseMicroseconds(period.endEpochMicroseconds);
  const duration = parseMicroseconds(period.durationMicroseconds);
  const fullDurationValue = parseMicroseconds(period.fullDurationMicroseconds);
  const elapsedAtBirth = parseMicroseconds(period.elapsedAtBirthMicroseconds);
  const remainingAtBirth = parseMicroseconds(period.remainingAtBirthMicroseconds);
  const subperiods = period.antardashas;
  const sequenceEntry = VIMSHOTTARI_SEQUENCE.find(({ lord }) => lord === period.lord);
  if (
    start === undefined ||
    end === undefined ||
    duration === undefined ||
    fullDurationValue === undefined ||
    elapsedAtBirth === undefined ||
    remainingAtBirth === undefined
  ) {
    context.addIssue({ code: 'custom', message: 'Mahadasha durations must be integer microseconds' });
    return;
  }
  const fullDuration = getVimshottariMahadashaDurationMicroseconds(period.lord);
  const atBirthBalanceIsValid = period.activeAtBirth
    ? elapsedAtBirth + remainingAtBirth === fullDuration && remainingAtBirth === duration
    : elapsedAtBirth === BigInt(0) &&
      remainingAtBirth === BigInt(0) &&
      duration === fullDuration;
  if (
    end < start ||
    end - start !== duration ||
    fullDurationValue !== fullDuration ||
    period.fullDurationYears !== sequenceEntry?.years ||
    period.durationYears !== Number(duration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    period.elapsedAtBirthYears !==
      Number(elapsedAtBirth) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    period.remainingAtBirthYears !==
      Number(remainingAtBirth) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    !atBirthBalanceIsValid ||
    epochMicrosecondsToIso(period.startEpochMicroseconds) !== period.startsAt ||
    epochMicrosecondsToIso(period.endEpochMicroseconds) !== period.endsAt ||
    subperiods.reduce((sum, subperiod) =>
      sum + (parseMicroseconds(subperiod.durationMicroseconds) ?? BigInt(0)),
      BigInt(0)) !== end - start
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Mahadasha boundaries and Antardasha durations must partition exactly',
    });
  }
  const mahaLordIndex = VIMSHOTTARI_SEQUENCE.findIndex(({ lord }) => lord === period.lord);
  const boundaries = getVimshottariAntardashaBoundaries(period.lord, fullDuration);
  const underlyingMahaStart = period.activeAtBirth ? start - elapsedAtBirth : start;
  let expectedFirstIndex = 0;
  if (period.activeAtBirth) {
    expectedFirstIndex = boundaries.findIndex((boundary, index) =>
      index > 0 && elapsedAtBirth < boundary,
    ) - 1;
    expectedFirstIndex = Math.max(0, expectedFirstIndex);
  }
  const expectedCount = period.activeAtBirth && duration === BigInt(0)
    ? 0
    : VIMSHOTTARI_SEQUENCE.length - expectedFirstIndex;
  if (
    subperiods.length !== expectedCount ||
    (period.activeAtBirth ? underlyingMahaStart + elapsedAtBirth !== start : false)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['antardashas'],
      message: 'Antardasha list must begin at the birth-time period and span its Mahadasha',
    });
  }
  subperiods.forEach((subperiod, index) => {
    const sequenceOffset = expectedFirstIndex + index;
    const lordIndex = (mahaLordIndex + sequenceOffset) % VIMSHOTTARI_SEQUENCE.length;
    const expectedLord = VIMSHOTTARI_SEQUENCE[
      lordIndex
    ].lord;
    const subStart = parseMicroseconds(subperiod.startEpochMicroseconds);
    const subEnd = parseMicroseconds(subperiod.endEpochMicroseconds);
    const subDuration = parseMicroseconds(subperiod.durationMicroseconds);
    const subFullDuration = parseMicroseconds(subperiod.fullDurationMicroseconds);
    const subElapsed = parseMicroseconds(subperiod.elapsedAtBirthMicroseconds);
    const subRemaining = parseMicroseconds(subperiod.remainingAtBirthMicroseconds);
    const expectedUnderlyingStart = underlyingMahaStart + boundaries[sequenceOffset];
    const expectedEnd = underlyingMahaStart + boundaries[sequenceOffset + 1];
    const expectedStart = period.activeAtBirth && sequenceOffset === expectedFirstIndex &&
      expectedUnderlyingStart < start
      ? start
      : expectedUnderlyingStart;
    const expectedSubElapsed = period.activeAtBirth && sequenceOffset === expectedFirstIndex
      ? start - expectedUnderlyingStart
      : BigInt(0);
    const expectedSubDuration = expectedEnd - expectedStart;
    const expectedSubFullDuration =
      boundaries[sequenceOffset + 1] - boundaries[sequenceOffset];
    if (subperiod.lord !== expectedLord) {
      context.addIssue({
        code: 'custom',
        path: ['antardashas', index, 'lord'],
        message: 'Antardasha lords must follow the cyclic Vimshottari sequence',
      });
    }
    if (
      subStart !== expectedStart ||
      subEnd !== expectedEnd ||
      subDuration !== expectedSubDuration ||
      subFullDuration !== expectedSubFullDuration ||
      subElapsed !== expectedSubElapsed ||
      subRemaining !== expectedSubDuration ||
      subperiod.activeAtBirth !==
        (period.activeAtBirth && sequenceOffset === expectedFirstIndex) ||
      subperiod.durationYears !==
        Number(expectedSubDuration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
      subperiod.fullDurationYears !==
        Number(expectedSubFullDuration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['antardashas', index],
        message: 'Antardasha must match its proportional Mahadasha interval and birth clipping',
      });
    }
    if (
      index > 0 &&
      subperiod.startEpochMicroseconds !== subperiods[index - 1].endEpochMicroseconds
    ) {
      context.addIssue({
        code: 'custom',
        path: ['antardashas', index],
        message: 'Antardasha periods must be contiguous',
      });
    }
  });
  if (
    subperiods.length > 0 &&
    (
      subperiods[0].startEpochMicroseconds !== period.startEpochMicroseconds ||
      subperiods[subperiods.length - 1].endEpochMicroseconds !== period.endEpochMicroseconds
    )
  ) {
    context.addIssue({
      code: 'custom',
      path: ['antardashas'],
      message: 'Antardasha coverage must exactly match the Mahadasha timeline segment',
    });
  }
});

export const vimshottariDashaResultSchema = z.object({
  system: z.literal('vimshottari'),
  methodologyVersion: z.literal(VIMSHOTTARI_METHOD_VERSION),
  yearConvention: z.literal('julian_365_25_day'),
  secondsPerYear: z.literal(VIMSHOTTARI_SECONDS_PER_YEAR),
  cycleDurationYears: z.literal(120),
  birthInstant: z.string().datetime(),
  moon: z.object({
    siderealLongitude: z.number().min(0).lt(360),
    nakshatraId: nakshatraIdSchema,
    nakshatraName: z.string().min(1),
    nakshatraIndex: z.number().int().min(1).max(27),
    nakshatraLord: nakshatraLordSchema,
    pada: z.number().int().min(1).max(4),
    nakshatraProgress: z.number().min(0).max(1),
    nakshatraElapsedDegrees: z.number().min(0).lte(40 / 3),
  }).strict(),
  startingMahadashaLord: nakshatraLordSchema,
  fullMahadashaMicroseconds: z.string().regex(/^\d+$/),
  elapsedMahadashaMicrosecondsAtBirth: z.string().regex(/^\d+$/),
  remainingMahadashaMicrosecondsAtBirth: z.string().regex(/^\d+$/),
  elapsedMahadashaYearsAtBirth: z.number().nonnegative(),
  remainingMahadashaYearsAtBirth: z.number().nonnegative(),
  timelineDurationMicroseconds: z.string().regex(/^\d+$/),
  timelineDurationYears: z.number().nonnegative(),
  mahadashas: z.array(vimshottariMahadashaSchema).length(9),
}).strict().superRefine((result, context) => {
  const expectedMoonNakshatra = getNakshatraPlacement(result.moon.siderealLongitude);
  const expectedProgress =
    (expectedMoonNakshatra.longitude - expectedMoonNakshatra.startLongitude) /
    (expectedMoonNakshatra.endLongitude - expectedMoonNakshatra.startLongitude);
  const birthMilliseconds = Date.parse(result.birthInstant);
  const birthEpochMicroseconds = Number.isFinite(birthMilliseconds)
    ? BigInt(birthMilliseconds) * BigInt(1000)
    : undefined;
  const fullMahadasha = parseMicroseconds(result.fullMahadashaMicroseconds);
  const elapsedMahadasha = parseMicroseconds(result.elapsedMahadashaMicrosecondsAtBirth);
  const remainingMahadasha = parseMicroseconds(result.remainingMahadashaMicrosecondsAtBirth);
  const timelineDuration = parseMicroseconds(result.timelineDurationMicroseconds);
  const periodDurations = result.mahadashas.map(({ durationMicroseconds }) =>
    parseMicroseconds(durationMicroseconds));
  const expectedElapsed = fullMahadasha === undefined
    ? undefined
    : progressToDuration(expectedProgress, fullMahadasha);
  if (
    birthEpochMicroseconds === undefined ||
    fullMahadasha === undefined ||
    elapsedMahadasha === undefined ||
    remainingMahadasha === undefined ||
    timelineDuration === undefined ||
    periodDurations.some((duration) => duration === undefined)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['mahadashas'],
      message: 'Vimshottari timeline durations must be integer microseconds',
    });
    return;
  }
  const totalCycleDuration =
    VIMSHOTTARI_MICROSECONDS_PER_YEAR * BigInt(VIMSHOTTARI_CYCLE_YEARS);
  const expectedTimelineDuration = totalCycleDuration - elapsedMahadasha;
  const actualTimelineDuration = periodDurations.map((duration) => duration ?? BigInt(0)).reduce(
    (sum, duration) => sum + duration,
    BigInt(0),
  );
  if (
    new Date(birthMilliseconds).toISOString() !== result.birthInstant ||
    result.startingMahadashaLord !== result.moon.nakshatraLord ||
    result.moon.nakshatraId !== expectedMoonNakshatra.id ||
    result.moon.nakshatraName !== expectedMoonNakshatra.name ||
    result.moon.nakshatraIndex !== expectedMoonNakshatra.index ||
    result.moon.nakshatraLord !== expectedMoonNakshatra.lord ||
    result.moon.pada !== expectedMoonNakshatra.pada ||
    result.moon.nakshatraProgress !== expectedProgress ||
    result.moon.nakshatraElapsedDegrees !==
      result.moon.siderealLongitude - expectedMoonNakshatra.startLongitude ||
    result.mahadashas[0].lord !== result.startingMahadashaLord ||
    result.mahadashas[0].startEpochMicroseconds !== birthEpochMicroseconds.toString() ||
    actualTimelineDuration !== timelineDuration ||
    timelineDuration !== expectedTimelineDuration ||
    elapsedMahadasha !== expectedElapsed ||
    remainingMahadasha !== fullMahadasha - elapsedMahadasha ||
    result.elapsedMahadashaYearsAtBirth !==
      Number(elapsedMahadasha) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    result.remainingMahadashaYearsAtBirth !==
      Number(remainingMahadasha) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    result.timelineDurationYears !==
      Number(timelineDuration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
    fullMahadasha !== getVimshottariMahadashaDurationMicroseconds(
      result.startingMahadashaLord,
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Vimshottari result must be driven by the birth Moon and form a contiguous timeline',
    });
  }
  result.mahadashas.forEach((period, index) => {
    const expectedLord = VIMSHOTTARI_SEQUENCE[
      (VIMSHOTTARI_SEQUENCE.findIndex(({ lord }) =>
        lord === result.startingMahadashaLord) + index) %
        VIMSHOTTARI_SEQUENCE.length
    ].lord;
    const periodStart = parseMicroseconds(period.startEpochMicroseconds);
    const periodEnd = parseMicroseconds(period.endEpochMicroseconds);
    const periodDuration = parseMicroseconds(period.durationMicroseconds);
    const expectedFullDuration = getVimshottariMahadashaDurationMicroseconds(expectedLord);
    const expectedPeriodDuration = index === 0
      ? remainingMahadasha
      : expectedFullDuration;
    if (
      period.lord !== expectedLord ||
      period.activeAtBirth !== (index === 0) ||
      periodStart === undefined ||
      periodEnd === undefined ||
      periodDuration !== expectedPeriodDuration ||
      parseMicroseconds(period.fullDurationMicroseconds) !== expectedFullDuration ||
      period.elapsedAtBirthMicroseconds !==
        (index === 0 ? elapsedMahadasha.toString() : '0') ||
      period.remainingAtBirthMicroseconds !==
        (index === 0 ? remainingMahadasha.toString() : '0') ||
      period.durationYears !==
        Number(expectedPeriodDuration) / Number(VIMSHOTTARI_MICROSECONDS_PER_YEAR) ||
      period.startsAt !== epochMicrosecondsToIso(period.startEpochMicroseconds) ||
      period.endsAt !== epochMicrosecondsToIso(period.endEpochMicroseconds) ||
      periodEnd - periodStart !== expectedPeriodDuration
    ) {
      context.addIssue({
        code: 'custom',
        path: ['mahadashas', index, 'lord'],
        message: 'Mahadasha sequence, duration, and birth balance must match the Vimshottari cycle',
      });
    }
    if (
      (index === 0 &&
        period.startEpochMicroseconds !== birthEpochMicroseconds.toString()) ||
      (index > 0 &&
        period.startEpochMicroseconds !== result.mahadashas[index - 1].endEpochMicroseconds)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['mahadashas', index],
        message: 'Mahadasha periods must be contiguous',
      });
    }
  });
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
