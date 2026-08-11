import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { listProducts, type ProductEntry } from './products.js';
import { readFinanceEntries, summarizeFinance, type FinanceSummary } from './finance.js';

export interface AnalyticsEvent {
  product?: string;
  event: string;
  props?: Record<string, unknown>;
  ts?: string;
  receivedAt?: string;
  origin?: string;
}

export interface ProductMetrics {
  total: number;
  today: number;
  signups: number;
  /** last 14 days, oldest first, keyed separately in `days` */
  dailyCounts: number[];
  days: string[];
  /** unique userId/sessionId today, or null when events carry no ids */
  dau: number | null;
}

export function defaultDataDir(): string {
  return path.join(os.homedir(), '.raygent');
}

function eventsPath(dataDir: string): string {
  return path.join(dataDir, 'analytics', 'events.jsonl');
}

export async function readEvents(filePath: string): Promise<AnalyticsEvent[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }
  const events: AnalyticsEvent[] = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed !== null && typeof parsed === 'object' && typeof (parsed as AnalyticsEvent).event === 'string') {
        events.push(parsed as AnalyticsEvent);
      }
    } catch {
      // skip malformed lines
    }
  }
  return events;
}

function dayOf(event: AnalyticsEvent): string {
  const ts = event.ts ?? event.receivedAt ?? '';
  return ts.slice(0, 10);
}

function idOf(event: AnalyticsEvent): string | null {
  const props = event.props ?? {};
  const id = props.userId ?? props.sessionId;
  return typeof id === 'string' && id !== '' ? id : null;
}

export function aggregateEvents(events: AnalyticsEvent[], now: Date = new Date()): Record<string, ProductMetrics> {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  const today = days[days.length - 1];

  const byProduct: Record<string, ProductMetrics> = {};
  const idsToday: Record<string, Set<string>> = {};
  const sawAnyId: Record<string, boolean> = {};

  for (const event of events) {
    const product = event.product ?? event.origin ?? 'unknown';
    const metrics = (byProduct[product] ??= {
      total: 0,
      today: 0,
      signups: 0,
      dailyCounts: days.map(() => 0),
      days,
      dau: null,
    });
    metrics.total += 1;
    if (event.event === 'email_signup') metrics.signups += 1;

    const day = dayOf(event);
    if (day === today) metrics.today += 1;
    const dayIndex = days.indexOf(day);
    if (dayIndex >= 0) metrics.dailyCounts[dayIndex] += 1;

    const id = idOf(event);
    if (id !== null) {
      sawAnyId[product] = true;
      if (day === today) {
        (idsToday[product] ??= new Set()).add(id);
      }
    }
  }

  for (const [product, metrics] of Object.entries(byProduct)) {
    metrics.dau = sawAnyId[product] ? (idsToday[product]?.size ?? 0) : null;
  }
  return byProduct;
}

export interface DashboardSummary {
  products: Array<ProductEntry & { metrics: ProductMetrics | null; revenue: number }>;
  finance: FinanceSummary;
}

export async function buildSummary(dataDir: string): Promise<DashboardSummary> {
  const events = await readEvents(eventsPath(dataDir));
  const metricsByProduct = aggregateEvents(events);
  const finance = summarizeFinance(await readFinanceEntries(path.join(dataDir, 'finance.jsonl')));
  const registry = await listProducts(path.join(dataDir, 'products.json'));

  const names = new Set<string>([...registry.map((p) => p.name), ...Object.keys(metricsByProduct)]);
  const products = [...names].sort().map((name) => {
    const entry = registry.find((p) => p.name === name) ?? { name, createdAt: '' };
    return {
      ...entry,
      metrics: metricsByProduct[name] ?? null,
      revenue: finance.byProduct[name] ?? 0,
    };
  });

  return { products, finance };
}

