import { describe, expect, it } from 'vitest';

import {
  classifyVedicChart,
  getNakshatraPlacement,
  NAKSHATRA_DATASET,
} from '@/lib/astrology/vedic-primitives';
import {
  calculateVimshottariDasha,
  getVimshottariAntardashaBoundaries,
  getVimshottariMahadashaDurationMicroseconds,
  getNakshatraProgress,
  VIMSHOTTARI_CYCLE_YEARS,
  VIMSHOTTARI_METHOD_VERSION,
  VIMSHOTTARI_SEQUENCE,
  VIMSHOTTARI_SECONDS_PER_YEAR,
} from '@/lib/astrology/vimshottari';
import type {
  AstronomicalPosition,
  D1Chart,
  PlanetName,
} from '@/lib/domain/types';
import { vimshottariDashaResultSchema } from '@/lib/validation/schemas';

const BIRTH_INSTANT = '2000-01-01T00:00:00.000Z';
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

function makeChartForMoonLongitude(longitude: number): D1Chart {
  const classified = classifyVedicChart(
    12.5,
    BODIES.map((planet, index) => makePosition(
      planet,
      planet === 'moon' ? longitude : index * 29.75,
    )),
  );
  const moon = classified.planets.find(({ planet }) => planet === 'moon');
  if (!moon) throw new Error('Synthetic D1 chart is missing the Moon.');
  return {
    id: 'synthetic-d1',
    birthProfileId: 'synthetic-profile',
    chartType: 'd1',
    metadata: { chartSystem: 'vedic' },
    ...classified,
    midheavenLongitude: 0,
    midheavenSign: 'Aries',
    nakshatra: moon.nakshatra,
    status: 'available',
  };
}

function sumDurations(periods: ReadonlyArray<{ durationMicroseconds: string }>): bigint {
  return periods.reduce(
    (sum, period) => sum + BigInt(period.durationMicroseconds),
    0n,
  );
}

