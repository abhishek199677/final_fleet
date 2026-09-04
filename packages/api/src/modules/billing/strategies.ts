/**
 * Pure billing strategies (TSD §5, BIL-01/02, skill write-billing-strategy).
 * DB-free so golden tests run in vitest without Postgres.
 * BillingEngine (billing-engine-logic.ts) delegates day-shape to these;
 * amounts stay integer minor units, Math.round only at entry boundary.
 */

export type LedgerKind =
  | 'work'
  | 'minimum_topup'
  | 'standby'
  | 'monthly_hire'
  | 'extra_charge'
  | 'adjustment';

export interface DayEntry {
  entry_date: string;
  kind: LedgerKind;
  units: number;
  amount_minor: number;
}

export interface RateCardInput {
  strategy: 'hourly' | 'daily' | 'monthly';
  rate_minor: number;
  min_units_per_day?: number;
  standby_rate_minor?: number | null;
}

/** Hourly: units × rate; shortfall below min becomes its own minimum_topup entry. */
export function computeHourlyDay(
  day: string,
  units: number,
  billableSessions: number,
  rc: RateCardInput,
): DayEntry[] {
  if (billableSessions === 0 && units === 0) {
    if (rc.standby_rate_minor) {
      return [{ entry_date: day, kind: 'standby', units: 1, amount_minor: Math.round(rc.standby_rate_minor) }];
    }
    return [];
  }
  const min = rc.min_units_per_day ?? 0;
  const billable = Math.max(units, min);
  const out: DayEntry[] = [
    { entry_date: day, kind: 'work', units: billable, amount_minor: Math.round(billable * rc.rate_minor) },
  ];
  if (units < min) {
    out.push({
      entry_date: day,
      kind: 'minimum_topup',
      units: min - units,
      amount_minor: Math.round((min - units) * rc.rate_minor),
    });
  }
  return out;
}

/** Daily fixed: one work entry per day with ≥1 billable session, else standby. */
export function computeDailyDay(
  day: string,
  billableSessions: number,
  rc: RateCardInput,
): DayEntry[] {
  if (billableSessions > 0) {
    return [{ entry_date: day, kind: 'work', units: 1, amount_minor: Math.round(rc.rate_minor) }];
  }
  if (rc.standby_rate_minor) {
    return [{ entry_date: day, kind: 'standby', units: 1, amount_minor: Math.round(rc.standby_rate_minor) }];
  }
  return [];
}

/** Monthly hire prorated by days deployed in the month. */
export function computeMonthlyProration(
  entryDate: string,
  overlapDays: number,
  daysInMonth: number,
  rc: RateCardInput,
): DayEntry {
  return {
    entry_date: entryDate,
    kind: 'monthly_hire',
    units: overlapDays,
    amount_minor: Math.round((overlapDays / daysInMonth) * rc.rate_minor),
  };
}

/**
 * Adjustment diff (append-only, BIL-03): recompute never mutates.
 * Returns delta to post as a single `adjustment` entry, or 0 when no-op.
 */
export function diffToAdjustment(computedWorkTotal: number, postedWorkTotal: number): number {
  return Math.round(computedWorkTotal - postedWorkTotal);
}