function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>raygent dashboard</title>
<style>
  :root { --bg:#0e1116; --card:#161b22; --fg:#e6edf3; --muted:#8b949e; --accent:#3b82f6; --ok:#22c55e; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--fg); font:14px/1.5 system-ui,sans-serif; padding:24px; }
  h1 { font-size:18px; margin-bottom:4px; }
  .sub { color:var(--muted); margin-bottom:20px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
  .card { background:var(--card); border:1px solid #21262d; border-radius:10px; padding:16px; }
  .card h2 { font-size:15px; margin-bottom:2px; }
  .meta { color:var(--muted); font-size:12px; margin-bottom:10px; }
  .stats { display:flex; gap:16px; margin-bottom:10px; }
  .stat b { display:block; font-size:18px; }
  .stat span { color:var(--muted); font-size:11px; }
  .bars { display:flex; align-items:flex-end; gap:2px; height:36px; }
  .bars i { flex:1; background:var(--accent); border-radius:2px 2px 0 0; min-height:2px; opacity:.85; }
  .revenue { color:var(--ok); }
  .empty { color:var(--muted); padding:40px; text-align:center; border:1px dashed #21262d; border-radius:10px; }
  footer { color:var(--muted); font-size:12px; margin-top:24px; }
  code { background:#21262d; padding:1px 5px; border-radius:4px; font-size:12px; }
</style>
</head>
<body>
<h1>raygent dashboard</h1>
<p class="sub">Products, events, signups, revenue — refreshes every 10s.</p>
<div id="root" class="grid"></div>
<footer>Ingest: <code id="ingest"></code> — point each product's <code>NEXT_PUBLIC_ANALYTICS_URL</code> here.</footer>
<script>
const fmt = new Intl.NumberFormat();
document.getElementById('ingest').textContent = location.origin + '/api/ingest';
async function refresh() {
  const res = await fetch('/api/summary');
  const data = await res.json();
  const root = document.getElementById('root');
  if (data.products.length === 0) {
    root.innerHTML = '<div class="empty">No products yet. Run <code>raygent init</code> or send an event to /api/ingest.</div>';
    return;
  }
  root.innerHTML = data.products.map(p => {
    const m = p.metrics;
    const bars = m ? m.dailyCounts.map(c => {
      const max = Math.max(...m.dailyCounts, 1);
      return '<i style="height:' + Math.max(6, Math.round(c / max * 100)) + '%" title="' + c + '"></i>';
    }).join('') : '';
    const activeLabel = m === null ? '-' : (m.dau === null ? fmt.format(m.today) + ' <span>events today</span>' : fmt.format(m.dau) + ' <span>DAU</span>');
    return '<div class="card">'
      + '<h2>' + p.name + '</h2>'
      + '<p class="meta">' + [p.platform, p.framework, p.type].filter(Boolean).join(' / ') + '</p>'
      + '<div class="stats">'
      + '<div class="stat"><b>' + (m ? fmt.format(m.total) : '0') + '</b><span>events</span></div>'
      + '<div class="stat"><b>' + activeLabel.split(' <span>')[0] + '</b><span>' + (m === null ? 'no data' : (m.dau === null ? 'events today' : 'DAU')) + '</span></div>'
      + '<div class="stat"><b>' + (m ? fmt.format(m.signups) : '0') + '</b><span>signups</span></div>'
      + '<div class="stat revenue"><b>' + fmt.format(p.revenue) + '</b><span>revenue</span></div>'
      + '</div>'
      + (m ? '<div class="bars">' + bars + '</div>' : '<p class="meta">no events yet</p>')
      + '</div>';
  }).join('');
}
refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>`;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// dist/dashboard.js -> ../dist-web (the built Vite SPA in dashboard-web/).
// When absent (dev without a web build), the inline HTML fallback serves.
function distWebDir(): string {
  return path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist-web');
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

async function serveStatic(pathname: string, res: http.ServerResponse): Promise<boolean> {
  const root = distWebDir();
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(root, rel);
  if (!filePath.startsWith(root)) return false;
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function createDashboardServer(dataDir: string = defaultDataDir()): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (url.pathname === '/api/ingest') {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, CORS_HEADERS);
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.writeHead(405, CORS_HEADERS);
          res.end();
          return;
        }
        let parsed: Record<string, unknown>;
        try {
          const body: unknown = JSON.parse(await readBody(req));
          if (body === null || typeof body !== 'object' || typeof (body as AnalyticsEvent).event !== 'string') {
            throw new Error('bad shape');
          }
          parsed = body as Record<string, unknown>;
        } catch {
          res.writeHead(400, CORS_HEADERS);
          res.end('expected JSON body with an "event" string');
          return;
        }
        const origin = req.headers.origin ?? req.headers.referer;
        const originHost = typeof origin === 'string' ? new URL(origin).host : undefined;
        const record: AnalyticsEvent = {
          ...(parsed as unknown as AnalyticsEvent),
          product: typeof parsed.product === 'string' && parsed.product !== '' ? parsed.product : originHost,
          receivedAt: new Date().toISOString(),
          origin: originHost,
        };
        const filePath = eventsPath(dataDir);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.appendFile(filePath, JSON.stringify(record) + '\n');
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
      }

      if (url.pathname === '/api/summary') {
        const summary = await buildSummary(dataDir);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(summary));
        return;
      }

      if (url.pathname === '/') {
        if (await serveStatic('/', res)) return;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboardHtml());
        return;
      }

      if (req.method === 'GET' && (await serveStatic(url.pathname, res))) return;

      res.writeHead(404);
      res.end('not found');
    } catch (err) {
      res.writeHead(500);
      res.end((err as Error).message);
    }
  });
}
