import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  CalculationFlag,
  HouseSystem,
  LunarPoint,
  Planet,
  SiderealMode,
  calculateHouses,
  calculatePosition,
  dateToJulianDay,
  getAyanamsaExUt,
  setEphemerisPath,
  setSiderealMode,
} from '@swisseph/node';

import { AppError } from '@/lib/errors';
import type {
  AstronomicalPosition,
  AstronomicalResult,
  CalculationConfiguration,
  CalculationInput,
  PlanetName,
} from '@/lib/domain/types';
import {
  calculationConfigurationSchema,
  calculationInputSchema,
} from '@/lib/validation/calculation-schemas';

const PROVIDER_VERSION = '1.3.1';
const PROVIDER_NAME = 'Swiss Ephemeris Free Edition';
const EPHEMERIS_FILES = ['sepl_18.se1', 'semo_18.se1', 'seas_18.se1'] as const;
const SWISS_FLAGS = CalculationFlag.SwissEphemeris | CalculationFlag.Speed;
const SIDEREAL_FLAGS = SWISS_FLAGS | CalculationFlag.Sidereal;

const BODY_MAP: ReadonlyArray<{ name: PlanetName; body: Planet }> = [
  { name: 'sun', body: Planet.Sun },
  { name: 'moon', body: Planet.Moon },
  { name: 'mercury', body: Planet.Mercury },
  { name: 'venus', body: Planet.Venus },
  { name: 'mars', body: Planet.Mars },
  { name: 'jupiter', body: Planet.Jupiter },
  { name: 'saturn', body: Planet.Saturn },
  { name: 'uranus', body: Planet.Uranus },
  { name: 'neptune', body: Planet.Neptune },
  { name: 'pluto', body: Planet.Pluto },
];

function prepareEphemeris() {
  const require = createRequire(resolve(process.cwd(), 'package.json'));
  const entryPath = require.resolve('@swisseph/node');
  const ephemerisPath = resolve(dirname(entryPath), '..', 'ephemeris');
  const hasher = createHash('sha256');

  for (const fileName of EPHEMERIS_FILES) {
    let fileContent: Buffer;
    try {
      fileContent = readFileSync(resolve(ephemerisPath, fileName));
    } catch {
      throw new AppError(
        'configuration',
        `Required Swiss Ephemeris data file is unavailable: ${fileName}.`,
      );
    }
    hasher.update(fileName).update(fileContent);
  }

  setEphemerisPath(ephemerisPath);
  return {
    ephemerisSource: EPHEMERIS_FILES.join(', '),
    ephemerisVersion: hasher.digest('hex'),
  };
}

const ephemerisMetadata = prepareEphemeris();

export interface SwissEphemerisDiagnosticResult {
  astronomical: AstronomicalResult;
  rawPositions: Array<{
    body: PlanetName | 'true_node';
    tropical: ReturnType<typeof calculatePosition>;
    sidereal: ReturnType<typeof calculatePosition>;
  }>;
  houseData: ReturnType<typeof calculateHouses>;
}

function assertSwissResult(flags: number, bodyName: string): void {
  if (
    !Number.isInteger(flags) ||
    (flags & CalculationFlag.SwissEphemeris) === 0 ||
    (flags & CalculationFlag.MoshierEphemeris) !== 0
  ) {
    throw new AppError(
      'calculation',
      `Swiss Ephemeris did not return a Swiss-file result for ${bodyName}.`,
      { returnedFlags: flags },
    );
  }
}

function resolveValidatedInput(input: CalculationInput): CalculationInput {
  const parsed = calculationInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError('validation', 'Calculation input is invalid.', parsed.error.issues);
  }
  return parsed.data;
}

function resolveValidatedConfiguration(
  configuration: CalculationConfiguration,
): CalculationConfiguration {
  const parsed = calculationConfigurationSchema.safeParse(configuration);
  if (!parsed.success) {
    throw new AppError('validation', 'Calculation configuration is invalid.', parsed.error.issues);
  }
  if (parsed.data.divisionalCharts?.some((chart) => chart !== 'd1')) {
    throw new AppError(
      'validation',
      'Only the D1 chart is available in this calculation phase.',
    );
  }
  return parsed.data;
}

