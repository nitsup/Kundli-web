import { createInterface } from 'node:readline/promises';
import process from 'node:process';

import { astrologyEngineContract } from '@/lib/astrology/engine';
import { createCalculationInput } from '@/lib/astrology/calculation-input';
import { swissEphemerisProvider } from '@/lib/astrology/swiss-ephemeris-provider';
import { calculateTransits } from '@/lib/astrology/transits';
import type { CalculationInputDraft } from '@/lib/astrology/calculation-input';
import {
  STRENGTH_TRANSIT_METHODOLOGY_VERSION,
  VEDIC_METHODOLOGY_VERSION,
  type CalculationConfiguration,
} from '@/lib/domain/types';

const configuration: CalculationConfiguration = {
  chartSystem: 'vedic',
  zodiacSystem: 'sidereal',
  ayanamsa: 'lahiri',
  nodeType: 'true',
  houseSystem: 'whole_sign',
  calculationFlags: ['swiss_ephemeris', 'speed'],
  methodologyVersion: VEDIC_METHODOLOGY_VERSION,
};

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const answers = prompt[Symbol.asyncIterator]();

async function ask(label: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  process.stdout.write(`${label}${suffix}: `);
  const next = await answers.next();
  if (next.done) {
    throw new Error('Input ended before the diagnostic questions were complete.');
  }
  const answer = next.value.trim();
  return answer || defaultValue || '';
}

async function askRequired(label: string, defaultValue?: string): Promise<string> {
  while (true) {
    const answer = await ask(label, defaultValue);
    if (answer) return answer;
    console.log('A value is required.');
  }
}

async function askNumber(label: string): Promise<number> {
  while (true) {
    const value = await askRequired(label);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    console.log('Enter a finite number using a decimal point if needed.');
  }
}

async function askChoice<T extends string>(
  label: string,
  choices: readonly T[],
): Promise<T> {
  while (true) {
    const answer = await askRequired(`${label} (${choices.join('/')})`);
    const selected = choices.find((choice) => choice === answer);
    if (selected) return selected;
    console.log(`Choose one of: ${choices.join(', ')}.`);
  }
}

function printJson(heading: string, value: unknown): void {
  console.log(`\n=== ${heading} ===`);
  console.log(JSON.stringify(value, null, 2));
}

async function askLocation() {
  const country = await askRequired('Country');
  const state = await ask('State/region (optional)');
  const city = await askRequired('City/locality');
  const { latitude, longitude } = await askCoordinates();
  return { country, ...(state ? { state } : {}), city, latitude, longitude };
}

async function askCoordinates() {
  const latitude = await askNumber('Latitude in decimal degrees (-90 to 90)');
  const longitude = await askNumber('Longitude in decimal degrees (-180 to 180)');
  return { latitude, longitude };
}

async function runBirthChart(): Promise<void> {
  console.log('\nBirth input — use the recorded local birth time and an IANA timezone.');
  console.log('This tool does not geocode place names or guess missing coordinates/timezones.');

  const name = await askRequired('Person label (can be a non-identifying label)', 'Diagnostic run');
  const dateOfBirth = await askRequired('Birth date (YYYY-MM-DD)');
  const timeOfBirth = await askRequired('Local birth time (HH:mm or HH:mm:ss)');
  const timezone = await askRequired('IANA timezone (for example, Asia/Kolkata)');
  const fold = await askChoice('If this local time repeats due to DST, choose fold handling', [
    'not-applicable',
    'earlier',
    'later',
  ] as const);
  const timeAccuracy = await askChoice('Birth-time accuracy', [
    'exact',
    'approximate',
    'unknown',
  ] as const);
  const place = await askLocation();
  const timezoneSource = await askChoice('Timezone source (self-reported is not independently verified)', [
    'user',
    'geocoding',
    'calculation_provider',
    'unknown',
  ] as const);
  const locationSource = await askChoice('Coordinate/place source', [
    'user',
    'geocoding',
    'unknown',
  ] as const);

  const draft: CalculationInputDraft = {
    birthProfileId: 'terminal-diagnostic',
    name,
    dateOfBirth,
    timeOfBirth,
    timeAccuracy,
    ...(fold === 'not-applicable' ? {} : { dstFoldResolution: fold }),
    location: {
      ...place,
      timezone,
      timezoneSource,
      locationSource,
    },
  };
  const input = createCalculationInput(draft);

  printJson('VALIDATED CALCULATION INPUT', input);
  printJson('LOCKED CALCULATION CONFIGURATION', configuration);

  const diagnostic = swissEphemerisProvider.calculateDetailed(input, configuration);
  printJson('RAW SWISS ADAPTER OUTPUT', diagnostic);
  console.log(
    '\nNote: Ketu is derived as the point opposite True Rahu by the adapter; ' +
    'it is not an independently requested Swiss body.',
  );

  const result = await astrologyEngineContract.calculate(input, configuration);
  printJson('KUNDLI-WEB STRUCTURED CALCULATION RESULT', result);
  console.log(
    '\nThe result includes implemented D1, Vimshottari, Yoga/Dosha, and Naisargika Bala outputs. ' +
    'It does not imply independent accuracy verification.',
  );
}

async function runTransit(): Promise<void> {
  console.log('\nTransit input — supply an explicit ISO-8601 instant with Z or a numeric offset.');
  const requestedInstant = await askRequired('Transit instant (for example, 2026-09-29T09:42:00Z)');
  const { latitude, longitude } = await askCoordinates();

  printJson('LOCKED CALCULATION CONFIGURATION', configuration);
  const result = calculateTransits(
    { requestedInstant, latitude, longitude },
    configuration,
  );
  const diagnostic = swissEphemerisProvider.calculateAtDetailed(
    result.resolvedInstantUtc,
    latitude,
    longitude,
    configuration,
  );
  printJson('RAW SWISS ADAPTER OUTPUT', diagnostic);
  printJson('KUNDLI-WEB TRANSIT RESULT', result);
  console.log(
    `\nTransit methodology: ${STRENGTH_TRANSIT_METHODOLOGY_VERSION}. ` +
    'This reports explicit-instant positions only; it does not calculate aspects or forecasts.',
  );
}

async function main(): Promise<void> {
  try {
    console.log('Kundli-Web Swiss Ephemeris diagnostic (local terminal only)');
    console.log(
      'This prints inputs and birth details to the terminal. Avoid shared terminals and redact output before sharing.',
    );
    const mode = await askChoice('What do you want to inspect?', ['birth-chart', 'transit'] as const);
    if (mode === 'birth-chart') {
      await runBirthChart();
    } else {
      await runTransit();
    }
  } catch (error) {
    console.error('\nDiagnostic failed; no result is being reported as successful.');
    console.error(error instanceof Error ? error.message : String(error));
    if (
      error &&
      typeof error === 'object' &&
      'details' in error &&
      error.details !== undefined
    ) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  } finally {
    prompt.close();
  }
}

void main();
