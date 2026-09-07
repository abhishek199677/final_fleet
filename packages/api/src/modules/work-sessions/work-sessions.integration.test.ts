import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleetos';

describe('Work Sessions Integration', () => {
  let client: Client;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('should have work sessions with valid time ranges', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.work_sessions WHERE tenant_id = $1 AND is_current = true`,
      [tenantId]
    );
    for (const row of result.rows) {
      if (row.end_at) {
        expect(new Date(row.end_at).getTime()).toBeGreaterThanOrEqual(new Date(row.start_at).getTime());
      }
      expect(Number(row.start_meter)).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have no overlapping sessions per machine', async () => {
    const result = await client.query(
      `SELECT machine_id, start_at, end_at, id
       FROM tenant.work_sessions
       WHERE tenant_id = $1 AND is_current = true AND end_at IS NOT NULL
       ORDER BY machine_id, start_at`,
      [tenantId]
    );

    // Check for overlaps per machine
    const byMachine = new Map<string, typeof result.rows>();
    for (const row of result.rows) {
      const key = row.machine_id;
      if (!byMachine.has(key)) byMachine.set(key, []);
      byMachine.get(key)!.push(row);
    }

    for (const [, sessions] of byMachine) {
      for (let i = 1; i < sessions.length; i++) {
        const prev = sessions[i - 1];
        const curr = sessions[i];
        // Current start should be >= previous end
        expect(new Date(curr.start_at).getTime()).toBeGreaterThanOrEqual(
          new Date(prev.end_at).getTime()
        );
      }
    }
  });

  it('should track fuel logs linked to machines', async () => {
    const result = await client.query(
      `SELECT fl.*, m.code as machine_code
       FROM tenant.fuel_logs fl
       JOIN tenant.machines m ON m.id = fl.machine_id
       WHERE fl.tenant_id = $1
       ORDER BY fl.created_at DESC
       LIMIT 10`,
      [tenantId]
    );
    for (const row of result.rows) {
      expect(Number(row.litres)).toBeGreaterThan(0);
      expect(Number(row.cost_minor)).toBeGreaterThan(0);
      expect(row.machine_code).toBeTruthy();
    }
  });

  it('should track downtime segments with valid reasons', async () => {
    const result = await client.query(
      `SELECT * FROM tenant.downtime_segments WHERE tenant_id = $1`,
      [tenantId]
    );
    const validReasons = ['no_diesel', 'breakdown', 'transport', 'police_permit', 'no_work_client', 'weather', 'operator_absent', 'other'];
    for (const row of result.rows) {
      expect(validReasons).toContain(row.reason_code);
      if (row.ended_at) {
        expect(new Date(row.ended_at).getTime()).toBeGreaterThanOrEqual(new Date(row.started_at).getTime());
      }
    }
  });
});
