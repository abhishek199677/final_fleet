/**
 * Commercial hardening pure rules (BRD §3, BIL-07, SEC-08, ADM-06, ALT-04, TEN-02).
 * DB-free; services persist decisions via approval_requests / period_closes /
 * support_access_grants (migration 0011).
 */

/** Period `YYYY-MM` closed when a close row exists for it. */
export function isPeriodClosed(closedPeriods: string[], entryYmd: string): boolean {
  return closedPeriods.includes(entryYmd.slice(0, 7));
}

/** OTP valid when hashes match and now is before expiry. */
export function otpValid(args: { expectedHash: string; provided: string; expiresAt: string; now?: string }): boolean {
  const now = args.now ?? new Date().toISOString();
  if (now > args.expiresAt) return false;
  return args.expectedHash === args.provided;
}

/** Hard entitlement enforcement (warning at pilot → hard limit at hardening). */
export function entitlementExceeded(used: number, limit: number | null | undefined): boolean {
  if (limit == null) return false;
  return used >= limit;
}

/** Support grant usable: ticket + reason, unexpired, unrevoked, owner-approved. */
export function supportGrantValid(g: {
  ticketId?: string | null;
  reason?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  approved: boolean;
  now?: string;
}): boolean {
  if (!g.approved || !g.ticketId || !g.reason) return false;
  if (g.revokedAt) return false;
  return (g.now ?? new Date().toISOString()) < g.expiresAt;
}
