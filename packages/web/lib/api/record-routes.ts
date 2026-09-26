/**
 * Append-only (versioned) tenant tables and the API route prefix that owns
 * them — one mapping shared by the audit page's Void action and the generic
 * edit/void control used on list pages.
 *
 * A table missing from this map is not versioned: config rows are edited and
 * deleted outright instead of corrected, so they must not offer a void.
 */
export const RECORD_ROUTES: Record<string, string> = {
  expenses: 'expenses',
  work_sessions: 'work-sessions',
  fuel_logs: 'fuel-downtime/fuel-logs',
  downtime_segments: 'fuel-downtime/downtime',
  maintenance_visits: 'maintenance/visits',
  cash_counts: 'cash/counts',
  extra_charges: 'billing/extra-charges',
  client_money_events: 'client-money/events',
};

/** Human labels for the same tables, used in dialog headings. */
export const RECORD_LABELS: Record<string, string> = {
  expenses: 'expense',
  work_sessions: 'work session',
  fuel_logs: 'fuel log',
  downtime_segments: 'downtime segment',
  maintenance_visits: 'maintenance visit',
  cash_counts: 'cash count',
  extra_charges: 'extra charge',
  client_money_events: 'client money event',
};

export function isVoidable(table: string): boolean {
  return Boolean(RECORD_ROUTES[table]);
}
