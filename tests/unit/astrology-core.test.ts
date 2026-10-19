import { describe, expect, it } from 'vitest';

import { createCalculationInput } from '@/lib/astrology/calculation-input';
import { astrologyEngineContract } from '@/lib/astrology/engine';
import { swissEphemerisProvider } from '@/lib/astrology/swiss-ephemeris-provider';
import {
  CLASSICAL_DIGNITY_DATASET,
  NAKSHATRA_DATASET,
  RASHI_DATASET,
  VEDIC_METHODOLOGY_VERSION,
  classifyVedicChart,
  getDignityAssessment,
  getNakshatraPlacement,
  getRashiPlacement,
  normalizeLongitude,
} from '@/lib/astrology/vedic-primitives';
import { CHART_TYPES } from '@/lib/domain/types';
import type {
  AstronomicalPosition,
  CalculationConfiguration,
  PlanetName,
  RashiId,
} from '@/lib/domain/types';
import { isValidTimeZone, resolveLocalBirthTime } from '@/lib/timezone';
import { birthChartSchema, calculationResultSchema } from '@/lib/validation/schemas';

const configuration: CalculationConfiguration = {
  chartSystem: 'vedic',
  zodiacSystem: 'sidereal',
  ayanamsa: 'lahiri',
  nodeType: 'true',
  houseSystem: 'whole_sign',
  calculationFlags: ['swiss_ephemeris', 'speed'],
  methodologyVersion: VEDIC_METHODOLOGY_VERSION,
};

const RASHI_LORDS: ReadonlyArray<[RashiId, PlanetName]> = [
  ['aries', 'mars'],
  ['taurus', 'venus'],
  ['gemini', 'mercury'],
  ['cancer', 'moon'],
  ['leo', 'sun'],
  ['virgo', 'mercury'],
  ['libra', 'venus'],
  ['scorpio', 'mars'],
  ['sagittarius', 'jupiter'],
  ['capricorn', 'saturn'],
  ['aquarius', 'saturn'],
  ['pisces', 'jupiter'],
];

const NAKSHATRA_LORDS: readonly PlanetName[] = [
  'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury',
  'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury',
  'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury',
];
const NAKSHATRA_IDS = [
  'ashwini', 'bharani', 'krittika', 'rohini', 'mrigashira', 'ardra', 'punarvasu',
  'pushya', 'ashlesha', 'magha', 'purva-phalguni', 'uttara-phalguni', 'hasta',
  'chitra', 'swati', 'vishakha', 'anuradha', 'jyeshtha', 'mula',
  'purva-ashadha', 'uttara-ashadha', 'shravana', 'dhanishtha', 'shatabhisha',
  'purva-bhadrapada', 'uttara-bhadrapada', 'revati',
] as const;
const CLASSICAL_PLANETS = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn',
] as const;

function makeInput() {
  return createCalculationInput({
    birthProfileId: 'test-profile',
    name: 'Test',
    dateOfBirth: '1990-01-02',
    timeOfBirth: '12:30:00',
    timeAccuracy: 'exact',
    location: {
      country: 'India',
      city: 'Delhi',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      timezoneSource: 'user',
      locationSource: 'user',
    },
  });
}

function makeAstronomicalPosition(
  planet: PlanetName,
  siderealLongitude: number,
): AstronomicalPosition {
  return {
    planet,
    siderealLongitude,
    tropicalLongitude: siderealLongitude,
    latitude: 0,
    distanceAu: 1,
    longitudeSpeedDegreesPerDay: 0.1,
    latitudeSpeedDegreesPerDay: 0,
    distanceSpeedAuPerDay: 0,
    providerFlags: 258,
  };
}

