import { describe, expect, it } from 'vitest';
import { birthChartSchema, dashaPeriodSchema, reportRequestSchema } from '../../lib/validation/schemas';

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
});
