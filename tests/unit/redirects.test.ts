import { describe, expect, it } from 'vitest';

import { getSafeRelativeRedirect } from '../../lib/security/redirects';

describe('safe relative redirects', () => {
  it.each(['/dashboard', '/kundli', '/kundli/create', '/dashboard?x=1'])('allows %s', (value) => {
    expect(getSafeRelativeRedirect(value)).toBe(value);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '/%5C%5Cevil.example',
    '/%2F%2Fevil.example',
    '/%68%74%74%70%73%3A%2F%2Fevil.example',
    '/%0d%0aevil.example',
    '/ dashboard',
    '/%ZZ',
  ])('rejects unsafe destination %s', (value) => {
    expect(getSafeRelativeRedirect(value)).toBe('/dashboard');
  });
});
