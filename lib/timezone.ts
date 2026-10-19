const timezoneAliases: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
};

export function normalizeTimeZone(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new RangeError('An explicit IANA timezone is required.');
  }
  return timezoneAliases[normalized] ?? normalized;
}

export function isValidTimeZone(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const normalized = normalizeTimeZone(value);
    if (
      !normalized.includes('/') &&
      normalized !== 'UTC' &&
      normalized !== 'GMT'
    ) {
      return false;
    }
    Intl.DateTimeFormat('en-US', { timeZone: normalized });
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export type DstFoldResolution = 'earlier' | 'later';

export interface ResolvedBirthTime {
  birthDateTimeUtc: string;
  timezoneOffset: string;
  dstFoldResolution?: DstFoldResolution;
}

function utcEpochFromParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function localPartsAt(
  instant: number,
  formatter: Intl.DateTimeFormat,
): [number, number, number, number, number, number] {
  const parts = formatter.formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return [
    Number(values.year),
    Number(values.month),
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  ];
}

function sameParts(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return left.every((part, index) => part === right[index]);
}

function offsetAt(instant: number, formatter: Intl.DateTimeFormat): number {
  const instantToSecond = Math.floor(instant / 1000) * 1000;
  const [year, month, day, hour, minute, second] = localPartsAt(instantToSecond, formatter);
  return utcEpochFromParts(year, month, day, hour, minute, second) - instantToSecond;
}

function formatOffset(offsetMilliseconds: number): string {
  const sign = offsetMilliseconds < 0 ? '-' : '+';
  let remainingSeconds = Math.abs(offsetMilliseconds) / 1000;
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds -= hours * 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds - minutes * 60;
  const minutePart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return `${sign}${minutePart}${seconds === 0 ? '' : `:${String(seconds).padStart(2, '0')}`}`;
}

function parseLocalBirthDateTime(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);

  if (!dateMatch || !timeMatch) {
    throw new RangeError('Birth date or local time has an invalid format.');
  }

  const parts = [
    Number(dateMatch[1]),
    Number(dateMatch[2]),
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] ?? 0),
  ] as const;
  const [year, month, day, hour, minute, second] = parts;
  const validationDate = new Date(utcEpochFromParts(year, month, day, hour, minute, second));

  if (
    year < 1 ||
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() + 1 !== month ||
    validationDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new RangeError('Birth date or local time is invalid.');
  }

  return parts;
}

function parseTimezoneOffset(offset: string): number {
  const match = /^([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(offset);
  if (!match) {
    throw new RangeError('Timezone offset must use ±HH:MM or ±HH:MM:SS format.');
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4] ?? 0);
  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new RangeError('Timezone offset is outside the supported range.');
  }

  const magnitude = ((hours * 60 + minutes) * 60 + seconds) * 1000;
  return match[1] === '-' ? -magnitude : magnitude;
}

export function isLocalBirthTimeConsistentWithOffset(
  date: string,
  time: string,
  birthDateTimeUtc: string,
  timezoneOffset: string,
): boolean {
  try {
    const localParts = parseLocalBirthDateTime(date, time);
    const expectedInstant = utcEpochFromParts(...localParts) - parseTimezoneOffset(timezoneOffset);
    return new Date(birthDateTimeUtc).getTime() === expectedInstant;
  } catch {
    return false;
  }
}

export function resolveLocalBirthTime(
  date: string,
  time: string,
  timezone: string,
  foldResolution?: DstFoldResolution,
): ResolvedBirthTime {
  const localParts = parseLocalBirthDateTime(date, time);

  if (!isValidTimeZone(timezone)) {
    throw new RangeError('Birth timezone must be a valid IANA timezone.');
  }

  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone: normalizeTimeZone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const naiveUtc = utcEpochFromParts(...localParts);
  const offsets = new Set<number>();

  for (let hours = -48; hours <= 48; hours += 0.5) {
    offsets.add(offsetAt(naiveUtc + hours * 60 * 60 * 1000, formatter));
  }

  const candidates = [...offsets]
    .map((offset) => ({ instant: naiveUtc - offset, offset }))
    .filter(({ instant }) => sameParts(localPartsAt(instant, formatter), localParts))
    .sort((left, right) => left.instant - right.instant);

  if (candidates.length === 0) {
    throw new RangeError('Birth local time does not exist in this timezone (DST gap).');
  }

  if (candidates.length > 1 && !foldResolution) {
    throw new RangeError('Birth local time is ambiguous in this timezone; choose earlier or later occurrence.');
  }

  if (candidates.length === 1 && foldResolution) {
    throw new RangeError('DST fold resolution was supplied for an unambiguous local time.');
  }

  const selected = foldResolution === 'later'
    ? candidates[candidates.length - 1]
    : candidates[0];

  return {
    birthDateTimeUtc: new Date(selected.instant).toISOString(),
    timezoneOffset: formatOffset(selected.offset),
    ...(candidates.length > 1 ? { dstFoldResolution: foldResolution } : {}),
  };
}
