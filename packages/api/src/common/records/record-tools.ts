import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Shared write helpers for the two families of tenant records.
 *
 * Versioned records (append-only money/ops data) carry
 * `version` / `supersedes_id` / `is_current`. They are never edited in place:
 * a correction writes a NEW version and the DB's `fn_supersede` trigger retires
 * the old one; a void retires the current version so it drops out of every
 * `is_current = true` read. Nothing is destroyed, so `audit_log` keeps the full
 * history — this is what makes "delete" safe on financial data.
 *
 * Config records (reference data) are ordinary rows: plain UPDATE / DELETE.
 *
 * Identifiers are quoted from `information_schema` metadata only — a request
 * never contributes a column or table name. Every value is bound as a
 * parameter.
 */

/** Money/ops tables that are append-only by design (packages/db/tables.json). */
export const VERSIONED_TABLES = [
  'expenses',
  'work_sessions',
  'fuel_logs',
  'downtime_segments',
  'maintenance_visits',
  'cash_counts',
  'extra_charges',
  'client_money_events',
] as const;
export type VersionedTable = (typeof VERSIONED_TABLES)[number];

/** Reference data with no audit/versioning obligations — safe to edit and delete outright. */
export const CONFIG_TABLES = [
  'maintenance_tasks',
  'rate_cards',
  'cash_accounts',
  'expense_categories',
  'alert_rules',
] as const;
export type ConfigTable = (typeof CONFIG_TABLES)[number];

export function isVersionedTable(value: string): value is VersionedTable {
  return (VERSIONED_TABLES as readonly string[]).includes(value);
}

/** Free-text column that records why a versioned row was corrected or voided. */
const NOTE_COLUMN: Record<string, string> = {
  expenses: 'note',
  work_sessions: 'notes',
  fuel_logs: 'note',
  downtime_segments: 'note',
  maintenance_visits: 'notes',
  cash_counts: 'note',
  extra_charges: 'note',
  client_money_events: 'note',
};

/** Columns the versioning machinery owns; never taken from a request body. */
const VERSION_COLUMNS = ['id', 'tenant_id', 'created_at', 'created_by', 'version', 'supersedes_id', 'is_current'];

interface ColumnMeta {
  name: string;
  notNull: boolean;
}

const HUMAN: Record<string, string> = {
  expenses: 'Expense',
  work_sessions: 'Work session',
  fuel_logs: 'Fuel log',
  downtime_segments: 'Downtime segment',
  maintenance_visits: 'Maintenance visit',
  cash_counts: 'Cash count',
  extra_charges: 'Extra charge',
  client_money_events: 'Client money event',
  maintenance_tasks: 'Maintenance task',
  rate_cards: 'Rate card',
  cash_accounts: 'Cash account',
  expense_categories: 'Expense category',
  alert_rules: 'Alert rule',
};

function label(table: string): string {
  return HUMAN[table] ?? table;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A malformed id never reaches Postgres. Without this the driver throws
 * `22P02 invalid input syntax for type uuid` and the caller gets a bare 500
 * for what is plainly a bad request.
 */
function assertId(id: string, table: string): void {
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    throw new BadRequestException(`"${String(id)}" is not a valid ${label(table).toLowerCase()} id`);
  }
}

