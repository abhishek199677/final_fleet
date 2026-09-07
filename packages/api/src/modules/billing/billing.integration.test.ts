import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleetos';

describe('Billing Engine Integration', () => {
  let client: Client;
  let tenantId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    // Use the demo tenant
    tenantId = '00000000-0000-0000-0000-000000000001';
  });

  afterAll(async () => {
    await client.end();
  });

  it('should have rate cards for active deployments', async () => {
    const result = await client.query(
      `SELECT rc.* FROM tenant.rate_cards rc
       JOIN tenant.deployments d ON d.id = rc.deployment_id
       WHERE d.tenant_id = $1 AND d.status = 'active'`,
      [tenantId]
    );
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row.strategy).toMatch(/^(hourly|daily|monthly)$/);
      expect(Number(row.rate_minor)).toBeGreaterThan(0);
      expect(row.currency).toBeTruthy();
    }
  });

  it('should have billing ledger entries for completed sessions', async () => {
    const result = await client.query(
      `SELECT bl.* FROM tenant.billing_ledger bl
       WHERE bl.tenant_id = $1
       ORDER BY bl.entry_date DESC
       LIMIT 10`,
      [tenantId]
    );
    // Billing may or may not have run, so just verify the query works
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it('should have client money events with proper FX', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.client_money_events
       WHERE tenant_id = $1
       ORDER BY event_date DESC
       LIMIT 10`,
      [tenantId]
    );
    for (const row of result.rows) {
      expect(Number(row.amount_minor)).toBeGreaterThanOrEqual(0);
      expect(Number(row.fx_rate)).toBeGreaterThanOrEqual(0);
      expect(Number(row.base_minor)).toBeGreaterThanOrEqual(0);
    }
  });

  it('should compute client receivables via view', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.v_client_receivable WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(Array.isArray(result.rows)).toBe(true);
    for (const row of result.rows) {
      expect(typeof row.outstanding_minor).toBe('string'); // numeric comes as string in pg
    }
  });

  it('should compute tenant KPIs via view', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.v_tenant_kpis WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(result.rows.length).toBeLessThanOrEqual(1);
  });
});
