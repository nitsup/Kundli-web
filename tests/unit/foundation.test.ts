import { describe, expect, it } from 'vitest';

import { birthProfileSchema, profileSchema } from '../../lib/validation/schemas';
import { normalizeTimeZone } from '../../lib/timezone';

describe('foundation contracts', () => {
  it('accepts a valid user profile and birth profile', () => {
    const profileResult = profileSchema.safeParse({
      id: 'user_123',
      display_name: 'Aditi',
      role: 'user',
      language: 'en',
      timezone: 'Asia/Kolkata',
    });

    const birthProfileResult = birthProfileSchema.safeParse({
      id: 'birth_123',
      owner_id: 'user_123',
      name: 'Aditi Birth Profile',
      date_of_birth: '1995-06-15',
      time_of_birth: '18:30',
      birth_time_accuracy: 'exact',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
    });

    expect(profileResult.success).toBe(true);
    expect(birthProfileResult.success).toBe(true);
  });

  it('normalizes a known timezone value', () => {
    expect(normalizeTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
    expect(normalizeTimeZone('Asia/Calcutta')).toBe('Asia/Kolkata');
  });

  it('rejects invalid birth data', () => {
    const result = birthProfileSchema.safeParse({
      id: 'birth_456',
      owner_id: 'user_123',
      name: 'Invalid Birth Profile',
      date_of_birth: 'not-a-date',
      time_of_birth: '25:99',
      birth_time_accuracy: 'unknown',
      latitude: 91,
      longitude: 181,
      timezone: 'not-a-zone',
    });

    expect(result.success).toBe(false);
  });

  it('requires one valid birth-profile owner', () => {
    const withoutOwner = birthProfileSchema.safeParse({
      id: 'birth_789',
      name: 'Unowned Birth Profile',
      date_of_birth: '1995-06-15',
      time_of_birth: '18:30',
      birth_time_accuracy: 'exact',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
    });
    const invalidTime = birthProfileSchema.safeParse({
      id: 'birth_790',
      owner_id: 'user_123',
      name: 'Invalid Time',
      date_of_birth: '1995-06-15',
      time_of_birth: '25:00',
      birth_time_accuracy: 'exact',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
    });

    expect(withoutOwner.success).toBe(false);
    expect(invalidTime.success).toBe(false);
  });
});
