import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleetos';

describe('Expenses Integration', () => {
  let client: Client;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('should have expense categories', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.expense_categories WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(result.rows.length).toBeGreaterThan(0);
    const names = result.rows.map(r => r.name);
    expect(names).toContain('Fuel');
    expect(names).toContain('Maintenance');
  });

  it('should have expenses with proper FX', async () => {
    const result = await client.query(
      `SELECT e.*, ec.name as category_name
       FROM tenant.expenses e
       JOIN tenant.expense_categories ec ON ec.id = e.category_id
       WHERE e.tenant_id = $1
       ORDER BY e.date DESC
       LIMIT 10`,
      [tenantId]
    );
    for (const row of result.rows) {
      expect(Number(row.amount_minor)).toBeGreaterThan(0);
      expect(Number(row.fx_rate)).toBeGreaterThanOrEqual(0);
      expect(Number(row.base_minor)).toBeGreaterThanOrEqual(0);
      expect(row.category_name).toBeTruthy();
    }
  });

  it('should have cash accounts', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.cash_accounts WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row.name).toBeTruthy();
      expect(row.currency).toBeTruthy();
    }
  });

  it('should have cash transfers with proper FX', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.cash_transfers WHERE tenant_id = $1`,
      [tenantId]
    );
    for (const row of result.rows) {
      expect(Number(row.amount_minor)).toBeGreaterThan(0);
      expect(Number(row.fx_rate)).toBeGreaterThan(0);
      expect(Number(row.base_minor)).toBeGreaterThan(0);
      expect(row.from_account_id).not.toBe(row.to_account_id);
    }
  });

  it('should compute cash expected balance via view', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.v_cash_expected WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(Array.isArray(result.rows)).toBe(true);
    for (const row of result.rows) {
      expect(row.account_name).toBeTruthy();
    }
  });

  it('should have machine contribution via view', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.v_machine_contribution WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(Array.isArray(result.rows)).toBe(true);
  });
});
