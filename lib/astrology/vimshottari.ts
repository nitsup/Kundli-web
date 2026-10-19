import type {
  D1Chart,
  NakshatraPlacement,
  VimshottariAntardasha,
  VimshottariDashaResult,
  VimshottariLord,
  VimshottariMahadasha,
} from '@/lib/domain/types';
import { AppError } from '@/lib/errors';
import {
  getNakshatraPlacement,
  normalizeLongitude,
} from '@/lib/astrology/vedic-primitives';

export const VIMSHOTTARI_METHOD_VERSION = 'vimshottari-v1' as const;
export const VIMSHOTTARI_SECONDS_PER_YEAR = 31_557_600 as const;
export const VIMSHOTTARI_CYCLE_YEARS = 120 as const;

export const VIMSHOTTARI_SEQUENCE: readonly {
  lord: VimshottariLord;
  years: number;
}[] = [
  { lord: 'ketu', years: 7 },
  { lord: 'venus', years: 20 },
  { lord: 'sun', years: 6 },
  { lord: 'moon', years: 10 },
  { lord: 'mars', years: 7 },
  { lord: 'rahu', years: 18 },
  { lord: 'jupiter', years: 16 },
  { lord: 'saturn', years: 19 },
  { lord: 'mercury', years: 17 },
];

const MICROSECONDS_PER_SECOND = BigInt(1_000_000);
export const VIMSHOTTARI_MICROSECONDS_PER_YEAR =
  BigInt(VIMSHOTTARI_SECONDS_PER_YEAR) * MICROSECONDS_PER_SECOND;
const MICROSECONDS_PER_YEAR = VIMSHOTTARI_MICROSECONDS_PER_YEAR;

export interface NakshatraProgress {
  elapsedDegrees: number;
  progress: number;
}

export function getNakshatraProgress(
  longitude: number,
  nakshatra: Pick<NakshatraPlacement, 'startLongitude' | 'endLongitude'>,
): NakshatraProgress {
  if (!Number.isFinite(longitude)) {
    throw new RangeError('Moon longitude must be finite.');
  }

  const exactEndBoundary = longitude === nakshatra.endLongitude;
  const normalizedLongitude = normalizeLongitude(longitude);
  const elapsedDegrees = exactEndBoundary
    ? nakshatra.endLongitude - nakshatra.startLongitude
    : normalizedLongitude - nakshatra.startLongitude;
  const width = nakshatra.endLongitude - nakshatra.startLongitude;

  if (
    !(width > 0) ||
    elapsedDegrees < 0 ||
    elapsedDegrees > width
  ) {
    throw new RangeError('Moon longitude is outside its Nakshatra interval.');
  }

  return { elapsedDegrees, progress: elapsedDegrees / width };
}

function roundRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator;
}

function durationForYears(years: number): bigint {
  return BigInt(years) * MICROSECONDS_PER_YEAR;
}

export function getVimshottariMahadashaDurationMicroseconds(
  lord: VimshottariLord,
): bigint {
  const period = VIMSHOTTARI_SEQUENCE.find((entry) => entry.lord === lord);
  if (!period) {
    throw new RangeError(`Unknown Vimshottari lord: ${lord}`);
  }
  return durationForYears(period.years);
}

export function getVimshottariAntardashaBoundaries(
  mahaLord: VimshottariLord,
  mahaDurationMicroseconds: bigint,
): bigint[] {
  const mahaLordIndex = VIMSHOTTARI_SEQUENCE.findIndex(({ lord }) => lord === mahaLord);
  const boundaries = [BigInt(0)];
  let cumulativeLordYears = 0;

  for (let offset = 0; offset < VIMSHOTTARI_SEQUENCE.length; offset += 1) {
    cumulativeLordYears += VIMSHOTTARI_SEQUENCE[
      (mahaLordIndex + offset) % VIMSHOTTARI_SEQUENCE.length
    ].years;
    boundaries.push(
      roundRatio(
        mahaDurationMicroseconds * BigInt(cumulativeLordYears),
        BigInt(VIMSHOTTARI_CYCLE_YEARS),
      ),
    );
  }

  return boundaries;
}
function durationToYears(microseconds: bigint): number {
  return Number(microseconds) / Number(MICROSECONDS_PER_YEAR);
}

export function progressToDuration(progress: number, duration: bigint): bigint {
  if (progress <= 0) return BigInt(0);
  if (progress >= 1) return duration;
  return BigInt(Math.round(Number(duration) * progress));
}

function isoFromEpochMicroseconds(epochMicroseconds: bigint): string {
  let milliseconds = epochMicroseconds / BigInt(1000);
  if (
    epochMicroseconds < BigInt(0) &&
    epochMicroseconds % BigInt(1000) !== BigInt(0)
  ) {
    milliseconds -= BigInt(1);
  }
  const date = new Date(Number(milliseconds));
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Vimshottari timeline date is outside the supported calendar range.');
  }
  return date.toISOString();
}

function epochMicrosecondsFromIso(instant: string): bigint {
  const milliseconds = Date.parse(instant);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== instant) {
    throw new RangeError('Birth instant must be a canonical ISO UTC timestamp.');
  }
  return BigInt(milliseconds) * BigInt(1000);
}

