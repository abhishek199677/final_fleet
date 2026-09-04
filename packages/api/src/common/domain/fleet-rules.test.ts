import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  dueState,
  isDuplicateSuspect,
  nextMeterDue,
  remainingToDue,
  sessionsOverlap,
  shouldHold,
  validateSession,
} from './fleet-rules.js';

// MNT-01/02, CLI-06, EXP-03, WRK-04 (TSD §5/6, BRD rules 1/8).
describe('fleet domain rules', () => {
  it('maintenance: next due = last + interval; warning/overdue states (MNT-01/02)', () => {
    expect(nextMeterDue(1000, 250)).toBe(1250);
    expect(remainingToDue(1250, 1235)).toBe(15);
    expect(dueState(15, 20)).toBe('warning');
    expect(dueState(100, 20)).toBe('ok');
    expect(dueState(-5, 20)).toBe('overdue');
  });

  it('calendar days math', () => {
    expect(daysBetween('2026-08-01', '2026-08-31')).toBe(30);
  });

  it('hold triggers per CLI-06, released by Owner only (service layer)', () => {
    expect(shouldHold({ overdueDaysMax: 0, outstandingMinor: 0n }).hold).toBe(false);
    expect(shouldHold({ overdueDaysMax: 45, outstandingMinor: 0n }).reasons).toContain('overdue');
    expect(
      shouldHold({ overdueDaysMax: 0, outstandingMinor: 200000n, creditLimitMinor: 100000n }).reasons,
    ).toContain('credit_limit');
    expect(
      shouldHold({ overdueDaysMax: 0, outstandingMinor: 0n, advanceBalanceMinor: 1000n, requiredAdvanceMinor: 5000n }).reasons,
    ).toContain('advance');
    expect(shouldHold({ overdueDaysMax: 0, outstandingMinor: 0n, manualHold: true }).reasons).toContain('manual');
  });

  it('duplicate suspect: same month/category/±1%/similar desc (EXP-03)', () => {
    const base = { dateYmd: '2026-08-04', categoryId: 'c1', amountMinor: 10000, description: 'Diesel purchase at Total station' };
    expect(isDuplicateSuspect(base, { ...base, dateYmd: '2026-08-20', amountMinor: 10050 })).toBe(true);
    expect(isDuplicateSuspect(base, { ...base, dateYmd: '2026-09-01' })).toBe(false);
    expect(isDuplicateSuspect(base, { ...base, amountMinor: 12000 })).toBe(false);
    expect(isDuplicateSuspect(base, { ...base, description: 'Office rent payment' })).toBe(false);
  });

  it('session validation: end≥start, ≤24h, continuity warn, overlap rejected (WRK-04)', () => {
    expect(validateSession({ startAt: '2026-08-04T08:00:00Z', endAt: '2026-08-04T07:00:00Z' }).code).toBe('END_BEFORE_START');
    expect(validateSession({ startAt: '2026-08-04T00:00:00Z', endAt: '2026-08-05T01:00:00Z' }).code).toBe('SESSION_TOO_LONG');
    expect(
      validateSession({ startAt: '2026-08-04T08:00:00Z', endAt: '2026-08-04T10:00:00Z', previousEndAt: '2026-08-04T09:00:00Z' }).warning,
    ).toBe('CONTINUITY');
    expect(
      sessionsOverlap(
        { startAt: '2026-08-04T08:00:00Z', endAt: '2026-08-04T10:00:00Z' },
        { startAt: '2026-08-04T09:00:00Z', endAt: '2026-08-04T11:00:00Z' },
      ),
    ).toBe(true);
    expect(
      sessionsOverlap(
        { startAt: '2026-08-04T08:00:00Z', endAt: '2026-08-04T09:00:00Z' },
        { startAt: '2026-08-04T09:00:00Z', endAt: '2026-08-04T10:00:00Z' },
      ),
    ).toBe(false);
  });
});
