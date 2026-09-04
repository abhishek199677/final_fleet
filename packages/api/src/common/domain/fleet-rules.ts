/**
 * Pure domain: maintenance due math (MNT-01/02), hold rules (CLI-06),
 * duplicate suspect (EXP-03), session validation (WRK-04).
 * DB-free for vitest; services call these before SQL.
 */

export interface MeterTask {
  trigger: 'meter' | 'calendar';
  interval_value: number;
  warning_value: number;
  last_done_value?: number | null;
  current_meter?: number | null;
  last_done_date?: string | null; // YYYY-MM-DD
  today?: string | null; // YYYY-MM-DD
  next_due_value?: number | null;
  next_due_date?: string | null;
}

export function nextMeterDue(lastDone: number, interval: number): number {
  return lastDone + interval;
}

/** Units (or days) remaining until due; negative = overdue. */
export function remainingToDue(nextDue: number, current: number): number {
  return nextDue - current;
}

export function dueState(remaining: number, warning: number): 'ok' | 'warning' | 'overdue' {
  if (remaining < 0) return 'overdue';
  if (remaining <= warning) return 'warning';
  return 'ok';
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const ms = new Date(`${toYmd}T00:00:00Z`).getTime() - new Date(`${fromYmd}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

// --- Payment hold (CLI-06, BRD rule 8) ---
export interface HoldInput {
  overdueDaysMax: number;
  outstandingMinor: bigint;
  creditLimitMinor?: bigint | null;
  advanceBalanceMinor?: bigint | null;
  requiredAdvanceMinor?: bigint | null;
  manualHold?: boolean;
}

export function shouldHold(h: HoldInput): { hold: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (h.manualHold) reasons.push('manual');
  if (h.overdueDaysMax > 30) reasons.push('overdue');
  if (h.creditLimitMinor != null && h.outstandingMinor > h.creditLimitMinor) reasons.push('credit_limit');
  if (
    h.requiredAdvanceMinor != null &&
    (h.advanceBalanceMinor ?? 0n) < h.requiredAdvanceMinor
  ) {
    reasons.push('advance');
  }
  return { hold: reasons.length > 0, reasons };
}

// --- Duplicate suspect (EXP-03) ---
export function isDuplicateSuspect(a: {
  dateYmd: string;
  categoryId: string;
  amountMinor: number;
  description: string;
}, b: {
  dateYmd: string;
  categoryId: string;
  amountMinor: number;
  description: string;
}): boolean {
  if (a.categoryId !== b.categoryId) return false;
  if (a.dateYmd.slice(0, 7) !== b.dateYmd.slice(0, 7)) return false;
  const diff = Math.abs(a.amountMinor - b.amountMinor) / Math.max(1, Math.abs(b.amountMinor));
  if (diff > 0.01) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = norm(a.description);
  const nb = norm(b.description);
  if (na.length < 8 || nb.length < 8) return false;
  return na.includes(nb) || nb.includes(na);
}

// --- Work session validation (WRK-04) ---
export function validateSession(s: {
  startAt: string;
  endAt: string;
  previousEndAt?: string | null;
}): { ok: boolean; code?: string; warning?: string } {
  const start = new Date(s.startAt).getTime();
  const end = new Date(s.endAt).getTime();
  if (!(end >= start)) return { ok: false, code: 'END_BEFORE_START' };
  if (end - start > 24 * 3600 * 1000) return { ok: false, code: 'SESSION_TOO_LONG' };
  if (s.previousEndAt && start < new Date(s.previousEndAt).getTime()) {
    return { ok: true, warning: 'CONTINUITY' };
  }
  return { ok: true };
}

export function sessionsOverlap(a: { startAt: string; endAt: string }, b: { startAt: string; endAt: string }): boolean {
  return new Date(a.startAt) < new Date(b.endAt) && new Date(b.startAt) < new Date(a.endAt);
}
