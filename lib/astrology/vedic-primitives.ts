import type {
  AstronomicalPosition,
  DegreePosition,
  DignityAssessment,
  DignityState,
  HousePosition,
  MoolatrikonaRange,
  NakshatraDefinition,
  NakshatraId,
  NakshatraLord,
  NakshatraPlacement,
  PlanetName,
  PlanetPosition,
  RashiDefinition,
  RashiId,
  RashiPlacement,
} from '@/lib/domain/types';

export { VEDIC_METHODOLOGY_VERSION } from '@/lib/domain/types';
const PADA_BOUNDARIES = Array.from(
  { length: 109 },
  (_, index) => (index * 360) / 108,
);

export const RASHI_DATASET: readonly RashiDefinition[] = [
  { id: 'aries', index: 1, name: 'Aries', sanskritName: 'Mesha', lord: 'mars', startLongitude: 0, endLongitude: 30 },
  { id: 'taurus', index: 2, name: 'Taurus', sanskritName: 'Vrishabha', lord: 'venus', startLongitude: 30, endLongitude: 60 },
  { id: 'gemini', index: 3, name: 'Gemini', sanskritName: 'Mithuna', lord: 'mercury', startLongitude: 60, endLongitude: 90 },
  { id: 'cancer', index: 4, name: 'Cancer', sanskritName: 'Karka', lord: 'moon', startLongitude: 90, endLongitude: 120 },
  { id: 'leo', index: 5, name: 'Leo', sanskritName: 'Simha', lord: 'sun', startLongitude: 120, endLongitude: 150 },
  { id: 'virgo', index: 6, name: 'Virgo', sanskritName: 'Kanya', lord: 'mercury', startLongitude: 150, endLongitude: 180 },
  { id: 'libra', index: 7, name: 'Libra', sanskritName: 'Tula', lord: 'venus', startLongitude: 180, endLongitude: 210 },
  { id: 'scorpio', index: 8, name: 'Scorpio', sanskritName: 'Vrischika', lord: 'mars', startLongitude: 210, endLongitude: 240 },
  { id: 'sagittarius', index: 9, name: 'Sagittarius', sanskritName: 'Dhanu', lord: 'jupiter', startLongitude: 240, endLongitude: 270 },
  { id: 'capricorn', index: 10, name: 'Capricorn', sanskritName: 'Makara', lord: 'saturn', startLongitude: 270, endLongitude: 300 },
  { id: 'aquarius', index: 11, name: 'Aquarius', sanskritName: 'Kumbha', lord: 'saturn', startLongitude: 300, endLongitude: 330 },
  { id: 'pisces', index: 12, name: 'Pisces', sanskritName: 'Meena', lord: 'jupiter', startLongitude: 330, endLongitude: 360 },
];

const NAKSHATRA_SOURCE: ReadonlyArray<{
  id: NakshatraId;
  name: string;
  lord: NakshatraLord;
}> = [
  { id: 'ashwini', name: 'Ashwini', lord: 'ketu' },
  { id: 'bharani', name: 'Bharani', lord: 'venus' },
  { id: 'krittika', name: 'Krittika', lord: 'sun' },
  { id: 'rohini', name: 'Rohini', lord: 'moon' },
  { id: 'mrigashira', name: 'Mrigashira', lord: 'mars' },
  { id: 'ardra', name: 'Ardra', lord: 'rahu' },
  { id: 'punarvasu', name: 'Punarvasu', lord: 'jupiter' },
  { id: 'pushya', name: 'Pushya', lord: 'saturn' },
  { id: 'ashlesha', name: 'Ashlesha', lord: 'mercury' },
  { id: 'magha', name: 'Magha', lord: 'ketu' },
  { id: 'purva-phalguni', name: 'Purva Phalguni', lord: 'venus' },
  { id: 'uttara-phalguni', name: 'Uttara Phalguni', lord: 'sun' },
  { id: 'hasta', name: 'Hasta', lord: 'moon' },
  { id: 'chitra', name: 'Chitra', lord: 'mars' },
  { id: 'swati', name: 'Swati', lord: 'rahu' },
  { id: 'vishakha', name: 'Vishakha', lord: 'jupiter' },
  { id: 'anuradha', name: 'Anuradha', lord: 'saturn' },
  { id: 'jyeshtha', name: 'Jyeshtha', lord: 'mercury' },
  { id: 'mula', name: 'Mula', lord: 'ketu' },
  { id: 'purva-ashadha', name: 'Purva Ashadha', lord: 'venus' },
  { id: 'uttara-ashadha', name: 'Uttara Ashadha', lord: 'sun' },
  { id: 'shravana', name: 'Shravana', lord: 'moon' },
  { id: 'dhanishtha', name: 'Dhanishtha', lord: 'mars' },
  { id: 'shatabhisha', name: 'Shatabhisha', lord: 'rahu' },
  { id: 'purva-bhadrapada', name: 'Purva Bhadrapada', lord: 'jupiter' },
  { id: 'uttara-bhadrapada', name: 'Uttara Bhadrapada', lord: 'saturn' },
  { id: 'revati', name: 'Revati', lord: 'mercury' },
];

