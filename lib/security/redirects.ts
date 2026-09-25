const SAFE_FALLBACK_PATH = '/dashboard';

function containsUnsafeCharacters(value: string): boolean {
  return /[\u0000-\u0020\u007f\\]/.test(value);
}

function looksLikeExternalPath(value: string): boolean {
  return /^\/(?:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(value);
}

function decodePath(value: string): string | null {
  let decoded = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        return decoded;
      }
      decoded = next;
    } catch {
      return null;
    }
  }

  return decoded;
}

export function getSafeRelativeRedirect(value: string | null | undefined, fallback = SAFE_FALLBACK_PATH): string {
  if (!value || value[0] !== '/' || value[1] === '/' || containsUnsafeCharacters(value)) {
    return fallback;
  }

  const decoded = decodePath(value);
  if (!decoded || decoded[0] !== '/' || decoded[1] === '/' || containsUnsafeCharacters(decoded) || looksLikeExternalPath(decoded)) {
    return fallback;
  }

  try {
    const parsed = new URL(decoded, 'https://kundli-web.invalid');
    if (parsed.origin !== 'https://kundli-web.invalid' || !parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//') || looksLikeExternalPath(parsed.pathname)) {
      return fallback;
    }

    return value;
  } catch {
    return fallback;
  }
}