function sameNakshatraPlacement(
  left: NakshatraPlacement,
  right: NakshatraPlacement,
): boolean {
  return left.id === right.id &&
    left.index === right.index &&
    left.name === right.name &&
    left.lord === right.lord &&
    left.startLongitude === right.startLongitude &&
    left.endLongitude === right.endLongitude &&
    left.longitude === right.longitude &&
    left.degreeWithinNakshatra === right.degreeWithinNakshatra &&
    left.pada === right.pada &&
    left.padaBoundaries.every((boundary, index) =>
      boundary === right.padaBoundaries[index]) &&
    left.degreePosition.degrees === right.degreePosition.degrees &&
    left.degreePosition.minutes === right.degreePosition.minutes &&
    left.degreePosition.seconds === right.degreePosition.seconds;
}

function assertMoonPlacement(chart: D1Chart): {
  siderealLongitude: number;
  nakshatra: NakshatraPlacement;
} {
  const moon = chart.planets.find(({ planet }) => planet === 'moon');
  const expectedNakshatra = moon
    ? getNakshatraPlacement(moon.rawSiderealLongitude)
    : undefined;
  if (
    !moon ||
    !expectedNakshatra ||
    !Number.isFinite(moon.rawSiderealLongitude) ||
    moon.longitude !== normalizeLongitude(moon.rawSiderealLongitude) ||
    !sameNakshatraPlacement(moon.nakshatra, expectedNakshatra) ||
    !sameNakshatraPlacement(chart.nakshatra, expectedNakshatra) ||
    moon.nakshatra.longitude !== moon.longitude
  ) {
    throw new AppError(
      'calculation',
      'D1 chart Moon Nakshatra data is missing or inconsistent.',
    );
  }
  return {
    siderealLongitude: moon.longitude,
    nakshatra: moon.nakshatra,
  };
}

function makeAntardasha(
  index: number,
  lord: VimshottariLord,
  start: bigint,
  end: bigint,
  birth: bigint,
  fullDuration: bigint,
  untrimmedStart: bigint,
): VimshottariAntardasha {
  const duration = end - start;
  const elapsedAtBirth = birth > untrimmedStart
    ? birth - untrimmedStart
    : BigInt(0);
  if (duration < BigInt(0)) {
    throw new AppError('calculation', 'Vimshottari Antardasha boundaries are inconsistent.');
  }
  return {
    id: `vimshottari-antardasha-${index}-${lord}`,
    lord,
    startsAt: isoFromEpochMicroseconds(start),
    endsAt: isoFromEpochMicroseconds(end),
    startEpochMicroseconds: start.toString(),
    endEpochMicroseconds: end.toString(),
    durationMicroseconds: duration.toString(),
    durationYears: durationToYears(duration),
    fullDurationMicroseconds: fullDuration.toString(),
    fullDurationYears: durationToYears(fullDuration),
    elapsedAtBirthMicroseconds: elapsedAtBirth.toString(),
    remainingAtBirthMicroseconds: duration.toString(),
    activeAtBirth: start <= birth && birth < end,
  };
}

function buildAntardashas(
  mahaIndex: number,
  mahaLordIndex: number,
  mahaStart: bigint,
  mahaDuration: bigint,
  birth: bigint,
): VimshottariAntardasha[] {
  const mahaLord = VIMSHOTTARI_SEQUENCE[mahaLordIndex].lord;
  const boundaries = getVimshottariAntardashaBoundaries(mahaLord, mahaDuration);

  const elapsedAtBirth = birth > mahaStart ? birth - mahaStart : BigInt(0);
  if (elapsedAtBirth >= mahaDuration) {
    return [];
  }
  const currentIndex = Math.min(
    VIMSHOTTARI_SEQUENCE.length - 1,
    boundaries.findIndex((boundary, index) =>
      index > 0 && elapsedAtBirth < boundary,
    ) - 1,
  );
  const firstIndex = Math.max(0, currentIndex);
  const result: VimshottariAntardasha[] = [];
  let segmentStart = birth > mahaStart ? birth : mahaStart;

  for (let offset = firstIndex; offset < VIMSHOTTARI_SEQUENCE.length; offset += 1) {
    const lord = VIMSHOTTARI_SEQUENCE[
      (mahaLordIndex + offset) % VIMSHOTTARI_SEQUENCE.length
    ].lord;
    const actualStart = mahaStart + boundaries[offset];
    const end = mahaStart + boundaries[offset + 1];
    const start = actualStart > segmentStart ? actualStart : segmentStart;
    result.push(makeAntardasha(
      mahaIndex,
      lord,
      start,
      end,
      birth,
      boundaries[offset + 1] - boundaries[offset],
      actualStart,
    ));
    segmentStart = end;
  }

  return result;
}

