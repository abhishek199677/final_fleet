import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../common/database/database.service';
import { ChatService } from './chat.service';

// Keep the tests offline: without a key the service never calls OpenAI and
// answers from the stubbed database (which is exactly what we want to assert).
process.env.OPENAI_API_KEY = '';

type Row = Record<string, unknown>;

/**
 * The bot used to report "0 machines" for a tenant that owns EXC-01, because
 * one denied query (`platform.tenants` is not granted to app_owner) made
 * Promise.all reject and threw away the machine count that had already been
 * fetched. These tests pin the fixed behaviour: a failing query may only ever
 * make a number *unknown*, never zero.
 */
function makeService(options: {
  machines?: Row[];
  machineCountFails?: boolean;
  tenantNameFails?: boolean;
  operatorCount?: number;
}): ChatService {
  const machineRows = options.machines ?? [
    { code: 'EXC-01', type: 'excavator', make: 'JCB', model: '3CX', status: 'active' },
  ];

  const db = {
    queryWithTenant: vi.fn(
      (_tenantId: string, _role: string, sql: string): Promise<{ rows: Row[] }> => {
        if (sql.includes('FROM tenant.machines') && sql.includes('COUNT')) {
          if (options.machineCountFails) {
            return Promise.reject(new Error('permission denied for table machines'));
          }
          return Promise.resolve({ rows: [{ count: machineRows.length }] });
        }
        if (sql.includes('FROM tenant.machines')) return Promise.resolve({ rows: machineRows });
        if (sql.includes('FROM tenant.operators')) {
          return Promise.resolve({ rows: [{ count: options.operatorCount ?? 0 }] });
        }
        return Promise.resolve({ rows: [{ count: 0 }] });
      },
    ),
    query: vi.fn((): Promise<{ rows: Row[] }> => {
      if (options.tenantNameFails) {
        return Promise.reject(new Error('permission denied for table tenants'));
      }
      return Promise.resolve({ rows: [{ name: 'Demo Fleet Co' }] });
    }),
  } as unknown as DatabaseService;

  return new ChatService(db);
}

describe('ChatService — factual answers', () => {
  it('answers "how many machines" from the database, naming the machine', async () => {
    const service = makeService({});
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'currently how many machines are registered',
    );

    expect(response).toContain('1 machine');
    expect(response).toContain('EXC-01');
    expect(response).toContain('JCB 3CX');
    expect(response).not.toContain('0 machines');
  });

  it('still reports the real count when the tenant-name query fails', async () => {
    const service = makeService({ tenantNameFails: true });
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'how many machines do we have',
    );

    expect(response).toContain('1 machine');
    expect(response).not.toContain('0 machines');
  });

  it('says "unknown" instead of zero when the machine count itself fails', async () => {
    const service = makeService({ machineCountFails: true });
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'how many machines are registered',
    );

    expect(response).not.toMatch(/\b0 machine/);
    expect(response.toLowerCase()).toContain("couldn't read");
  });

  it('reports a genuinely empty fleet as zero machines', async () => {
    const service = makeService({ machines: [] });
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'how many machines are registered',
    );

    expect(response).toContain('no machines registered');
  });

  it('lists the machines on a list request', async () => {
    const service = makeService({});
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'list all machines',
    );

    expect(response).toContain('EXC-01');
    expect(response).toContain('excavator');
  });

  it('answers other countable entities too', async () => {
    const service = makeService({ operatorCount: 3 });
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'how many operators do we have',
    );

    expect(response).toContain('3 operators');
  });

  it('refuses questions that need filtering instead of guessing a total', async () => {
    const service = makeService({});
    const { response } = await service.generateResponse(
      '298b1053-596c-4a52-ae9c-7b5315051eae',
      'how many machines are at the north site',
    );

    // Falls through to the fallback, which still describes the real fleet.
    expect(response).not.toContain('0 machines');
    expect(response).toContain('EXC-01');
  });
});
