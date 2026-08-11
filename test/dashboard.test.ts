import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type http from 'node:http';
import { aggregateEvents, readEvents, createDashboardServer, type AnalyticsEvent } from '../src/dashboard.js';

const NOW = new Date('2026-08-11T12:00:00Z');

function ev(partial: Partial<AnalyticsEvent> & { event: string }): AnalyticsEvent {
  return { ts: '2026-08-11T10:00:00Z', product: 'demo', ...partial };
}

describe('aggregateEvents', () => {
  it('counts totals, today, and signups per product', () => {
    const metrics = aggregateEvents(
      [
        ev({ event: 'page_view' }),
        ev({ event: 'email_signup' }),
        ev({ event: 'page_view', ts: '2026-08-01T00:00:00Z' }),
        ev({ event: 'page_view', product: 'other' }),
      ],
      NOW
    );
    expect(metrics.demo).toMatchObject({ total: 3, today: 2, signups: 1 });
    expect(metrics.other.total).toBe(1);
  });

  it('buckets the last 14 days oldest-first', () => {
    const metrics = aggregateEvents([ev({ event: 'x' }), ev({ event: 'x', ts: '2026-08-10T00:00:00Z' })], NOW);
    const { dailyCounts, days } = metrics.demo;
    expect(days).toHaveLength(14);
    expect(days[13]).toBe('2026-08-11');
    expect(dailyCounts[13]).toBe(1);
    expect(dailyCounts[12]).toBe(1);
  });

  it('computes DAU from userId/sessionId and falls back to null without ids', () => {
    const withIds = aggregateEvents(
      [
        ev({ event: 'x', props: { userId: 'u1' } }),
        ev({ event: 'y', props: { userId: 'u1' } }),
        ev({ event: 'z', props: { sessionId: 's2' } }),
      ],
      NOW
    );
    expect(withIds.demo.dau).toBe(2);

    const withoutIds = aggregateEvents([ev({ event: 'x' })], NOW);
    expect(withoutIds.demo.dau).toBeNull();
  });

  it('attributes events without product to origin, else unknown', () => {
    const metrics = aggregateEvents([{ event: 'x', ts: '2026-08-11T00:00:00Z', origin: 'site.com' }, { event: 'y', ts: '2026-08-11T00:00:00Z' }], NOW);
    expect(metrics['site.com'].total).toBe(1);
    expect(metrics.unknown.total).toBe(1);
  });
});

describe('dashboard server', () => {
  let dir: string;
  let server: http.Server;
  let base: string;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-dash-'));
    server = createDashboardServer(dir);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('no port');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('ingests events with CORS and stamps receivedAt + origin product fallback', async () => {
    const res = await fetch(`${base}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://mysite.example' },
      body: JSON.stringify({ event: 'email_signup' }),
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');

    const events = await readEvents(path.join(dir, 'analytics', 'events.jsonl'));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: 'email_signup', product: 'mysite.example', origin: 'mysite.example' });
    expect(typeof events[0].receivedAt).toBe('string');
  });

  it('answers OPTIONS preflight with 204 + CORS headers', async () => {
    const res = await fetch(`${base}/api/ingest`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('rejects a bodyless/bad ingest with 400', async () => {
    const res = await fetch(`${base}/api/ingest`, { method: 'POST', body: 'not json' });
    expect(res.status).toBe(400);
  });

  it('serves a summary combining registry, events, and finance', async () => {
    fs.writeFileSync(
      path.join(dir, 'products.json'),
      JSON.stringify([{ name: 'demo', platform: 'web', createdAt: 't' }])
    );
    fs.mkdirSync(path.join(dir, 'analytics'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'analytics', 'events.jsonl'),
      JSON.stringify({ product: 'demo', event: 'email_signup', ts: new Date().toISOString() }) + '\n'
    );
    fs.writeFileSync(
      path.join(dir, 'finance.jsonl'),
      JSON.stringify({ product: 'demo', amount: 150000, ts: '2026-08-11T00:00:00Z' }) + '\n'
    );

    const res = await fetch(`${base}/api/summary`);
    expect(res.status).toBe(200);
    const summary = await res.json();
    expect(summary.products).toHaveLength(1);
    expect(summary.products[0]).toMatchObject({ name: 'demo', revenue: 150000 });
    expect(summary.products[0].metrics.signups).toBe(1);
    expect(summary.finance.total).toBe(150000);
  });

  it('serves the HTML dashboard at /', async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('raygent dashboard');
  });
});
