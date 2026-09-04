import { API_ERROR_CODES } from '../filters/error-codes';
import { DatabaseService } from '../database/database.service';
import { ProblemError } from '../filters/problem-error';

export type EvidenceKind = 'meter' | 'diesel' | 'expense' | 'slip';

interface PolicyRule {
  mode: 'required' | 'optional' | 'off';
  threshold_minor?: number;
}

function ruleFor(policy: Record<string, unknown>, kind: EvidenceKind): PolicyRule {
  const defaults: Record<EvidenceKind, string> = {
    meter: 'meter_readings',
    diesel: 'diesel_receipts',
    expense: 'expense_receipts',
    slip: 'receipt_slips',
  };
  const raw = policy[defaults[kind]];
  if (typeof raw === 'string' && ['required', 'optional', 'off'].includes(raw)) {
    return { mode: raw as PolicyRule['mode'] };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    return {
      mode: r.mode === 'required' || r.mode === 'off' ? r.mode : 'optional',
      threshold_minor: typeof r.threshold_minor === 'number' ? r.threshold_minor : undefined,
    };
  }
  return { mode: 'optional' };
}

/**
 * Evidence policy enforcement (TEN-07). Throws EVIDENCE_REQUIRED when the
 * tenant policy demands a photo and none is attached (or the receipt
 * threshold is exceeded without one). Defaults to optional per type.
 */
export async function assertEvidence(
  db: DatabaseService,
  tenantId: string,
  kind: EvidenceKind,
  opts: { hasPhoto: boolean; amountMinor?: number },
): Promise<void> {
  let policy: Record<string, unknown> = {};
  try {
    const res = await db.queryWithTenant(tenantId, 'ops',
      `SELECT evidence_policy FROM platform.tenant_settings WHERE tenant_id = $1`, [tenantId]);
    const raw = res.rows[0]?.evidence_policy;
    policy = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
  } catch {
    return; // fail-open when settings are unreadable; writes stay audited
  }
  const rule = ruleFor(policy, kind);
  if (rule.mode === 'off' || rule.mode === 'optional' || opts.hasPhoto) return;
  if (rule.threshold_minor !== undefined && (opts.amountMinor ?? 0) < rule.threshold_minor) return;
  const hint: Record<EvidenceKind, string> = {
    meter: 'Attach a meter photo for this reading',
    diesel: 'Attach the fuel receipt',
    expense: 'Attach the expense receipt',
    slip: 'Attach the receipt slip',
  };
  throw new ProblemError(API_ERROR_CODES.EVIDENCE_REQUIRED, hint[kind], 422);
}