function quote(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

/**
 * Read the live column set for a tenant table. Deliberately uncached: the
 * schema can change under a running process (a migration), and these calls sit
 * on low-frequency admin paths anyway.
 */
async function columnsOf(db: DatabaseService, table: string): Promise<ColumnMeta[]> {
  const res = await db.getPool('owner').query(
    `SELECT column_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'tenant' AND table_name = $1`,
    [table],
  );
  if (res.rows.length === 0) throw new BadRequestException(`Unknown table "${table}"`);
  return res.rows.map((r) => ({ name: String(r.column_name), notNull: r.is_nullable === 'NO' }));
}

/**
 * Turn a Postgres constraint violation into an actionable HTTP error instead of
 * the bare 500 the user would otherwise see.
 *
 * Exported so hand-written INSERTs outside `record-tools` (alert rules, users)
 * get the same treatment — they run against tables whose values Postgres
 * constrains just as tightly.
 */
export function mapDbError(e: unknown, table: string): never {
  const err = e as { code?: string; constraint?: string };
  if (err?.code === '23503') {
    // FK violation. The constraint name is declared on the *referencing* table,
    // e.g. expenses_category_id_fkey lives on `expenses`.
    const ref = err.constraint ? err.constraint.replace(/_fkey$/, '').replace(/_[a-z0-9_]+$/, '') : '';
    const where = ref ? ` by ${ref.replace(/_/g, ' ')}` : '';
    throw new ConflictException(`This ${label(table).toLowerCase()} is still in use${where}. Remove or reassign those records first.`);
  }
  if (err?.code === '23505') {
    throw new ConflictException(`That value is already configured for this workspace.`);
  }
  if (err?.code === '23514') {
    // CHECK constraint — e.g. work_sessions.end_evidence must be photo|manual.
    // Postgres does not name the column, so point at the payload instead.
    throw new BadRequestException(`One of the values you sent is not allowed for a ${label(table).toLowerCase()}.`);
  }
  if (err?.code === '23502') {
    throw new BadRequestException(`A required field was left empty on ${label(table).toLowerCase()}.`);
  }
  throw e as Error;
}

/**
 * Edit a versioned record by writing a new version of it.
 *
 * Retires the current version first: `work_sessions` carries an exclusion
 * constraint on overlapping *current* sessions, so both versions being current
 * for a moment would make the insert fail.
 */
export async function correctRecord(
  db: DatabaseService,
  tenantId: string,
  table: VersionedTable,
  id: string,
  data: Record<string, unknown>,
  userId: string,
) {
  assertId(id, table);
  const cols = await columnsOf(db, table);
  const byName = new Map(cols.map((c) => [c.name, c]));

  const found = await db.queryWithTenant(
    tenantId,
    'owner',
    `SELECT * FROM tenant.${quote(table)} WHERE id = $1 AND is_current = true`,
    [id],
  );
  if (found.rows.length === 0) throw new NotFoundException(`${label(table)} not found`);
  const original = found.rows[0] as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...original };
  for (const [key, value] of Object.entries(data ?? {})) {
    if (key === 'client_uuid') continue; // regenerated below — it is a unique key
    const col = byName.get(key);
    if (!col) throw new BadRequestException(`Unknown field "${key}" for ${label(table).toLowerCase()}`);
    if (value === null && col.notNull) throw new BadRequestException(`Field "${key}" cannot be empty`);
    merged[key] = value;
  }

  // `id`/`created_at` must be minted fresh for the new version; `tenant_id`,
  // `version` and `supersedes_id` are re-declared explicitly below. Dropping
  // `tenant_id` without restoring it would insert NULL, which the tenant
  // isolation policy rejects (42501) before Postgres reports the NOT NULL
  // violation — a bare 500 for a straightforward edit.
  for (const system of VERSION_COLUMNS) delete merged[system];
  merged.tenant_id = tenantId;
  merged.created_by = userId;
  merged.client_uuid = randomUUID();
  merged.version = Number(original.version ?? 1) + 1;
  merged.supersedes_id = id;
  merged.is_current = true;

  await db.queryWithTenant(
    tenantId,
    'owner',
    `UPDATE tenant.${quote(table)} SET is_current = false WHERE id = $1 AND is_current = true`,
    [id],
  );

  const names = Object.keys(merged);
  const values = names.map((n) => merged[n]);
  let inserted;
  try {
    inserted = await db.queryWithTenant(
      tenantId,
      'owner',
      `INSERT INTO tenant.${quote(table)} (${names.map(quote).join(', ')})
       VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      values,
    );
  } catch (e) {
    mapDbError(e, table);
  }
  return inserted.rows[0];
}

/**
 * Void a versioned record: retire it from live data and stamp the reason on it.
 *
 * `is_current = false` is exactly what every list, rollup and billing query
 * already filters on, so the record disappears from the product immediately
 * while every version and its audit rows stay queryable.
 */
export async function voidRecord(
  db: DatabaseService,
  tenantId: string,
  table: VersionedTable,
  id: string,
  reason: string,
) {
  assertId(id, table);
  const cols = await columnsOf(db, table);
  const noteCol = NOTE_COLUMN[table];
  if (!noteCol || !cols.some((c) => c.name === noteCol)) {
    throw new BadRequestException(`Voiding a ${label(table).toLowerCase()} is not supported`);
  }

  const trimmed = String(reason ?? '').trim();
  if (!trimmed) throw new BadRequestException('A reason is required to void a record');
  if (trimmed.length > 500) throw new BadRequestException('Void reason must be 500 characters or fewer');

  const stamped = `VOID: ${trimmed}`;
  let res;
  try {
    res = await db.queryWithTenant(
      tenantId,
      'owner',
      `UPDATE tenant.${quote(table)}
          SET is_current = false,
              ${quote(noteCol)} = CASE WHEN ${quote(noteCol)} IS NULL THEN $2
                                       ELSE ${quote(noteCol)} || ' | ' || $2 END
        WHERE id = $1 AND is_current = true
        RETURNING *`,
      [id, stamped],
    );
  } catch (e) {
    mapDbError(e, table);
  }
  if (res.rows.length === 0) throw new NotFoundException(`${label(table)} not found`);
  return res.rows[0];
}

/** Edit a config record in place. */
export async function patchRecord(
  db: DatabaseService,
  tenantId: string,
  table: ConfigTable,
  id: string,
  data: Record<string, unknown>,
) {
  assertId(id, table);
  const cols = await columnsOf(db, table);
  const byName = new Map(cols.map((c) => [c.name, c]));

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(data ?? {})) {
    const col = byName.get(key);
    if (!col) throw new BadRequestException(`Unknown field "${key}" for ${label(table).toLowerCase()}`);
    if (key === 'id' || key === 'tenant_id' || key === 'created_at') {
      throw new BadRequestException(`"${key}" cannot be changed`);
    }
    if (value === null && col.notNull) throw new BadRequestException(`Field "${key}" cannot be empty`);
    values.push(value);
    sets.push(`${quote(key)} = $${values.length}`);
  }
  if (sets.length === 0) throw new BadRequestException('No fields to update');

  values.push(id);
  let updated;
  try {
    updated = await db.queryWithTenant(
      tenantId,
      'owner',
      `UPDATE tenant.${quote(table)} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
  } catch (e) {
    mapDbError(e, table);
  }
  if (updated.rows.length === 0) throw new NotFoundException(`${label(table)} not found`);
  return updated.rows[0];
}

/** Delete a config record, refusing with 409 when other rows still reference it. */
export async function deleteRecord(
  db: DatabaseService,
  tenantId: string,
  table: ConfigTable,
  id: string,
) {
  assertId(id, table);
  let deleted;
  try {
    deleted = await db.queryWithTenant(
      tenantId,
      'owner',
      `DELETE FROM tenant.${quote(table)} WHERE id = $1 RETURNING id`,
      [id],
    );
  } catch (e) {
    mapDbError(e, table);
  }
  if (deleted.rows.length === 0) throw new NotFoundException(`${label(table)} not found`);
  return { deleted: true, id };
}