describe('timezone-aware calculation input', () => {
  it('resolves ordinary local times and records the UTC offset', () => {
    expect(resolveLocalBirthTime('1990-01-02', '12:30:00', 'Asia/Kolkata')).toEqual({
      birthDateTimeUtc: '1990-01-02T07:00:00.000Z',
      timezoneOffset: '+05:30',
    });
    expect(resolveLocalBirthTime('1990-01-02', '12:30', 'Asia/Kolkata')).toEqual({
      birthDateTimeUtc: '1990-01-02T07:00:00.000Z',
      timezoneOffset: '+05:30',
    });
    expect(resolveLocalBirthTime('1990-01-02', '12:30:45', 'Asia/Kolkata'))
      .toMatchObject({ birthDateTimeUtc: '1990-01-02T07:00:45.000Z' });
  });

  it('requires and preserves either explicit choice for repeated daylight-saving times', () => {
    expect(() => resolveLocalBirthTime('2024-11-03', '01:30:00', 'America/New_York'))
      .toThrow(/ambiguous/i);
    expect(resolveLocalBirthTime('2024-11-03', '01:30:00', 'America/New_York', 'earlier'))
      .toEqual({
        birthDateTimeUtc: '2024-11-03T05:30:00.000Z',
        timezoneOffset: '-04:00',
        dstFoldResolution: 'earlier',
      });
    expect(resolveLocalBirthTime('2024-11-03', '01:30:00', 'America/New_York', 'later'))
      .toEqual({
        birthDateTimeUtc: '2024-11-03T06:30:00.000Z',
        timezoneOffset: '-05:00',
        dstFoldResolution: 'later',
      });
  });

  it('rejects nonexistent daylight-saving local times', () => {
    expect(() => resolveLocalBirthTime('2024-03-10', '02:30:00', 'America/New_York'))
      .toThrow(/does not exist/i);
  });

  it('supports non-hour offsets, date rollover, and historical second-level offsets', () => {
    expect(resolveLocalBirthTime('2020-01-01', '00:15', 'Asia/Kathmandu')).toMatchObject({
      birthDateTimeUtc: '2019-12-31T18:30:00.000Z',
      timezoneOffset: '+05:45',
    });
    expect(resolveLocalBirthTime('2000-01-01', '00:30', 'Pacific/Kiritimati')).toMatchObject({
      birthDateTimeUtc: '1999-12-31T10:30:00.000Z',
      timezoneOffset: '+14:00',
    });
    expect(resolveLocalBirthTime('1850-01-01', '12:00:00', 'Asia/Kolkata')).toMatchObject({
      birthDateTimeUtc: '1850-01-01T06:06:32.000Z',
      timezoneOffset: '+05:53:28',
    });
  });

  it('rejects timezone abbreviations and invalid civil dates including year zero', () => {
    expect(isValidTimeZone('IST')).toBe(false);
    expect(resolveLocalBirthTime('2000-02-29', '12:00', 'UTC'))
      .toMatchObject({ birthDateTimeUtc: '2000-02-29T12:00:00.000Z' });
    expect(() => resolveLocalBirthTime('2023-02-29', '12:00', 'UTC')).toThrow(/invalid/i);
    expect(() => resolveLocalBirthTime('0000-01-01', '12:00', 'UTC')).toThrow(/invalid/i);
    expect(() => resolveLocalBirthTime('2000-01-01', '12:00', '')).toThrow(/timezone/i);
  });

  it('does not depend on the server default timezone', () => {
    const previousTimezone = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Honolulu';
      const honoluluDefault = resolveLocalBirthTime(
        '1990-01-02',
        '12:30',
        'Asia/Kolkata',
      );
      process.env.TZ = 'America/Los_Angeles';
      const losAngelesDefault = resolveLocalBirthTime(
        '1990-01-02',
        '12:30',
        'Asia/Kolkata',
      );
      expect(losAngelesDefault).toEqual(honoluluDefault);
    } finally {
      if (previousTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previousTimezone;
      }
    }
  });
});