describe('Vimshottari Dasha', () => {
  it('uses the canonical cyclic nine-lord sequence and 120-year total', () => {
    expect(VIMSHOTTARI_SEQUENCE).toEqual([
      { lord: 'ketu', years: 7 },
      { lord: 'venus', years: 20 },
      { lord: 'sun', years: 6 },
      { lord: 'moon', years: 10 },
      { lord: 'mars', years: 7 },
      { lord: 'rahu', years: 18 },
      { lord: 'jupiter', years: 16 },
      { lord: 'saturn', years: 19 },
      { lord: 'mercury', years: 17 },
    ]);
    expect(VIMSHOTTARI_SEQUENCE.reduce((sum, entry) => sum + entry.years, 0))
      .toBe(VIMSHOTTARI_CYCLE_YEARS);
    expect(VIMSHOTTARI_SECONDS_PER_YEAR).toBe(31_557_600);
    NAKSHATRA_DATASET.forEach((nakshatra, index) => {
      expect(nakshatra.lord).toBe(
        VIMSHOTTARI_SEQUENCE[index % VIMSHOTTARI_SEQUENCE.length].lord,
      );
    });
  });

  it('derives the starting Mahadasha and complete birth balance for all nine lords', () => {
    for (const { lord } of VIMSHOTTARI_SEQUENCE) {
      const star = Array.from({ length: 27 }, (_, index) =>
        getNakshatraPlacement((index * 360) / 27),
      ).find(({ lord: candidate }) => candidate === lord);
      expect(star).toBeDefined();
      if (!star) throw new Error(`No test Nakshatra found for ${lord}.`);

      const result = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(star.startLongitude),
      );
      const sequenceStart = VIMSHOTTARI_SEQUENCE.findIndex(
        (entry) => entry.lord === lord,
      );
      const expectedSequence = Array.from(
        { length: VIMSHOTTARI_SEQUENCE.length },
        (_, index) => VIMSHOTTARI_SEQUENCE[
          (sequenceStart + index) % VIMSHOTTARI_SEQUENCE.length
        ].lord,
      );

      expect(result.startingMahadashaLord).toBe(lord);
      expect(result.moon.nakshatraLord).toBe(lord);
      expect(result.moon.nakshatraProgress).toBe(0);
      expect(result.elapsedMahadashaMicrosecondsAtBirth).toBe('0');
      expect(result.remainingMahadashaMicrosecondsAtBirth)
        .toBe(result.fullMahadashaMicroseconds);
      expect(result.mahadashas.map(({ lord: mahaLord }) => mahaLord))
        .toEqual(expectedSequence);
      expect(result.timelineDurationYears).toBe(VIMSHOTTARI_CYCLE_YEARS);
      for (const maha of result.mahadashas) {
        const mahaSequenceStart = VIMSHOTTARI_SEQUENCE.findIndex(
          (entry) => entry.lord === maha.lord,
        );
        expect(maha.antardashas).toHaveLength(9);
        expect(sumDurations(maha.antardashas)).toBe(BigInt(maha.durationMicroseconds));
        expect(maha.antardashas.map(({ lord: antarLord }) => antarLord)).toEqual(
          Array.from({ length: 9 }, (_, index) => VIMSHOTTARI_SEQUENCE[
            (mahaSequenceStart + index) % VIMSHOTTARI_SEQUENCE.length
          ].lord),
        );
      }

      const midpoint = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(
          star.startLongitude + (star.endLongitude - star.startLongitude) / 2,
        ),
      );
      const midpointElapsed = BigInt(midpoint.elapsedMahadashaMicrosecondsAtBirth);
      const midpointRemaining = BigInt(midpoint.remainingMahadashaMicrosecondsAtBirth);
      expect(midpoint.startingMahadashaLord).toBe(lord);
      expect(midpointElapsed + midpointRemaining)
        .toBe(BigInt(midpoint.fullMahadashaMicroseconds));
      expect(midpoint.timelineDurationMicroseconds).toBe(
        (
          BigInt(VIMSHOTTARI_CYCLE_YEARS) *
            BigInt(VIMSHOTTARI_SECONDS_PER_YEAR) *
            BigInt(1_000_000) -
          midpointElapsed
        ).toString(),
      );
    }
  });

  it('covers all 27 Nakshatras with exact start progress and the canonical lord', () => {
    for (const star of NAKSHATRA_DATASET) {
      const result = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(star.startLongitude),
      );
      const entry = VIMSHOTTARI_SEQUENCE.find(({ lord }) => lord === star.lord);

      expect(entry).toBeDefined();
      expect(result.moon.nakshatraId).toBe(star.id);
      expect(result.moon.nakshatraLord).toBe(star.lord);
      expect(result.moon.nakshatraProgress).toBe(0);
      expect(result.startingMahadashaLord).toBe(star.lord);
      expect(result.remainingMahadashaYearsAtBirth).toBe(entry?.years);

      const below = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(star.startLongitude - 1e-10),
      );
      const above = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(star.startLongitude + 1e-10),
      );
      const nextStar = NAKSHATRA_DATASET[star.index % NAKSHATRA_DATASET.length];
      const atEnd = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(star.endLongitude),
      );
      expect(below.moon.nakshatraId).not.toBe(star.id);
      expect(above.moon.nakshatraId).toBe(star.id);
      expect(atEnd.moon.nakshatraId).toBe(nextStar.id);
    }
  });

  it('calculates exact progress and remaining balance at start, quarter, midpoint, and three-quarter points', () => {
    const star = Array.from({ length: 27 }, (_, index) =>
      getNakshatraPlacement((index * 360) / 27),
    ).find(({ lord }) => lord === 'venus');
    if (!star) throw new Error('Venus test Nakshatra was not found.');

    const cases = [
      [0, 0, 'venus'],
      [0.25, 1, 'moon'],
      [0.5, 2, 'rahu'],
      [0.75, 3, 'saturn'],
    ] as const;
    for (const [progress, boundaryIndex, activeAntardashaLord] of cases) {
      const longitude = star.padaBoundaries[boundaryIndex];
      const result = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(longitude),
      );
      const elapsed = BigInt(result.elapsedMahadashaMicrosecondsAtBirth);
      const remaining = BigInt(result.remainingMahadashaMicrosecondsAtBirth);

      expect(result.moon.nakshatraProgress).toBeCloseTo(progress, 14);
      expect(elapsed + remaining).toBe(BigInt(result.fullMahadashaMicroseconds));
      expect(result.mahadashas[0].lord).toBe('venus');
      expect(result.mahadashas[0].antardashas[0].activeAtBirth).toBe(true);
      expect(result.mahadashas[0].antardashas[0].lord).toBe(activeAntardashaLord);
      expect(vimshottariDashaResultSchema.safeParse(result).success).toBe(true);
    }

    for (let padaBoundary = 0; padaBoundary < 4; padaBoundary += 1) {
      const longitude = star.padaBoundaries[padaBoundary];
      const exact = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(longitude),
      );
      expect(exact.moon.nakshatraProgress).toBeCloseTo(padaBoundary / 4, 14);
      if (padaBoundary > 0 && padaBoundary < 4) {
        const before = calculateVimshottariDasha(
          BIRTH_INSTANT,
          makeChartForMoonLongitude(longitude - 1e-10),
        );
        const after = calculateVimshottariDasha(
          BIRTH_INSTANT,
          makeChartForMoonLongitude(longitude + 1e-10),
        );
        expect(before.moon.nakshatraProgress).toBeLessThan(exact.moon.nakshatraProgress);
        expect(after.moon.nakshatraProgress).toBeGreaterThan(exact.moon.nakshatraProgress);
      }
    }
  });

  it('handles exact Nakshatra end as 100% progress and classification transition', () => {
    const revati = Array.from({ length: 27 }, (_, index) =>
      getNakshatraPlacement((index * 360) / 27),
    ).find(({ id }) => id === 'revati');
    if (!revati) throw new Error('Revati was not found.');

    expect(getNakshatraProgress(revati.endLongitude, revati)).toEqual({
      elapsedDegrees: revati.endLongitude - revati.startLongitude,
      progress: 1,
    });
    expect(getNakshatraProgress(revati.endLongitude - 1e-10, revati).progress)
      .toBeLessThan(1);
    expect(getNakshatraProgress(revati.startLongitude + 1e-10, revati).progress)
      .toBeGreaterThan(0);
    const beforeStart = getNakshatraPlacement(revati.startLongitude - 1e-10);
    expect(beforeStart.id).not.toBe('revati');
    expect(getNakshatraProgress(beforeStart.longitude, beforeStart).progress)
      .toBeLessThan(1);
    expect(getNakshatraPlacement(revati.endLongitude)).toMatchObject({
      id: 'ashwini',
      lord: 'ketu',
      pada: 1,
    });
    expect(getNakshatraProgress(0, getNakshatraPlacement(0))).toEqual({
      elapsedDegrees: 0,
      progress: 0,
    });
    expect(getNakshatraProgress(360, revati).progress).toBe(1);
  });

  it('changes starting Mahadasha only at the half-open Nakshatra boundary', () => {
    const bharani = NAKSHATRA_DATASET.find(({ id }) => id === 'bharani');
    if (!bharani) throw new Error('Bharani was not found.');
    const before = calculateVimshottariDasha(
      BIRTH_INSTANT,
      makeChartForMoonLongitude(bharani.startLongitude - 1e-10),
    );
    const exact = calculateVimshottariDasha(
      BIRTH_INSTANT,
      makeChartForMoonLongitude(bharani.startLongitude),
    );
    const after = calculateVimshottariDasha(
      BIRTH_INSTANT,
      makeChartForMoonLongitude(bharani.startLongitude + 1e-10),
    );

    expect(before.startingMahadashaLord).toBe('ketu');
    expect(before.moon.nakshatraProgress).toBeGreaterThan(0.999999999);
    expect(exact.startingMahadashaLord).toBe('venus');
    expect(exact.moon.nakshatraProgress).toBe(0);
    expect(after.startingMahadashaLord).toBe('venus');
    expect(after.moon.nakshatraProgress).toBeGreaterThan(0);
  });

  it('handles a birth balance below the one-microsecond duration resolution', () => {
    const ashwini = NAKSHATRA_DATASET[0];
    const longitude = ashwini.endLongitude - Number.EPSILON * ashwini.endLongitude;
    const chart = makeChartForMoonLongitude(longitude);
    const result = calculateVimshottariDasha(BIRTH_INSTANT, chart);

    expect(result.moon.nakshatraId).toBe('ashwini');
    expect(result.remainingMahadashaMicrosecondsAtBirth).toBe('0');
    expect(result.mahadashas[0].durationMicroseconds).toBe('0');
    expect(result.mahadashas[0].antardashas).toEqual([]);
    expect(result.mahadashas[1].startsAt).toBe(BIRTH_INSTANT);
  });

  it('partitions each Mahadasha into exact cyclic Antardasha durations', () => {
    const chart = makeChartForMoonLongitude(114.25);
    const result = calculateVimshottariDasha(BIRTH_INSTANT, chart);
    expect(result.mahadashas).toHaveLength(9);

    for (const maha of result.mahadashas) {
      expect(sumDurations(maha.antardashas)).toBe(BigInt(maha.durationMicroseconds));
      expect(maha.antardashas[0].startEpochMicroseconds)
        .toBe(maha.startEpochMicroseconds);
      expect(maha.antardashas.at(-1)?.endEpochMicroseconds)
        .toBe(maha.endEpochMicroseconds);
      for (let index = 1; index < maha.antardashas.length; index += 1) {
        expect(maha.antardashas[index].startEpochMicroseconds)
          .toBe(maha.antardashas[index - 1].endEpochMicroseconds);
      }
    }

    for (const maha of result.mahadashas.slice(1)) {
      const mahaSequenceIndex = VIMSHOTTARI_SEQUENCE.findIndex(
        ({ lord }) => lord === maha.lord,
      );
      expect(maha.antardashas).toHaveLength(9);
      let cumulativeLordYears = 0;
      let previousBoundary = BigInt(0);
      for (let offset = 0; offset < VIMSHOTTARI_SEQUENCE.length; offset += 1) {
        const subLord = VIMSHOTTARI_SEQUENCE[
          (mahaSequenceIndex + offset) % VIMSHOTTARI_SEQUENCE.length
        ];
        cumulativeLordYears += subLord.years;
        const nextBoundary = (
          BigInt(maha.fullDurationMicroseconds) * BigInt(cumulativeLordYears) +
          BigInt(VIMSHOTTARI_CYCLE_YEARS / 2)
        ) / BigInt(VIMSHOTTARI_CYCLE_YEARS);
        expect(maha.antardashas[offset].lord).toBe(subLord.lord);
        expect(BigInt(maha.antardashas[offset].durationMicroseconds))
          .toBe(nextBoundary - previousBoundary);
        previousBoundary = nextBoundary;
      }
    }
  });

  it('selects the Antardasha by exact elapsed Mahadasha duration and preserves clipped duration', () => {
    const star = NAKSHATRA_DATASET.find(({ id }) => id === 'bharani');
    if (!star) throw new Error('Bharani was not found.');
    const fullDuration = getVimshottariMahadashaDurationMicroseconds('venus');
    const boundaries = getVimshottariAntardashaBoundaries('venus', fullDuration);
    const mahaSequenceIndex = VIMSHOTTARI_SEQUENCE.findIndex(
      ({ lord }) => lord === 'venus',
    );

    for (let transition = 1; transition < VIMSHOTTARI_SEQUENCE.length; transition += 1) {
      const elapsedAtTransition = boundaries[transition];
      const progress = Number(elapsedAtTransition) / Number(fullDuration);
      const longitude = star.startLongitude +
        (star.endLongitude - star.startLongitude) * progress;
      const result = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(longitude),
      );
      const actualElapsed = BigInt(result.elapsedMahadashaMicrosecondsAtBirth);
      const currentAntardasha = result.mahadashas[0].antardashas[0];

      expect(actualElapsed).toBe(elapsedAtTransition);
      expect(currentAntardasha.lord).toBe(
        VIMSHOTTARI_SEQUENCE[
          (mahaSequenceIndex + transition) % VIMSHOTTARI_SEQUENCE.length
        ].lord,
      );
      expect(currentAntardasha.startsAt).toBe(BIRTH_INSTANT);
      expect(
        BigInt(currentAntardasha.elapsedAtBirthMicroseconds) +
        BigInt(currentAntardasha.remainingAtBirthMicroseconds),
      ).toBe(BigInt(currentAntardasha.fullDurationMicroseconds));
      expect(currentAntardasha.durationMicroseconds)
        .toBe(currentAntardasha.remainingAtBirthMicroseconds);

      const beforeLongitude = longitude - 1e-10;
      const afterLongitude = longitude + 1e-10;
      const before = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(beforeLongitude),
      );
      const after = calculateVimshottariDasha(
        BIRTH_INSTANT,
        makeChartForMoonLongitude(afterLongitude),
      );
      expect(before.mahadashas[0].antardashas[0].lord)
        .toBe(VIMSHOTTARI_SEQUENCE[
          (mahaSequenceIndex + transition - 1) % VIMSHOTTARI_SEQUENCE.length
        ].lord);
      expect(after.mahadashas[0].antardashas[0].lord)
        .toBe(VIMSHOTTARI_SEQUENCE[
          (mahaSequenceIndex + transition) % VIMSHOTTARI_SEQUENCE.length
        ].lord);
    }
  });

  it('selects exact Antardasha boundaries from the full Mahadasha for every starting lord', () => {
    for (const { lord } of VIMSHOTTARI_SEQUENCE) {
      const star = NAKSHATRA_DATASET.find(({ lord: starLord }) => starLord === lord);
      if (!star) throw new Error(`No test Nakshatra found for ${lord}.`);
      const fullDuration = getVimshottariMahadashaDurationMicroseconds(lord);
      const boundaries = getVimshottariAntardashaBoundaries(lord, fullDuration);
      const mahaSequenceIndex = VIMSHOTTARI_SEQUENCE.findIndex(
        ({ lord: sequenceLord }) => sequenceLord === lord,
      );

      for (let transition = 1; transition < VIMSHOTTARI_SEQUENCE.length; transition += 1) {
        const elapsedBoundary = boundaries[transition];
        const progress = Number(elapsedBoundary) / Number(fullDuration);
        const longitude = star.startLongitude +
          (star.endLongitude - star.startLongitude) * progress;
        const atBoundary = calculateVimshottariDasha(
          BIRTH_INSTANT,
          makeChartForMoonLongitude(longitude),
        );
        const before = calculateVimshottariDasha(
          BIRTH_INSTANT,
          makeChartForMoonLongitude(longitude - 1e-10),
        );
        const after = calculateVimshottariDasha(
          BIRTH_INSTANT,
          makeChartForMoonLongitude(longitude + 1e-10),
        );
        const expectedAt = VIMSHOTTARI_SEQUENCE[
          (mahaSequenceIndex + transition) % VIMSHOTTARI_SEQUENCE.length
        ].lord;
        const expectedBefore = VIMSHOTTARI_SEQUENCE[
          (mahaSequenceIndex + transition - 1) % VIMSHOTTARI_SEQUENCE.length
        ].lord;

        expect(BigInt(atBoundary.elapsedMahadashaMicrosecondsAtBirth))
          .toBe(elapsedBoundary);
        expect(atBoundary.mahadashas[0].antardashas[0].lord).toBe(expectedAt);
        expect(before.mahadashas[0].antardashas[0].lord).toBe(expectedBefore);
        expect(after.mahadashas[0].antardashas[0].lord).toBe(expectedAt);
        expect(
          BigInt(atBoundary.mahadashas[0].antardashas[0].fullDurationMicroseconds),
        ).toBe(boundaries[transition + 1] - boundaries[transition]);
      }

      for (const progress of [1e-6, 0.5, 1 - 1e-6]) {
        const result = calculateVimshottariDasha(
          BIRTH_INSTANT,
          makeChartForMoonLongitude(
            star.startLongitude +
              (star.endLongitude - star.startLongitude) * progress,
          ),
        );
        const birthAntardasha = result.mahadashas[0].antardashas[0];
        const elapsed = BigInt(result.elapsedMahadashaMicrosecondsAtBirth);
        const expectedIndex = boundaries.findIndex((boundary, index) =>
          index > 0 && elapsed < boundary,
        ) - 1;

        expect(birthAntardasha.lord).toBe(
          VIMSHOTTARI_SEQUENCE[
            (mahaSequenceIndex + Math.max(0, expectedIndex)) %
              VIMSHOTTARI_SEQUENCE.length
          ].lord,
        );
        expect(
          BigInt(birthAntardasha.elapsedAtBirthMicroseconds) +
            BigInt(birthAntardasha.remainingAtBirthMicroseconds),
        ).toBe(BigInt(birthAntardasha.fullDurationMicroseconds));
      }
    }
  });

  it('keeps equivalent 0° and 360° Moon inputs identical and validates output', () => {
    const atZero = calculateVimshottariDasha(
      BIRTH_INSTANT,
      makeChartForMoonLongitude(0),
    );
    const at360 = calculateVimshottariDasha(
      BIRTH_INSTANT,
      makeChartForMoonLongitude(360),
    );

    expect(at360).toEqual(atZero);
    expect(atZero.methodologyVersion).toBe(VIMSHOTTARI_METHOD_VERSION);
    expect(vimshottariDashaResultSchema.safeParse(atZero).success).toBe(true);
    expect(vimshottariDashaResultSchema.safeParse({
      ...atZero,
      moon: { ...atZero.moon, nakshatraLord: 'venus' },
    }).success).toBe(false);
    const misorderedAntardashas = {
      ...atZero,
      mahadashas: atZero.mahadashas.map((maha, index) => index === 0
        ? {
            ...maha,
            antardashas: [
              maha.antardashas[1],
              maha.antardashas[0],
              ...maha.antardashas.slice(2),
            ],
          }
        : maha),
    };
    expect(vimshottariDashaResultSchema.safeParse(misorderedAntardashas).success)
      .toBe(false);
    const shiftedAntardashas = {
      ...atZero,
      mahadashas: atZero.mahadashas.map((maha, index) => index === 0
        ? {
            ...maha,
            antardashas: maha.antardashas.map((subperiod, subIndex) =>
              subIndex === 0
                ? {
                    ...subperiod,
                    startEpochMicroseconds:
                      (BigInt(subperiod.startEpochMicroseconds) + BigInt(1_000)).toString(),
                    startsAt: new Date(
                      Number(BigInt(subperiod.startEpochMicroseconds) / BigInt(1000)) + 1,
                    ).toISOString(),
                    endEpochMicroseconds:
                      (BigInt(subperiod.endEpochMicroseconds) + BigInt(1_000)).toString(),
                    endsAt: new Date(
                      Number(BigInt(subperiod.endEpochMicroseconds) / BigInt(1000)) + 1,
                    ).toISOString(),
                  }
                : subperiod),
          }
        : maha),
    };
    expect(vimshottariDashaResultSchema.safeParse(shiftedAntardashas).success)
      .toBe(false);
    expect(vimshottariDashaResultSchema.safeParse({
      ...atZero,
      timelineDurationMicroseconds: 'not-an-integer',
    }).success).toBe(false);
  });

  it('is independent of process timezone and stable for the same resolved inputs', () => {
    const chart = makeChartForMoonLongitude(23.75);
    const previousTimezone = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Honolulu';
      const honolulu = calculateVimshottariDasha(
        '2000-02-28T23:30:00.000Z',
        chart,
      );
      process.env.TZ = 'Europe/Paris';
      const paris = calculateVimshottariDasha(
        '2000-02-28T23:30:00.000Z',
        chart,
      );
      expect(JSON.stringify(paris)).toBe(JSON.stringify(honolulu));
      expect(paris.mahadashas[0].startsAt).toBe('2000-02-28T23:30:00.000Z');
      expect(paris.mahadashas[0].endsAt)
        .toBe(paris.mahadashas[1].startsAt);
    } finally {
      if (previousTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previousTimezone;
      }
    }
  });

  it('keeps exact duration arithmetic across leap day and DST calendar dates', () => {
    for (const birthInstant of [
      '2000-02-29T23:59:59.999Z',
      '2024-03-10T06:59:59.999Z',
      '2024-03-10T07:00:00.000Z',
      '2024-11-03T05:59:59.999Z',
      '2024-11-03T06:00:00.000Z',
    ]) {
      const result = calculateVimshottariDasha(
        birthInstant,
        makeChartForMoonLongitude(23.75),
      );
      const first = result.mahadashas[0];
      const start = BigInt(first.startEpochMicroseconds);
      const end = BigInt(first.endEpochMicroseconds);

      expect(first.startsAt).toBe(birthInstant);
      expect(end - start).toBe(BigInt(first.durationMicroseconds));
      expect(first.endsAt).toBe(result.mahadashas[1].startsAt);
    }
  });

  it('rejects D1 Moon/Nakshatra inconsistency rather than substituting another classification', () => {
    const chart = makeChartForMoonLongitude(12.5);
    const moonIndex = chart.planets.findIndex(({ planet }) => planet === 'moon');
    const altered = {
      ...chart,
      planets: chart.planets.map((planet, index) => index === moonIndex
        ? { ...planet, nakshatra: getNakshatraPlacement(160) }
        : planet),
    } as D1Chart;

    expect(() => calculateVimshottariDasha(BIRTH_INSTANT, altered))
      .toThrow(/inconsistent/i);

    const alteredChartSummary: D1Chart = {
      ...chart,
      nakshatra: {
        ...chart.nakshatra,
        degreePosition: {
          ...chart.nakshatra.degreePosition,
          seconds: chart.nakshatra.degreePosition.seconds + 1,
        },
      },
    };
    expect(() => calculateVimshottariDasha(BIRTH_INSTANT, alteredChartSummary))
      .toThrow(/inconsistent/i);
  });
});
