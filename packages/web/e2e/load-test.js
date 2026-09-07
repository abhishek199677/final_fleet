/**
 * Fleet OS — k6 load test script (S52, TSD §11)
 *
 * Tests 200 concurrent connections against the API:
 *   - 50 VUs: owner reads (machines, clients, sites)
 *   - 50 VUs: ops writes (work sessions)
 *   - 20 VUs: photo presign requests
 *   - 80 VUs: mixed owner/ops reads
 *
 * Prerequisites:
 *   1. API running at BASE_URL (default: http://localhost:3001)
 *   2. Valid JWT token: k6 run --env TOKEN=<jwt> load-test.js
 *   3. k6 installed: https://k6.io/docs/get-started/installation/
 *
 * Usage:
 *   k6 run packages/web/e2e/load-test.js
 *   k6 run --env BASE_URL=https://api.fleetos.dev --env TOKEN=<jwt> load-test.js
 *
 * Thresholds (TSD §6):
 *   - p95 latency < 500ms
 *   - error rate < 1%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';

// Metrics
const apiLatency = new Trend('api_latency', true);
const errorRate = new Rate('error_rate');
const sessionsCreated = new Counter('sessions_created');
const sessionsFailed = new Counter('sessions_failed');

export const options = {
  scenarios: {
    owner_reads: {
      executor: 'constant-vus',
      vus: 50,
      duration: '60s',
      exec: 'ownerReads',
    },
    ops_writes: {
      executor: 'constant-vus',
      vus: 50,
      duration: '60s',
      exec: 'opsWrites',
    },
    photo_uploads: {
      executor: 'constant-vus',
      vus: 20,
      duration: '60s',
      exec: 'photoPresign',
    },
    mixed_reads: {
      executor: 'constant-vus',
      vus: 80,
      duration: '60s',
      exec: 'mixedReads',
    },
  },
  thresholds: {
    api_latency: [{ threshold: 'p(95)<500', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    error_rate: [{ threshold: 'rate<0.01', abortOnFail: false }],
    sessions_created: [{ threshold: 'count>0' }],
  },
};

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

const MACHINES = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
];

const OPERATORS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Scenario 1: Owner reads dashboard data
export function ownerReads() {
  const h = headers();
  const endpoints = ['/machines', '/clients', '/sites', '/deployments', '/alerts'];
  const res = http.get(`${BASE_URL}/api/v1${pick(endpoints)}`, { h, tags: { scenario: 'owner_reads' } });
  apiLatency.add(res.timings.duration);
  const ok = res.status === 200;
  check(res, { 'owner read 200': () => ok });
  if (!ok) errorRate.add(1);
  sleep(0.5 + Math.random() * 0.5);
}

// Scenario 2: Ops creates work sessions
export function opsWrites() {
  const h = headers();
  const body = JSON.stringify({
    machine_id: pick(MACHINES),
    deployment_id: '00000000-0000-0000-0000-000000000001',
    operator_id: pick(OPERATORS),
    start_at: new Date().toISOString(),
    start_meter: 1000 + Math.floor(Math.random() * 5000),
    client_uuid: crypto.randomUUID(),
  });

  const res = http.post(`${BASE_URL}/api/v1/work-sessions`, body, { h, tags: { scenario: 'ops_writes' } });
  apiLatency.add(res.timings.duration);
  const ok = res.status === 201 || res.status === 409;
  check(res, { 'session create ok': () => ok });
  if (ok) sessionsCreated.add(1); else sessionsFailed.add(1);
  if (!ok) errorRate.add(1);
  sleep(1 + Math.random());
}

// Scenario 3: Photo presign requests
export function photoPresign() {
  const h = headers();
  const body = JSON.stringify({ content_type: 'image/jpeg', purpose: 'meter_reading' });
  const res = http.post(`${BASE_URL}/api/v1/photos/presign`, body, { h, tags: { scenario: 'photo_uploads' } });
  apiLatency.add(res.timings.duration);
  const ok = res.status === 200;
  check(res, { 'presign 200': () => ok });
  if (!ok) errorRate.add(1);
  sleep(0.3 + Math.random() * 0.3);
}

// Scenario 4: Mixed reads (bills, cash, audit)
export function mixedReads() {
  const h = headers();
  const endpoints = [
    '/billing', '/cash', '/audit', '/alerts',
    '/work-sessions', '/fuel-downtime/fuel-logs', '/expenses',
    '/maintenance/tasks', '/operators',
  ];
  const res = http.get(`${BASE_URL}/api/v1${pick(endpoints)}`, { h, tags: { scenario: 'mixed_reads' } });
  apiLatency.add(res.timings.duration);
  const ok = res.status === 200;
  check(res, { 'mixed read 200': () => ok });
  if (!ok) errorRate.add(1);
  sleep(0.3 + Math.random() * 0.7);
}