export function calculateVimshottariDasha(
  birthInstant: string,
  chart: D1Chart,
): VimshottariDashaResult {
  const birthEpochMicroseconds = epochMicrosecondsFromIso(birthInstant);
  const { siderealLongitude, nakshatra } = assertMoonPlacement(chart);
  let nakshatraProgress: number;
  let nakshatraElapsedDegrees: number;
  try {
    ({ progress: nakshatraProgress, elapsedDegrees: nakshatraElapsedDegrees } =
      getNakshatraProgress(siderealLongitude, nakshatra));
  } catch (error) {
    throw new AppError(
      'calculation',
      'Moon longitude is outside its classified Nakshatra interval.',
      error,
    );
  }
  const startingIndex = VIMSHOTTARI_SEQUENCE.findIndex(
    ({ lord }) => lord === nakshatra.lord,
  );
  if (startingIndex < 0) {
    throw new AppError('calculation', 'Moon Nakshatra lord is not in the Vimshottari sequence.');
  }

  const startingDuration = durationForYears(VIMSHOTTARI_SEQUENCE[startingIndex].years);
  const elapsedStartingDuration = progressToDuration(nakshatraProgress, startingDuration);
  const remainingStartingDuration = startingDuration - elapsedStartingDuration;
  const startingMahaEnd = birthEpochMicroseconds + remainingStartingDuration;
  const mahadashas: VimshottariMahadasha[] = [];
  let nextMahaStart = startingMahaEnd;
  let timelineDuration = remainingStartingDuration;

  for (let offset = 0; offset < VIMSHOTTARI_SEQUENCE.length; offset += 1) {
    const sequenceIndex = (startingIndex + offset) % VIMSHOTTARI_SEQUENCE.length;
    const entry = VIMSHOTTARI_SEQUENCE[sequenceIndex];
    const activeAtBirth = offset === 0;
    const fullDuration = durationForYears(entry.years);
    const elapsedAtBirth = activeAtBirth
      ? elapsedStartingDuration
      : BigInt(0);
    const periodDuration = activeAtBirth ? remainingStartingDuration : fullDuration;
    const periodStart = activeAtBirth ? birthEpochMicroseconds : nextMahaStart;
    const periodEnd = periodStart + periodDuration;
    const actualMahaStart = activeAtBirth
      ? birthEpochMicroseconds - elapsedStartingDuration
      : periodStart;
    const antardashas = buildAntardashas(
      offset + 1,
      sequenceIndex,
      actualMahaStart,
      fullDuration,
      birthEpochMicroseconds,
    );

    if (
      antardashas.reduce((sum, antardasha) =>
        sum + BigInt(antardasha.durationMicroseconds), BigInt(0)) !== periodDuration
    ) {
      throw new AppError(
        'calculation',
        'Vimshottari Antardashas do not partition their Mahadasha timeline segment.',
      );
    }

    mahadashas.push({
      id: `vimshottari-mahadasha-${offset + 1}-${entry.lord}`,
      lord: entry.lord,
      startsAt: isoFromEpochMicroseconds(periodStart),
      endsAt: isoFromEpochMicroseconds(periodEnd),
      startEpochMicroseconds: periodStart.toString(),
      endEpochMicroseconds: periodEnd.toString(),
      durationMicroseconds: periodDuration.toString(),
      durationYears: durationToYears(periodDuration),
      fullDurationMicroseconds: fullDuration.toString(),
      fullDurationYears: entry.years,
      elapsedAtBirthMicroseconds: activeAtBirth ? elapsedAtBirth.toString() : '0',
      remainingAtBirthMicroseconds: activeAtBirth ? periodDuration.toString() : '0',
      elapsedAtBirthYears: durationToYears(elapsedAtBirth),
      remainingAtBirthYears: activeAtBirth ? durationToYears(periodDuration) : 0,
      activeAtBirth,
      antardashas,
    });

    if (!activeAtBirth) {
      timelineDuration += periodDuration;
    }
    nextMahaStart = periodEnd;
  }

  return {
    system: 'vimshottari',
    methodologyVersion: VIMSHOTTARI_METHOD_VERSION,
    yearConvention: 'julian_365_25_day',
    secondsPerYear: VIMSHOTTARI_SECONDS_PER_YEAR,
    cycleDurationYears: VIMSHOTTARI_CYCLE_YEARS,
    birthInstant,
    moon: {
      siderealLongitude,
      nakshatraId: nakshatra.id,
      nakshatraName: nakshatra.name,
      nakshatraIndex: nakshatra.index,
      nakshatraLord: nakshatra.lord,
      pada: nakshatra.pada,
      nakshatraProgress,
      nakshatraElapsedDegrees,
    },
    startingMahadashaLord: nakshatra.lord,
    fullMahadashaMicroseconds: startingDuration.toString(),
    elapsedMahadashaMicrosecondsAtBirth: elapsedStartingDuration.toString(),
    remainingMahadashaMicrosecondsAtBirth: remainingStartingDuration.toString(),
    elapsedMahadashaYearsAtBirth: durationToYears(elapsedStartingDuration),
    remainingMahadashaYearsAtBirth: durationToYears(remainingStartingDuration),
    timelineDurationMicroseconds: timelineDuration.toString(),
    timelineDurationYears: durationToYears(timelineDuration),
    mahadashas,
  };
}