function calculatePositions(julianDay: number): {
  positions: AstronomicalPosition[];
  rawPositions: SwissEphemerisDiagnosticResult['rawPositions'];
} {
  const rawPositions: SwissEphemerisDiagnosticResult['rawPositions'] = [];
  const positions = BODY_MAP.map(({ name, body }) => {
    const tropical = calculatePosition(julianDay, body, SWISS_FLAGS);
    assertSwissResult(tropical.flags, name);
    const sidereal = calculatePosition(julianDay, body, SIDEREAL_FLAGS);
    assertSwissResult(sidereal.flags, name);
    rawPositions.push({ body: name, tropical, sidereal });

    return {
      planet: name,
      siderealLongitude: sidereal.longitude,
      tropicalLongitude: tropical.longitude,
      latitude: sidereal.latitude,
      distanceAu: sidereal.distance,
      longitudeSpeedDegreesPerDay: sidereal.longitudeSpeed,
      latitudeSpeedDegreesPerDay: sidereal.latitudeSpeed,
      distanceSpeedAuPerDay: sidereal.distanceSpeed,
      providerFlags: sidereal.flags,
    };
  });

  const tropicalRahu = calculatePosition(julianDay, LunarPoint.TrueNode, SWISS_FLAGS);
  assertSwissResult(tropicalRahu.flags, 'true node');
  const siderealRahu = calculatePosition(julianDay, LunarPoint.TrueNode, SIDEREAL_FLAGS);
  assertSwissResult(siderealRahu.flags, 'true node');
  rawPositions.push({
    body: 'true_node',
    tropical: tropicalRahu,
    sidereal: siderealRahu,
  });
  positions.push(
    {
      planet: 'rahu',
      siderealLongitude: siderealRahu.longitude,
      tropicalLongitude: tropicalRahu.longitude,
      latitude: siderealRahu.latitude,
      distanceAu: siderealRahu.distance,
      longitudeSpeedDegreesPerDay: siderealRahu.longitudeSpeed,
      latitudeSpeedDegreesPerDay: siderealRahu.latitudeSpeed,
      distanceSpeedAuPerDay: siderealRahu.distanceSpeed,
      providerFlags: siderealRahu.flags,
    },
    {
      planet: 'ketu',
      siderealLongitude: siderealRahu.longitude + 180,
      tropicalLongitude: tropicalRahu.longitude + 180,
      latitude: -siderealRahu.latitude,
      distanceAu: siderealRahu.distance,
      longitudeSpeedDegreesPerDay: siderealRahu.longitudeSpeed,
      latitudeSpeedDegreesPerDay: -siderealRahu.latitudeSpeed,
      distanceSpeedAuPerDay: siderealRahu.distanceSpeed,
      providerFlags: siderealRahu.flags,
    },
  );

  return { positions, rawPositions };
}

function calculateAtJulianDayDetailed(
  julianDay: number,
  latitude: number,
  longitude: number,
): SwissEphemerisDiagnosticResult {
  try {
    setSiderealMode(SiderealMode.Lahiri);
    const ayanamsa = getAyanamsaExUt(julianDay, CalculationFlag.SwissEphemeris);
    const calculatedPositions = calculatePositions(julianDay);
    const houseData = calculateHouses(
      julianDay,
      latitude,
      longitude,
      HouseSystem.WholeSign,
    );
    return {
      astronomical: {
        julianDayUt: julianDay,
        positions: calculatedPositions.positions,
        angles: {
          tropicalAscendantLongitude: houseData.ascendant,
          siderealAscendantLongitude: houseData.ascendant - ayanamsa,
          tropicalMidheavenLongitude: houseData.mc,
          siderealMidheavenLongitude: houseData.mc - ayanamsa,
          ayanamshaDegrees: ayanamsa,
        },
        provider: {
          provider: PROVIDER_NAME,
          providerVersion: PROVIDER_VERSION,
          ...ephemerisMetadata,
        },
      },
      rawPositions: calculatedPositions.rawPositions,
      houseData,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('calculation', 'Swiss Ephemeris calculation failed.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

function calculateAtJulianDay(
  julianDay: number,
  latitude: number,
  longitude: number,
): AstronomicalResult {
  return calculateAtJulianDayDetailed(julianDay, latitude, longitude).astronomical;
}

function calculate(inputValue: CalculationInput, configurationValue: CalculationConfiguration): AstronomicalResult {
  const input = resolveValidatedInput(inputValue);
  resolveValidatedConfiguration(configurationValue);
  const instant = new Date(input.birthDateTimeUtc);
  const julianDay = dateToJulianDay(instant);
  return calculateAtJulianDay(
    julianDay,
    input.location.latitude,
    input.location.longitude,
  );
}

function calculateDetailed(
  inputValue: CalculationInput,
  configurationValue: CalculationConfiguration,
): SwissEphemerisDiagnosticResult {
  const input = resolveValidatedInput(inputValue);
  resolveValidatedConfiguration(configurationValue);
  return calculateAtJulianDayDetailed(
    dateToJulianDay(new Date(input.birthDateTimeUtc)),
    input.location.latitude,
    input.location.longitude,
  );
}

function calculateAt(
  instantUtc: string,
  latitude: number,
  longitude: number,
  configurationValue: CalculationConfiguration,
): AstronomicalResult {
  resolveValidatedConfiguration(configurationValue);
  const instantMilliseconds = Date.parse(instantUtc);
  if (
    !Number.isFinite(instantMilliseconds) ||
    new Date(instantMilliseconds).toISOString() !== instantUtc ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new AppError(
      'validation',
      'Transit instant must be canonical UTC and coordinates must be in range.',
    );
  }
  return calculateAtJulianDay(
    dateToJulianDay(new Date(instantMilliseconds)),
    latitude,
    longitude,
  );
}

function calculateAtDetailed(
  instantUtc: string,
  latitude: number,
  longitude: number,
  configurationValue: CalculationConfiguration,
): SwissEphemerisDiagnosticResult {
  resolveValidatedConfiguration(configurationValue);
  const instantMilliseconds = Date.parse(instantUtc);
  if (
    !Number.isFinite(instantMilliseconds) ||
    new Date(instantMilliseconds).toISOString() !== instantUtc ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new AppError(
      'validation',
      'Transit instant must be canonical UTC and coordinates must be in range.',
    );
  }
  return calculateAtJulianDayDetailed(
    dateToJulianDay(new Date(instantMilliseconds)),
    latitude,
    longitude,
  );
}

export const swissEphemerisProvider = {
  calculate,
  calculateDetailed,
  calculateAt,
  calculateAtDetailed,
};
