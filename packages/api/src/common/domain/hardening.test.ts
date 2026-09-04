import { describe, expect, it } from 'vitest';
import { entitlementExceeded, isPeriodClosed, otpValid, supportGrantValid } from './hardening.js';

describe('hardening rules (BIL-07, SEC-08, ADM-06, TEN-02)', () => {
  it('period close blocks back-dated writes', () => {
    expect(isPeriodClosed(['2026-08'], '2026-08-15')).toBe(true);
    expect(isPeriodClosed(['2026-08'], '2026-09-01')).toBe(false);
  });

  it('otp rejects mismatch or expiry', () => {
    const base = { expectedHash: 'abc', provided: 'abc', expiresAt: '2026-09-04T01:00:00Z' };
    expect(otpValid({ ...base, now: '2026-09-04T00:00:00Z' })).toBe(true);
    expect(otpValid({ ...base, provided: 'wrong', now: '2026-09-04T00:00:00Z' })).toBe(false);
    expect(otpValid({ ...base, now: '2026-09-04T02:00:00Z' })).toBe(false);
  });

  it('entitlements enforce hard limits', () => {
    expect(entitlementExceeded(50, 50)).toBe(true);
    expect(entitlementExceeded(49, 50)).toBe(false);
    expect(entitlementExceeded(999, null)).toBe(false);
  });

  it('support access needs approval + ticket + reason + expiry', () => {
    const ok = { approved: true, ticketId: 't1', reason: 'debug', expiresAt: '2026-09-05T00:00:00Z', now: '2026-09-04T00:00:00Z' };
    expect(supportGrantValid(ok)).toBe(true);
    expect(supportGrantValid({ ...ok, approved: false })).toBe(false);
    expect(supportGrantValid({ ...ok, ticketId: null })).toBe(false);
    expect(supportGrantValid({ ...ok, now: '2026-09-06T00:00:00Z' })).toBe(false);
    expect(supportGrantValid({ ...ok, revokedAt: '2026-09-04T12:00:00Z' })).toBe(false);
  });
});