export const NAKSHATRA_DATASET: readonly NakshatraDefinition[] =
  NAKSHATRA_SOURCE.map(({ id, name, lord }, index) => {
    const subdivisionIndex = index * 4;
    return {
      id,
      index: index + 1,
      name,
      lord,
      startLongitude: PADA_BOUNDARIES[subdivisionIndex],
      endLongitude: PADA_BOUNDARIES[subdivisionIndex + 4],
      padaBoundaries: [
        PADA_BOUNDARIES[subdivisionIndex],
        PADA_BOUNDARIES[subdivisionIndex + 1],
        PADA_BOUNDARIES[subdivisionIndex + 2],
        PADA_BOUNDARIES[subdivisionIndex + 3],
        PADA_BOUNDARIES[subdivisionIndex + 4],
      ],
    };
  });

export interface ClassicalDignityDefinition {
  exaltationSign: RashiId;
  debilitationSign: RashiId;
  ownSigns: readonly RashiId[];
  moolatrikona: MoolatrikonaRange;
}

export const CLASSICAL_DIGNITY_DATASET: Readonly<
  Partial<Record<PlanetName, ClassicalDignityDefinition>>
> = {
  sun: {
    exaltationSign: 'aries',
    debilitationSign: 'libra',
    ownSigns: ['leo'],
    moolatrikona: { sign: 'leo', startDegree: 0, endDegree: 20 },
  },
  moon: {
    exaltationSign: 'taurus',
    debilitationSign: 'scorpio',
    ownSigns: ['cancer'],
    moolatrikona: { sign: 'taurus', startDegree: 4, endDegree: 30 },
  },
  mars: {
    exaltationSign: 'capricorn',
    debilitationSign: 'cancer',
    ownSigns: ['aries', 'scorpio'],
    moolatrikona: { sign: 'aries', startDegree: 0, endDegree: 12 },
  },
  mercury: {
    exaltationSign: 'virgo',
    debilitationSign: 'pisces',
    ownSigns: ['gemini', 'virgo'],
    moolatrikona: { sign: 'virgo', startDegree: 0, endDegree: 15 },
  },
  jupiter: {
    exaltationSign: 'cancer',
    debilitationSign: 'capricorn',
    ownSigns: ['sagittarius', 'pisces'],
    moolatrikona: { sign: 'sagittarius', startDegree: 0, endDegree: 10 },
  },
  venus: {
    exaltationSign: 'pisces',
    debilitationSign: 'virgo',
    ownSigns: ['taurus', 'libra'],
    moolatrikona: { sign: 'libra', startDegree: 0, endDegree: 15 },
  },
  saturn: {
    exaltationSign: 'libra',
    debilitationSign: 'aries',
    ownSigns: ['capricorn', 'aquarius'],
    moolatrikona: { sign: 'aquarius', startDegree: 0, endDegree: 20 },
  },
};

export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    throw new RangeError('Longitude must be finite.');
  }
  const remainder = longitude % 360;
  const normalized = remainder < 0 ? remainder + 360 : remainder;
  return normalized >= 360 || normalized === 0 ? 0 : normalized;
}

export function getDegreePosition(longitudeWithinSign: number): DegreePosition {
  const degrees = Math.floor(longitudeWithinSign);
  const totalMinutes = (longitudeWithinSign - degrees) * 60;
  const minutes = Math.floor(totalMinutes);
  const seconds = (totalMinutes - minutes) * 60;
  return { degrees, minutes, seconds };
}

export function getRashiPlacement(longitude: number): RashiPlacement {
  const normalizedLongitude = normalizeLongitude(longitude);
  const index = Math.floor(normalizedLongitude / 30);
  const rashi = RASHI_DATASET[index];

  return {
    ...rashi,
    longitude: normalizedLongitude,
    degreeWithinRashi: normalizedLongitude - rashi.startLongitude,
  };
}

function getPadaSubdivisionIndex(longitude: number): number {
  for (let index = 0; index < PADA_BOUNDARIES.length - 1; index += 1) {
    if (longitude < PADA_BOUNDARIES[index + 1]) {
      return index;
    }
  }
  return 107;
}

export function getNakshatraPlacement(longitude: number): NakshatraPlacement {
  const normalizedLongitude = normalizeLongitude(longitude);
  const subdivisionIndex = getPadaSubdivisionIndex(normalizedLongitude);
  const nakshatra = NAKSHATRA_DATASET[Math.floor(subdivisionIndex / 4)];

  return {
    ...nakshatra,
    pada: ((subdivisionIndex % 4) + 1) as NakshatraPlacement['pada'],
    degreeWithinNakshatra: normalizedLongitude - nakshatra.startLongitude,
    longitude: normalizedLongitude,
    degreePosition: getDegreePosition(normalizedLongitude - nakshatra.startLongitude),
  };
}

