const timezoneAliases: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'IST': 'Asia/Kolkata',
};

export function normalizeTimeZone(value: string | null | undefined): string {
  if (!value) {
    return 'UTC';
  }

  const normalized = value.trim();
  return timezoneAliases[normalized] ?? normalized;
}

export function isValidTimeZone(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = normalizeTimeZone(value);

  try {
    Intl.DateTimeFormat('en-US', { timeZone: normalized });
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
