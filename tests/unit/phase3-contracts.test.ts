import { describe, expect, it } from 'vitest';
import { birthChartSchema, calculationInputSchema, calculationResultSchema, dashaPeriodSchema, reportRequestSchema } from '../../lib/validation/schemas';

describe('phase 3 domain contracts', () => {
  it('rejects unverified chart data rather than accepting malformed positions', () => {
    expect(birthChartSchema.safeParse({ id: 'c', birthProfileId: 'b', chartType: 'd1', metadata: { chartSystem: 'vedic' }, planets: [{ planet: 'sun', longitude: 360, position: { degrees: 0, minutes: 0 }, sign: 'x' }], houses: [], status: 'available' }).success).toBe(false);
  });
  it('validates report boundaries and supported presentation modes', () => {
    expect(reportRequestSchema.safeParse({ birthProfileId: 'b', type: 'summary', sections: ['overview'], presentationMode: 'simple' }).success).toBe(true);
    expect(reportRequestSchema.safeParse({ birthProfileId: 'b', type: 'summary', sections: [], presentationMode: 'invented' }).success).toBe(false);
  });
  it('requires ISO dates for dasha periods', () => {
    expect(dashaPeriodSchema.safeParse({ id: 'period', system: 'vimshottari', lord: 'moon', startsAt: 'not-a-date', endsAt: '2030-01-01T00:00:00Z', level: 1, status: 'pending' }).success).toBe(false);
  });
  it('validates calculation inputs and preserves version metadata at the result boundary', () => {
    const input = {
      birthProfileId: 'profile',
      name: 'Example',
      dateOfBirth: '1990-01-02',
      timeOfBirth: '12:30:00',
      timeAccuracy: 'exact',
      location: {
        country: 'India',
        city: 'Delhi',
        latitude: 28.6,
        longitude: 77.2,
        timezone: 'Asia/Kolkata',
      },
    };
    expect(calculationInputSchema.safeParse(input).success).toBe(true);
    expect(calculationInputSchema.safeParse({ ...input, dateOfBirth: '1990-02-30' }).success).toBe(false);
    expect(calculationInputSchema.safeParse({ ...input, unexpected: true }).success).toBe(false);
    expect(calculationResultSchema.safeParse({
      id: 'result',
      birthProfileId: 'profile',
      input,
      configuration: { chartSystem: 'vedic' },
      version: { engine: 'test', engineVersion: '0.0.0' },
      charts: [],
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
    }).success).toBe(true);
  });
});