export function getDignityAssessment(
  planet: PlanetName,
  rashi: RashiPlacement,
): DignityAssessment {
  const definition = CLASSICAL_DIGNITY_DATASET[planet];
  if (!definition) {
    return {
      state: 'not_applicable',
      sign: rashi.id,
      degreeWithinSign: rashi.degreeWithinRashi,
    };
  }

  const moolatrikonaRange = definition.moolatrikona;
  const isMoolatrikona =
    rashi.id === moolatrikonaRange.sign &&
    rashi.degreeWithinRashi >= moolatrikonaRange.startDegree &&
    rashi.degreeWithinRashi < moolatrikonaRange.endDegree;
  let state: DignityState;

  if (rashi.id === definition.debilitationSign) {
    state = 'debilitated';
  } else if (isMoolatrikona) {
    state = 'moolatrikona';
  } else if (rashi.id === definition.exaltationSign) {
    state = 'exalted';
  } else if (definition.ownSigns.includes(rashi.id)) {
    state = 'own_sign';
  } else {
    state = 'neutral';
  }

  return {
    state,
    sign: rashi.id,
    degreeWithinSign: rashi.degreeWithinRashi,
    ...(rashi.id === moolatrikonaRange.sign ? { moolatrikonaRange } : {}),
  };
}

function classifyPlanet(
  astronomicalPosition: AstronomicalPosition,
  ascendantRashiIndex: number,
): PlanetPosition {
  const rashi = getRashiPlacement(astronomicalPosition.siderealLongitude);
  return {
    planet: astronomicalPosition.planet,
    rawSiderealLongitude: astronomicalPosition.siderealLongitude,
    longitude: rashi.longitude,
    rawTropicalLongitude: astronomicalPosition.tropicalLongitude,
    tropicalLongitude: normalizeLongitude(astronomicalPosition.tropicalLongitude),
    latitude: astronomicalPosition.latitude,
    distanceAu: astronomicalPosition.distanceAu,
    longitudeSpeedDegreesPerDay: astronomicalPosition.longitudeSpeedDegreesPerDay,
    latitudeSpeedDegreesPerDay: astronomicalPosition.latitudeSpeedDegreesPerDay,
    distanceSpeedAuPerDay: astronomicalPosition.distanceSpeedAuPerDay,
    providerFlags: astronomicalPosition.providerFlags,
    retrograde: astronomicalPosition.longitudeSpeedDegreesPerDay < 0,
    position: getDegreePosition(rashi.degreeWithinRashi),
    sign: rashi.name,
    rashi,
    house: ((rashi.index - 1 - ascendantRashiIndex + 12) % 12) + 1,
    nakshatra: getNakshatraPlacement(astronomicalPosition.siderealLongitude),
    dignity: getDignityAssessment(astronomicalPosition.planet, rashi),
  };
}

export interface VedicChartPrimitives {
  planets: PlanetPosition[];
  houses: HousePosition[];
  ascendant: string;
  ascendantLongitude: number;
  ascendantDegree: DegreePosition;
  ascendantRashi: RashiPlacement;
  ascendantNakshatra: NakshatraPlacement;
}

export function classifyVedicChart(
  ascendantSiderealLongitude: number,
  astronomicalPositions: readonly AstronomicalPosition[],
): VedicChartPrimitives {
  const ascendantRashi = getRashiPlacement(ascendantSiderealLongitude);
  const ascendantNakshatra = getNakshatraPlacement(ascendantSiderealLongitude);
  const planets = astronomicalPositions.map((position) =>
    classifyPlanet(position, ascendantRashi.index - 1),
  );
  const houses = Array.from({ length: 12 }, (_, houseOffset) => {
    const rashi = RASHI_DATASET[(ascendantRashi.index - 1 + houseOffset) % 12];
    return {
      house: houseOffset + 1,
      signId: rashi.id,
      sign: rashi.name,
      lord: rashi.lord,
      occupants: planets
        .filter((planet) => planet.house === houseOffset + 1)
        .map(({ planet }) => planet),
      startLongitude: rashi.startLongitude,
      endLongitude: rashi.endLongitude,
    };
  });

  return {
    planets,
    houses,
    ascendant: ascendantRashi.name,
    ascendantLongitude: ascendantRashi.longitude,
    ascendantDegree: getDegreePosition(ascendantRashi.degreeWithinRashi),
    ascendantRashi,
    ascendantNakshatra,
  };
}

export const RASHI_NAMES = RASHI_DATASET.map(({ name }) => name);
export const NAKSHATRA_NAMES = NAKSHATRA_DATASET.map(({ name }) => name);
