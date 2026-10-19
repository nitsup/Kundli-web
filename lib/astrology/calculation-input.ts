import { AppError } from '@/lib/errors';
import type { CalculationInput } from '@/lib/domain/types';
import { normalizeTimeZone, resolveLocalBirthTime } from '@/lib/timezone';
import { calculationInputSchema } from '@/lib/validation/schemas';

export type CalculationInputDraft = Omit<
  CalculationInput,
  'birthDateTimeUtc' | 'timezoneOffset' | 'timezoneDatabaseVersion' | 'dstFoldResolution'
> & {
  dstFoldResolution?: CalculationInput['dstFoldResolution'];
};

export function createCalculationInput(draft: CalculationInputDraft): CalculationInput {
  const timezoneDatabaseVersion = process.versions.tz;
  if (!timezoneDatabaseVersion) {
    throw new AppError(
      'configuration',
      'The Node runtime does not expose its timezone database version.',
    );
  }

  const location = {
    ...draft.location,
    timezone: normalizeTimeZone(draft.location.timezone),
  };
  let resolvedTime;
  try {
    resolvedTime = resolveLocalBirthTime(
      draft.dateOfBirth,
      draft.timeOfBirth,
      location.timezone,
      draft.dstFoldResolution,
    );
  } catch (error) {
    throw new AppError(
      'validation',
      error instanceof Error ? error.message : 'Birth local time cannot be resolved.',
    );
  }

  const parsed = calculationInputSchema.safeParse({
    ...draft,
    location,
    ...resolvedTime,
    timezoneDatabaseVersion,
  });
  if (!parsed.success) {
    throw new AppError('validation', 'Calculation input is invalid.', parsed.error.issues);
  }
  return parsed.data;
}
