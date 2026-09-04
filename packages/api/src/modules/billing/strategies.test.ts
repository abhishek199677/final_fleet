import { describe, expect, it } from 'vitest';
import {
  computeDailyDay,
  computeHourlyDay,
  computeMonthlyProration,
  diffToAdjustment,
} from './strategies.js';

// Golden tests per skill write-billing-strategy (BIL-01/02/03, TSD §5).

describe('billing strategies', () => {
  it('hourly: units × rate, no top-up when above minimum', () => {
    const out = computeHourlyDay('2026-08-04', 8, 2, { strategy: 'hourly', rate_minor: 1000, min_units_per_day: 6 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'work', units: 8, amount_minor: 8000 });
  });

  it('hourly: minimum_topup is its own entry, never folded into units', () => {
    const out = computeHourlyDay('2026-08-05', 4, 1, { strategy: 'hourly', rate_minor: 1000, min_units_per_day: 8 });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ kind: 'work', units: 8, amount_minor: 8000 });
    expect(out[1]).toMatchObject({ kind: 'minimum_topup', units: 4, amount_minor: 4000 });
  });

  it('daily: one work entry per billable day; standby when idle and configured', () => {
    expect(
      computeDailyDay('2026-08-04', 2, { strategy: 'daily', rate_minor: 50000 }),
    ).toMatchObject([{ kind: 'work', amount_minor: 50000 }]);
    expect(
      computeDailyDay('2026-08-05', 0, { strategy: 'daily', rate_minor: 50000, standby_rate_minor: 10000 }),
    ).toMatchObject([{ kind: 'standby', amount_minor: 10000 }]);
    expect(computeDailyDay('2026-08-06', 0, { strategy: 'daily', rate_minor: 50000 })).toHaveLength(0);
  });

  it('monthly: prorates by days deployed', () => {
    // 15/31 of 310000 = 150000
    const e = computeMonthlyProration('2026-08-31', 15, 31, { strategy: 'monthly', rate_minor: 310000 });
    expect(e).toMatchObject({ kind: 'monthly_hire', units: 15, amount_minor: 150000 });
  });

  it('standby hourly day posts standby only', () => {
    const out = computeHourlyDay('2026-08-06', 0, 0, {
      strategy: 'hourly', rate_minor: 1000, standby_rate_minor: 2000,
    });
    expect(out).toMatchObject([{ kind: 'standby', amount_minor: 2000 }]);
  });

  it('adjustment diff nets corrected sessions without mutating originals', () => {
    expect(diffToAdjustment(8000, 8000)).toBe(0);
    expect(diffToAdjustment(10000, 8000)).toBe(2000);
    expect(diffToAdjustment(6000, 8000)).toBe(-2000);
  });
});