describe('Rashi primitives', () => {
  it('uses one canonical dataset with all classical Rashi lords', () => {
    expect(RASHI_DATASET).toHaveLength(12);
    expect(RASHI_DATASET.map(({ id }) => id)).toEqual(RASHI_LORDS.map(([id]) => id));
    for (const [id, lord] of RASHI_LORDS) {
      const rashi = RASHI_DATASET.find((entry) => entry.id === id);
      expect(rashi).toBeDefined();
      if (!rashi) throw new Error(`Missing canonical Rashi ${id}.`);
      expect(rashi.lord).toBe(lord);
      expect(rashi.endLongitude - rashi.startLongitude).toBe(30);
    }
  });

  it('classifies every exact Rashi boundary and values on either side', () => {
    for (let index = 0; index < 12; index += 1) {
      const boundary = index * 30;
      const expectedIndex = index + 1;
      expect(getRashiPlacement(boundary).index).toBe(expectedIndex);
      if (index > 0) {
        expect(getRashiPlacement(boundary - 1e-10).index).toBe(index);
        expect(getRashiPlacement(boundary + 1e-10).index).toBe(expectedIndex);
      }
    }
    expect(getRashiPlacement(0).id).toBe('aries');
    expect(getRashiPlacement(360).id).toBe('aries');
    expect(getRashiPlacement(359.999999999).id).toBe('pisces');
  });

  it('normalizes negative and overflow longitude without rounding', () => {
    expect(normalizeLongitude(-1)).toBe(359);
    expect(normalizeLongitude(721)).toBe(1);
    expect(getRashiPlacement(-30).id).toBe('pisces');
    expect(() => normalizeLongitude(Number.NaN)).toThrow(/finite/i);
    expect(() => normalizeLongitude(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});

describe('Nakshatra and Pada primitives', () => {
  it('provides all 27 canonical Nakshatra lords and four Pada intervals each', () => {
    expect(NAKSHATRA_DATASET).toHaveLength(27);
    expect(NAKSHATRA_DATASET.map(({ id }) => id)).toEqual(NAKSHATRA_IDS);
    NAKSHATRA_DATASET.forEach((nakshatra, index) => {
      expect(nakshatra.index).toBe(index + 1);
      expect(nakshatra.lord).toBe(NAKSHATRA_LORDS[index]);
      expect(nakshatra.padaBoundaries).toHaveLength(5);
      expect(nakshatra.padaBoundaries[0]).toBe(nakshatra.startLongitude);
      expect(nakshatra.padaBoundaries[4]).toBe(nakshatra.endLongitude);
      expect(nakshatra.endLongitude - nakshatra.startLongitude).toBeCloseTo(40 / 3, 12);
      expect(getNakshatraPlacement(nakshatra.startLongitude).id).toBe(nakshatra.id);
    });
  });

  it('classifies every Nakshatra and Pada boundary as a half-open interval', () => {
    expect(360 / 27).toBeCloseTo(40 / 3, 14);
    expect(360 / 108).toBeCloseTo(10 / 3, 14);

    for (let boundaryIndex = 0; boundaryIndex < 108; boundaryIndex += 1) {
      const boundary = (boundaryIndex * 360) / 108;
      const expectedNakshatra = NAKSHATRA_DATASET[Math.floor(boundaryIndex / 4)];
      const expectedPada = (boundaryIndex % 4) + 1;
      const exact = getNakshatraPlacement(boundary);

      expect(exact).toMatchObject({
        id: expectedNakshatra.id,
        index: expectedNakshatra.index,
        name: expectedNakshatra.name,
        lord: expectedNakshatra.lord,
        pada: expectedPada,
        startLongitude: expectedNakshatra.startLongitude,
        endLongitude: expectedNakshatra.endLongitude,
      });
      expect(exact.longitude).toBe(boundary);
      expect(exact.degreeWithinNakshatra).toBeGreaterThanOrEqual(0);
      expect(exact.degreeWithinNakshatra).toBeLessThan(40 / 3);

      if (boundaryIndex > 0) {
        const delta = Number.EPSILON * Math.max(1, Math.abs(boundary)) * 2;
        const before = getNakshatraPlacement(boundary - delta);
        const after = getNakshatraPlacement(boundary + delta);
        const previousSubdivisionIndex = boundaryIndex - 1;

        expect(before.index).toBe(Math.floor(previousSubdivisionIndex / 4) + 1);
        expect(before.pada).toBe((previousSubdivisionIndex % 4) + 1);
        expect(after.index).toBe(expectedNakshatra.index);
        expect(after.pada).toBe(expectedPada);
      }
    }

    for (let nakshatraIndex = 0; nakshatraIndex < 27; nakshatraIndex += 1) {
      const nakshatra = NAKSHATRA_DATASET[nakshatraIndex];
      const endBoundaryIndex = (nakshatraIndex + 1) * 4;
      const endLongitude = (endBoundaryIndex * 360) / 108;
      const beforeEnd = getNakshatraPlacement(endLongitude - 1e-10);
      const atEnd = getNakshatraPlacement(endLongitude);

      expect(getNakshatraPlacement(nakshatra.startLongitude).id).toBe(nakshatra.id);
      expect(beforeEnd).toMatchObject({
        id: nakshatra.id,
        index: nakshatra.index,
        pada: 4,
      });
      expect(atEnd.id).toBe(NAKSHATRA_DATASET[(nakshatraIndex + 1) % 27].id);
    }

    expect(getNakshatraPlacement(0)).toMatchObject({
      id: 'ashwini',
      index: 1,
      pada: 1,
      longitude: 0,
    });
    expect(getNakshatraPlacement(360)).toMatchObject({
      id: 'ashwini',
      index: 1,
      pada: 1,
      longitude: 0,
    });
    expect(getNakshatraPlacement(-1e-13)).toMatchObject({
      id: 'revati',
      index: 27,
      pada: 4,
    });
    expect(getNakshatraPlacement(1e-13)).toMatchObject({
      id: 'ashwini',
      index: 1,
      pada: 1,
    });
    expect(getNakshatraPlacement(360 - 1e-10)).toMatchObject({
      id: 'revati',
      index: 27,
      pada: 4,
    });
  });

  it('keeps tiny negative wraparound values inside the normalized range', () => {
    for (const longitude of [-Number.MIN_VALUE, -1e-14]) {
      const normalized = normalizeLongitude(longitude);
      expect(normalized).toBe(0);
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThan(360);
      expect(getRashiPlacement(longitude).id).toBe('aries');
      expect(getNakshatraPlacement(longitude)).toMatchObject({
        id: 'ashwini',
        pada: 1,
        longitude: 0,
      });
    }
  });

  it('preserves Nakshatra/Pada and lord for every supported body in D1', () => {
    const bodies: PlanetName[] = [
      'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn',
      'rahu', 'ketu', 'uranus', 'neptune', 'pluto',
    ];
    const chart = classifyVedicChart(
      12.5,
      bodies.map((body, index) => makeAstronomicalPosition(body, index * (360 / bodies.length))),
    );

    expect(chart.planets.map(({ planet }) => planet)).toEqual(bodies);
    for (const planet of chart.planets) {
      expect(planet.nakshatra.longitude).toBe(planet.longitude);
      expect(planet.nakshatra).toEqual(getNakshatraPlacement(planet.rawSiderealLongitude));
      expect(planet.nakshatra.lord).toBe(
        NAKSHATRA_DATASET[planet.nakshatra.index - 1].lord,
      );
      expect(planet.rashi.longitude).toBe(planet.nakshatra.longitude);
    }

    const moon = chart.planets.find(({ planet }) => planet === 'moon');
    expect(moon).toBeDefined();
    if (!moon) throw new Error('D1 chart is missing the Moon.');
    expect(chart.ascendantNakshatra.longitude).toBe(chart.ascendantLongitude);
  });

  it('exposes the Moon Nakshatra snapshot needed for later Dasha calculations', async () => {
    const chart = (await astrologyEngineContract.calculate(makeInput(), configuration)).charts[0];
    const moon = chart.planets.find(({ planet }) => planet === 'moon');

    expect(moon).toBeDefined();
    if (!moon) throw new Error('D1 chart is missing the Moon.');
    expect(chart.nakshatra).toEqual(moon.nakshatra);
    expect(chart.nakshatra).toMatchObject({
      id: NAKSHATRA_DATASET[moon.nakshatra.index - 1].id,
      lord: NAKSHATRA_DATASET[moon.nakshatra.index - 1].lord,
      longitude: moon.longitude,
      degreeWithinNakshatra: moon.nakshatra.degreeWithinNakshatra,
    });
  });
});

describe('classical planetary dignity primitives', () => {
  it('records the approved classical dignity assignments and Moolatrikona ranges', () => {
    expect(Object.keys(CLASSICAL_DIGNITY_DATASET).sort()).toEqual([
      'jupiter', 'mars', 'mercury', 'moon', 'saturn', 'sun', 'venus',
    ]);
    expect(CLASSICAL_DIGNITY_DATASET).toMatchObject({
      sun: { exaltationSign: 'aries', debilitationSign: 'libra', ownSigns: ['leo'], moolatrikona: { sign: 'leo', startDegree: 0, endDegree: 20 } },
      moon: { exaltationSign: 'taurus', debilitationSign: 'scorpio', ownSigns: ['cancer'], moolatrikona: { sign: 'taurus', startDegree: 4, endDegree: 30 } },
      mars: { exaltationSign: 'capricorn', debilitationSign: 'cancer', ownSigns: ['aries', 'scorpio'], moolatrikona: { sign: 'aries', startDegree: 0, endDegree: 12 } },
      mercury: { exaltationSign: 'virgo', debilitationSign: 'pisces', ownSigns: ['gemini', 'virgo'], moolatrikona: { sign: 'virgo', startDegree: 0, endDegree: 15 } },
      jupiter: { exaltationSign: 'cancer', debilitationSign: 'capricorn', ownSigns: ['sagittarius', 'pisces'], moolatrikona: { sign: 'sagittarius', startDegree: 0, endDegree: 10 } },
      venus: { exaltationSign: 'pisces', debilitationSign: 'virgo', ownSigns: ['taurus', 'libra'], moolatrikona: { sign: 'libra', startDegree: 0, endDegree: 15 } },
      saturn: { exaltationSign: 'libra', debilitationSign: 'aries', ownSigns: ['capricorn', 'aquarius'], moolatrikona: { sign: 'aquarius', startDegree: 0, endDegree: 20 } },
    });
  });

  it('applies dignity precedence and exclusive Moolatrikona end boundaries', () => {
    const exaltationCases: ReadonlyArray<[PlanetName, RashiId, number]> = [
      ['sun', 'aries', 0],
      ['moon', 'taurus', 0],
      ['mars', 'capricorn', 0],
      ['mercury', 'virgo', 20],
      ['jupiter', 'cancer', 0],
      ['venus', 'pisces', 0],
      ['saturn', 'libra', 0],
    ];
    const debilitationCases: ReadonlyArray<[PlanetName, RashiId]> = [
      ['sun', 'libra'], ['moon', 'scorpio'], ['mars', 'cancer'],
      ['mercury', 'pisces'], ['jupiter', 'capricorn'], ['venus', 'virgo'],
      ['saturn', 'aries'],
    ];
    const moolatrikonaCases: ReadonlyArray<[PlanetName, RashiId, number, number]> = [
      ['sun', 'leo', 0, 20],
      ['moon', 'taurus', 4, 30],
      ['mars', 'aries', 0, 12],
      ['mercury', 'virgo', 0, 15],
      ['jupiter', 'sagittarius', 0, 10],
      ['venus', 'libra', 0, 15],
      ['saturn', 'aquarius', 0, 20],
    ];
    const ownSignCases: ReadonlyArray<[PlanetName, RashiId]> = [
      ['sun', 'leo'], ['moon', 'cancer'], ['mars', 'scorpio'],
      ['mercury', 'gemini'], ['jupiter', 'pisces'], ['venus', 'taurus'],
      ['saturn', 'capricorn'],
    ];

    for (const [planet, sign, degree] of exaltationCases) {
      expect(getDignityAssessment(planet, getRashiPlacement(
        RASHI_DATASET.find((rashi) => rashi.id === sign)!.startLongitude + degree,
      )).state).toBe('exalted');
    }
    for (const [planet, sign] of debilitationCases) {
      expect(getDignityAssessment(planet, getRashiPlacement(
        RASHI_DATASET.find((rashi) => rashi.id === sign)!.startLongitude,
      )).state).toBe('debilitated');
    }
    for (const [planet, sign, start, end] of moolatrikonaCases) {
      const signStart = RASHI_DATASET.find((rashi) => rashi.id === sign)!.startLongitude;
      expect(getDignityAssessment(planet, getRashiPlacement(signStart + start)).state)
        .toBe('moolatrikona');
      expect(getDignityAssessment(planet, getRashiPlacement(signStart + end)).state)
        .not.toBe('moolatrikona');
    }
    for (const [planet, sign] of ownSignCases) {
      const definition = CLASSICAL_DIGNITY_DATASET[planet]!;
      const degree = definition.moolatrikona.sign === sign
        ? definition.moolatrikona.endDegree
        : 0;
      expect(getDignityAssessment(planet, getRashiPlacement(
        RASHI_DATASET.find((rashi) => rashi.id === sign)!.startLongitude + degree,
      )).state).toBe('own_sign');
    }
    for (const planet of CLASSICAL_PLANETS) {
      const definition = CLASSICAL_DIGNITY_DATASET[planet];
      expect(definition).toBeDefined();
      if (!definition) throw new Error(`Missing classical dignity for ${planet}.`);
      const neutralSign = RASHI_DATASET.find((rashi) =>
        rashi.id !== definition.exaltationSign &&
        rashi.id !== definition.debilitationSign &&
        !definition.ownSigns.includes(rashi.id)
      );
      expect(neutralSign).toBeDefined();
      if (!neutralSign) throw new Error(`Missing neutral Rashi for ${planet}.`);
      expect(getDignityAssessment(planet, getRashiPlacement(
        neutralSign.startLongitude,
      )).state).toBe('neutral');
    }
    expect(getDignityAssessment('rahu', getRashiPlacement(0)).state).toBe('not_applicable');
    expect(getDignityAssessment('ketu', getRashiPlacement(180)).state).toBe('not_applicable');
    expect(getDignityAssessment('uranus', getRashiPlacement(0)).state).toBe('not_applicable');
  });
});

describe('provider-neutral Vedic classification', () => {
  it('derives Ascendant and Whole Sign houses from the Ascendant Rashi', () => {
    const classified = classifyVedicChart(33, [
      makeAstronomicalPosition('sun', 0),
      makeAstronomicalPosition('jupiter', 30),
    ]);

    expect(classified.ascendantRashi).toMatchObject({
      id: 'taurus',
      lord: 'venus',
      degreeWithinRashi: 3,
    });
    expect(classified.ascendantNakshatra.id).toBe('krittika');
    expect(classified.houses).toHaveLength(12);
    expect(classified.houses[0]).toMatchObject({
      house: 1,
      signId: 'taurus',
      lord: 'venus',
      startLongitude: 30,
      endLongitude: 60,
    });
    expect(classified.houses[11]).toMatchObject({
      house: 12,
      signId: 'aries',
      startLongitude: 0,
      endLongitude: 30,
    });
    expect(classified.planets.map(({ house }) => house)).toEqual([12, 1]);
  });

  it('moves the Ascendant and houses at exact Rashi boundaries', () => {
    for (let boundaryIndex = 1; boundaryIndex < 12; boundaryIndex += 1) {
      const boundary = boundaryIndex * 30;
      const before = classifyVedicChart(boundary - 1e-10, []);
      const onBoundary = classifyVedicChart(boundary, []);
      const after = classifyVedicChart(boundary + 1e-10, []);

      expect(before.ascendantRashi.id).toBe(RASHI_DATASET[boundaryIndex - 1].id);
      expect(before.houses[0].signId).toBe(RASHI_DATASET[boundaryIndex - 1].id);
      expect(onBoundary.ascendantRashi.id).toBe(RASHI_DATASET[boundaryIndex].id);
      expect(onBoundary.houses[0].signId).toBe(RASHI_DATASET[boundaryIndex].id);
      expect(after.ascendantRashi.id).toBe(RASHI_DATASET[boundaryIndex].id);
      expect(after.houses[0].signId).toBe(RASHI_DATASET[boundaryIndex].id);
    }
    expect(classifyVedicChart(0, []).houses[0].signId).toBe('aries');
    expect(classifyVedicChart(360, []).houses[0].signId).toBe('aries');
  });

  it('maps every possible Ascendant Rashi to twelve sequential house Rashis and lords', () => {
    const bodies: PlanetName[] = [
      'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus',
      'saturn', 'uranus', 'neptune', 'pluto', 'rahu', 'ketu',
    ];

    for (let ascendantIndex = 0; ascendantIndex < RASHI_DATASET.length; ascendantIndex += 1) {
      const ascendantLongitude = ascendantIndex * 30 + 0.125;
      const positions = bodies.map((planet, signIndex) =>
        makeAstronomicalPosition(planet, signIndex * 30 + 0.25),
      );
      const chart = classifyVedicChart(ascendantLongitude, positions);
      const expectedAscendantRashi = RASHI_DATASET[ascendantIndex];

      expect(chart.ascendantRashi.id).toBe(expectedAscendantRashi.id);
      expect(chart.houses.map(({ house }) => house)).toEqual(
        Array.from({ length: 12 }, (_, index) => index + 1),
      );
      chart.houses.forEach((house, houseIndex) => {
        const expectedRashi = RASHI_DATASET[(ascendantIndex + houseIndex) % 12];
        expect(house).toMatchObject({
          house: houseIndex + 1,
          signId: expectedRashi.id,
          sign: expectedRashi.name,
          lord: expectedRashi.lord,
          startLongitude: expectedRashi.startLongitude,
          endLongitude: expectedRashi.endLongitude,
          occupants: [bodies[(houseIndex + ascendantIndex) % 12]],
        });
      });
      chart.planets.forEach((planet, planetIndex) => {
        const expectedHouse = ((planet.rashi.index - 1 - ascendantIndex + 12) % 12) + 1;
        expect(planet.house).toBe(expectedHouse);
        expect(chart.houses[expectedHouse - 1].occupants).toContain(bodies[planetIndex]);
      });
    }
  });

  it('keeps Rahu and Ketu opposite and classifies each by its own Rashi and house', () => {
    const chart = classifyVedicChart(61, [
      makeAstronomicalPosition('rahu', 12.5),
      makeAstronomicalPosition('ketu', 192.5),
    ]);
    const [rahu, ketu] = chart.planets;

    expect(normalizeLongitude(rahu.longitude + 180)).toBe(ketu.longitude);
    expect(rahu.rashi.id).toBe('aries');
    expect(ketu.rashi.id).toBe('libra');
    expect(rahu.house).toBe(11);
    expect(ketu.house).toBe(5);
    expect(chart.houses[rahu.house - 1].occupants).toContain('rahu');
    expect(chart.houses[ketu.house - 1].occupants).toContain('ketu');
  });

  it('preserves raw provider longitude while normalizing and classifying without rounding', () => {
    const rawLongitude = 360 + 30 - 1e-10;
    const classified = classifyVedicChart(30 - 1e-10, [
      makeAstronomicalPosition('sun', rawLongitude),
    ]);
    const sun = classified.planets[0];

    expect(sun.rawSiderealLongitude).toBe(rawLongitude);
    expect(sun.longitude).toBeCloseTo(30 - 1e-10, 12);
    expect(sun.rashi.id).toBe('aries');
    expect(sun.nakshatra.longitude).toBe(sun.longitude);
  });

  it('returns byte-for-byte equivalent primitive classifications for identical inputs', () => {
    const positions = [
      makeAstronomicalPosition('sun', 145.123456789),
      makeAstronomicalPosition('rahu', 359.999999999),
      makeAstronomicalPosition('ketu', 179.999999999),
    ];
    const first = classifyVedicChart(29.999999999, positions);
    const second = classifyVedicChart(29.999999999, positions);

    expect(second).toEqual(first);
  });
});

describe('Swiss Ephemeris D1 engine integration', () => {
  it('exposes full raw Swiss house data through the diagnostics-only provider method', () => {
    const diagnostic = swissEphemerisProvider.calculateDetailed(makeInput(), configuration);

    expect(diagnostic.astronomical.positions).toHaveLength(12);
    expect(diagnostic.rawPositions).toHaveLength(11);
    expect(diagnostic.rawPositions[0]).toMatchObject({
      body: 'sun',
      tropical: {
        longitude: expect.any(Number),
        latitude: expect.any(Number),
        distance: expect.any(Number),
        longitudeSpeed: expect.any(Number),
        latitudeSpeed: expect.any(Number),
        distanceSpeed: expect.any(Number),
        flags: expect.any(Number),
      },
      sidereal: {
        longitude: expect.any(Number),
        latitude: expect.any(Number),
        distance: expect.any(Number),
        longitudeSpeed: expect.any(Number),
        latitudeSpeed: expect.any(Number),
        distanceSpeed: expect.any(Number),
        flags: expect.any(Number),
      },
    });
    expect(diagnostic.houseData.houseSystem).toBeDefined();
    expect(diagnostic.houseData.cusps.length).toBeGreaterThanOrEqual(13);
    expect(diagnostic.houseData.ascendant).toBe(
      diagnostic.astronomical.angles.tropicalAscendantLongitude,
    );
    expect(diagnostic.houseData.mc).toBe(
      diagnostic.astronomical.angles.tropicalMidheavenLongitude,
    );
    expect(diagnostic.houseData).toHaveProperty('armc');
    expect(diagnostic.houseData).toHaveProperty('vertex');
    expect(diagnostic.houseData).toHaveProperty('equatorialAscendant');
    expect(diagnostic.houseData).toHaveProperty('coAscendant1');
    expect(diagnostic.houseData).toHaveProperty('coAscendant2');
    expect(diagnostic.houseData).toHaveProperty('polarAscendant');
  });

  it('keeps Swiss output astronomical and applies deterministic Vedic classification afterward', async () => {
    const input = makeInput();
    const astronomical = swissEphemerisProvider.calculate(input, configuration);
    const first = await astrologyEngineContract.calculate(input, configuration);
    const second = await astrologyEngineContract.calculate(input, configuration);
    const chart = first.charts[0];
    const rahu = chart.planets.find(({ planet }) => planet === 'rahu')!;
    const ketu = chart.planets.find(({ planet }) => planet === 'ketu')!;
    const outerPlanet = chart.planets.find(({ planet }) => planet === 'uranus')!;

    expect(astronomical.positions).toHaveLength(12);
    expect(astronomical.positions.every((position) => !('rashi' in position))).toBe(true);
    expect(astronomical.positions.every((position) => !('nakshatra' in position))).toBe(true);
    expect(astronomical.positions.every((position) => !('house' in position))).toBe(true);
    expect(first.id).toBe(second.id);
    expect(CHART_TYPES).toEqual([
      'd1', 'd2', 'd3', 'd4', 'd7', 'd9', 'd10', 'd12', 'd16', 'd20',
      'd24', 'd27', 'd30', 'd40', 'd45', 'd60', 'custom',
    ]);
    const validation = calculationResultSchema.safeParse(first);
    expect(validation.success, JSON.stringify(validation.success ? [] : validation.error.issues))
      .toBe(true);
    expect(first.version).toMatchObject({
      provider: 'Swiss Ephemeris Free Edition',
      providerVersion: '1.3.1',
      methodologyVersion: VEDIC_METHODOLOGY_VERSION,
      dashaMethodologyVersion: 'vimshottari-v1',
      yogaDoshaMethodologyVersion: 'vedic-rules-v1',
      strengthTransitMethodologyVersion: 'vedic-strength-transit-v1',
    });
    expect(first.version.ephemerisVersion).toMatch(/^[a-f0-9]{64}$/);
    expect(input.timezoneDatabaseVersion).toBe(process.versions.tz);
    expect(first.input.timezoneDatabaseVersion).toBe(process.versions.tz);
    expect(chart.metadata.methodologyVersion).toBe(VEDIC_METHODOLOGY_VERSION);
    expect(first.dasha).toMatchObject({
      system: 'vimshottari',
      startingMahadashaLord: chart.nakshatra.lord,
      birthInstant: input.birthDateTimeUtc,
      moon: {
        siderealLongitude: chart.planets.find(({ planet }) => planet === 'moon')?.longitude,
        nakshatraId: chart.nakshatra.id,
        nakshatraLord: chart.nakshatra.lord,
      },
    });
    expect(first.yogaDosha).toMatchObject({
      methodologyVersion: 'vedic-rules-v1',
      chartId: chart.id,
      yogas: [
        { ruleId: 'budha-aditya-yoga', category: 'yoga' },
        { ruleId: 'chandra-mangala-yoga', category: 'yoga' },
      ],
      doshas: [{ ruleId: 'mangala-dosha', category: 'dosha' }],
    });
    expect(calculationResultSchema.safeParse({
      ...first,
      yogaDosha: {
        ...first.yogaDosha,
        yogas: first.yogaDosha?.yogas.map((rule, index) =>
          index === 0 ? { ...rule, detected: !rule.detected } : rule),
      },
    }).success).toBe(false);
    expect(first.planetaryStrength).toMatchObject({
      methodologyVersion: 'vedic-strength-transit-v1',
      chartId: chart.id,
      system: 'naisargika-bala-component',
    });
    expect(first.planetaryStrength?.components.map(({ planet }) => planet))
      .toEqual(['saturn', 'mars', 'mercury', 'jupiter', 'venus', 'moon', 'sun']);
    expect(calculationResultSchema.safeParse({
      ...first,
      planetaryStrength: {
        ...first.planetaryStrength,
        components: first.planetaryStrength?.components.map((component, index) =>
          index === 0 ? { ...component, virupaNumerator: 1 } : component),
      },
    }).success).toBe(false);
    expect(chart.planets).toHaveLength(12);
    expect(chart.houses).toHaveLength(12);
    expect(chart.ascendantNakshatra.lord).toBeDefined();
    expect(rahu.dignity.state).toBe('not_applicable');
    expect(ketu.dignity.state).toBe('not_applicable');
    expect(outerPlanet.dignity.state).toBe('not_applicable');
    expect(rahu.nakshatra.pada).toBeGreaterThanOrEqual(1);
    expect(rahu.nakshatra.pada).toBeLessThanOrEqual(4);
    expect(ketu.nakshatra.pada).toBeGreaterThanOrEqual(1);
    expect(ketu.nakshatra.pada).toBeLessThanOrEqual(4);
    expect(normalizeLongitude(rahu.longitude + 180)).toBeCloseTo(ketu.longitude, 10);
    expect((rahu.providerFlags ?? 0) & 2).toBe(2);
    expect((rahu.providerFlags ?? 0) & 4).toBe(0);
  });

  it('does not let a display name change calculation identity or chart values', async () => {
    const input = makeInput();
    const renamedInput = { ...input, name: 'A different display name' };
    const original = await astrologyEngineContract.calculate(input, configuration);
    const renamed = await astrologyEngineContract.calculate(renamedInput, configuration);

    expect(renamed.input.name).toBe('A different display name');
    expect(renamed.id).toBe(original.id);
    expect(renamed.charts[0].id).toBe(original.charts[0].id);
    expect(renamed.charts[0].planets).toEqual(original.charts[0].planets);
  });

  it('rejects inconsistent house lord, planet house, and occupant assignments', async () => {
    const result = await astrologyEngineContract.calculate(makeInput(), configuration);
    const chart = result.charts[0];
    const wrongHouseLord = {
      ...chart,
      houses: chart.houses.map((house, index) => index === 0
        ? { ...house, lord: house.lord === 'mars' ? 'venus' as const : 'mars' as const }
        : house),
    };
    const wrongPlanetHouse = {
      ...chart,
      planets: chart.planets.map((planet, index) => index === 0
        ? { ...planet, house: (planet.house % 12) + 1 }
        : planet),
    };
    const wrongOccupants = {
      ...chart,
      houses: chart.houses.map((house, index) => index === 0
        ? { ...house, occupants: chart.planets.map(({ planet }) => planet) }
        : house),
    };

    expect(birthChartSchema.safeParse(wrongHouseLord).success).toBe(false);
    expect(birthChartSchema.safeParse(wrongPlanetHouse).success).toBe(false);
    expect(birthChartSchema.safeParse(wrongOccupants).success).toBe(false);
  });

  it('does not claim support for unimplemented divisional charts', async () => {
    await expect(astrologyEngineContract.calculate(makeInput(), {
      ...configuration,
      divisionalCharts: ['d9'],
    })).rejects.toThrow(/only the d1 chart/i);
  });
});
