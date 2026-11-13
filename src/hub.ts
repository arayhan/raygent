import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { readBody } from './dashboard.js';
import { accountsPath, normalizePath, type AccountProvider } from './accounts.js';

// The Agent Hub: one server (on the VPS) that knows every agent, which AI
// account and project it works in, and what each live session is doing.
// Laptops report through Claude Code hooks; later steps (the Office, the chat
// bridge, orchestration) read /api/status and /api/stream.

// ---------------------------------------------------------------- types

export type HubEventType = 'session.start' | 'session.prompt' | 'session.waiting' | 'session.idle' | 'session.end';
export const HUB_EVENT_TYPES: HubEventType[] = [
  'session.start',
  'session.prompt',
  'session.waiting',
  'session.idle',
  'session.end',
];

export interface HubEvent {
  type: HubEventType;
  /** Claude session id, or a uuid from the gemini launcher. */
  session: string;
  provider: AccountProvider;
  /** raygent account id, when the session runs under a registered account. */
  account?: string;
  /** Slug from the brain hosts map, else the folder name. */
  project: string;
  host: string;
  /** session.prompt only: the start of the prompt, one line. */
  task?: string;
  /** Client time. */
  ts: string;
  /** Server time, stamped on arrival; staleness is measured against it. */
  receivedAt?: string;
}

export type SessionState = 'working' | 'waiting' | 'idle' | 'ended';
export type SessionStatus = SessionState | 'stale';

export interface HubSession {
  session: string;
  provider: AccountProvider;
  account?: string;
  project: string;
  host: string;
  state: SessionState;
  task?: string;
  startedAt: string;
  lastEventAt: string;
}

export interface HubAgent {
  id: string;
  role?: string;
  account: string;
  /** Empty: the agent covers every project its account runs in. */
  projects: string[];
  /** Character class for the Office (ninja, knight, sorcerer, ...). Free text. */
  class?: string;
}

export interface StatusSession extends HubSession {
  status: SessionStatus;
}

export interface HubStatus {
  agents: { agent: HubAgent; sessions: StatusSession[] }[];
  unassigned: StatusSession[];
  generatedAt: string;
}

export const TASK_MAX = 120;
/** A working session with no event for this long shows as stale. */
export const STALE_MS = 30 * 60 * 1000;
/** A session with no event for this long drops off the status. */
export const DROP_MS = 12 * 60 * 60 * 1000;
/** An ended session stays visible this long, so a finish is seen. */
export const ENDED_KEEP_MS = 10 * 60 * 1000;
/** On boot, events younger than this rebuild the live state. */
export const REPLAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- hooks -> events

export const HUB_HOOK_COMMAND = 'raygent hub emit';
export const HUB_HOOK_COMMANDS: Record<string, string> = {
  SessionStart: HUB_HOOK_COMMAND,
  UserPromptSubmit: HUB_HOOK_COMMAND,
  Notification: HUB_HOOK_COMMAND,
  Stop: HUB_HOOK_COMMAND,
  SessionEnd: HUB_HOOK_COMMAND,
};

const HOOK_TO_TYPE: Record<string, HubEventType> = {
  SessionStart: 'session.start',
  UserPromptSubmit: 'session.prompt',
  Notification: 'session.waiting',
  Stop: 'session.idle',
  SessionEnd: 'session.end',
};

export interface HookPayload {
  hook_event_name?: string;
  session_id?: string;
  cwd?: string;
  prompt?: string;
}

export interface EmitContext {
  account?: string;
  project: string;
  host: string;
  now: Date;
}

export function truncateTask(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > TASK_MAX ? `${line.slice(0, TASK_MAX - 1)}…` : line;
}

export function eventFromHook(payload: HookPayload, ctx: EmitContext): HubEvent | undefined {
  const type = HOOK_TO_TYPE[payload.hook_event_name ?? ''];
  if (!type || typeof payload.session_id !== 'string' || payload.session_id === '') return undefined;
  const event: HubEvent = {
    type,
    session: payload.session_id,
    provider: 'claude',
    project: ctx.project,
    host: ctx.host,
    ts: ctx.now.toISOString(),
  };
  if (ctx.account) event.account = ctx.account;
  if (type === 'session.prompt' && typeof payload.prompt === 'string' && payload.prompt.trim() !== '') {
    event.task = truncateTask(payload.prompt);
  }
  return event;
}

/** The slug whose path holds cwd (longest match wins), else the folder name. */
export function slugForPath(hosts: Record<string, string>, cwd: string): string {
  const here = normalizePath(cwd);
  let best: { slug: string; length: number } | undefined;
  for (const [slug, p] of Object.entries(hosts)) {
    if (typeof p !== 'string') continue;
    const root = normalizePath(p);
    const inside = here === root || here.startsWith(root + path.sep);
    if (inside && (!best || root.length > best.length)) best = { slug, length: root.length };
  }
  return best?.slug ?? path.basename(path.resolve(cwd));
}

// ---------------------------------------------------------------- state

export type SessionMap = Map<string, HubSession>;

export function applyEvent(sessions: SessionMap, event: HubEvent): HubSession {
  const at = event.receivedAt ?? event.ts;
  let s = sessions.get(event.session);
  if (!s) {
    s = {
      session: event.session,
      provider: event.provider,
      project: event.project,
      host: event.host,
      state: 'idle',
      startedAt: at,
      lastEventAt: at,
    };
    sessions.set(event.session, s);
  }
  if (event.account) s.account = event.account;
  s.project = event.project;
  s.host = event.host;
  s.lastEventAt = at;
  switch (event.type) {
    case 'session.start':
      if (s.state === 'ended') s.state = 'idle'; // a resumed session comes back
      break;
    case 'session.prompt':
      s.state = 'working';
      if (event.task) s.task = event.task;
      break;
    case 'session.waiting':
      // Claude Code also notifies when an idle prompt has waited a while; only a
      // turn in progress can be waiting on you.
      if (s.state === 'working') s.state = 'waiting';
      break;
    case 'session.idle':
      s.state = 'idle';
      break;
    case 'session.end':
      s.state = 'ended';
      break;
  }
  return s;
}

export function replay(lines: string[], now: Date, windowMs: number = REPLAY_MS): SessionMap {
  const sessions: SessionMap = new Map();
  for (const line of lines) {
    if (line.trim() === '') continue;
    let event: HubEvent;
    try {
      event = JSON.parse(line) as HubEvent;
    } catch {
      continue;
    }
    const at = Date.parse(event.receivedAt ?? event.ts);
    if (!Number.isFinite(at) || now.getTime() - at > windowMs) continue;
    if (!HUB_EVENT_TYPES.includes(event.type) || typeof event.session !== 'string') continue;
    applyEvent(sessions, event);
  }
  return sessions;
}

function optionalString(value: unknown, max: number): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max) return null;
  return value;
}

/** A clean event from an untrusted body, or the reason it is refused. */
export function validateEvent(body: unknown): HubEvent | string {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return 'expected a JSON object';
  const b = body as Record<string, unknown>;
  if (!HUB_EVENT_TYPES.includes(b.type as HubEventType)) return `type must be one of ${HUB_EVENT_TYPES.join(', ')}`;
  if (b.provider !== 'claude' && b.provider !== 'gemini') return 'provider must be claude or gemini';
  for (const key of ['session', 'project', 'host'] as const) {
    if (typeof b[key] !== 'string' || b[key] === '' || (b[key] as string).length > 200) return `${key} must be a non-empty string`;
  }
  const account = optionalString(b.account, 100);
  if (account === null) return 'account must be a string';
  const task = optionalString(b.task, 2000);
  if (task === null) return 'task must be a string';
  const ts = typeof b.ts === 'string' && Number.isFinite(Date.parse(b.ts)) ? b.ts : undefined;
  if (!ts) return 'ts must be an ISO time';
  const event: HubEvent = {
    type: b.type as HubEventType,
    session: b.session as string,
    provider: b.provider,
    project: b.project as string,
    host: b.host as string,
    ts,
  };
  if (account) event.account = account;
  if (task) event.task = truncateTask(task);
  return event;
}

// ---------------------------------------------------------------- agents

export const AGENT_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function validateAgent(id: string, body: unknown): HubAgent | string {
  if (!AGENT_ID.test(id)) return 'agent id: lowercase letters, digits and "-", up to 40';
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return 'expected a JSON object';
  const b = body as Record<string, unknown>;
  if (typeof b.account !== 'string' || b.account === '' || b.account.length > 100) return 'account is required';
  const role = optionalString(b.role, 80);
  if (role === null) return 'role must be a string of up to 80 characters';
  const cls = optionalString(b.class, 40);
  if (cls === null) return 'class must be a string of up to 40 characters';
  const projects = b.projects ?? [];
  if (!Array.isArray(projects) || projects.some((p) => typeof p !== 'string' || p === '' || p.length > 200)) {
    return 'projects must be a list of slugs';
  }
  const agent: HubAgent = { id, account: b.account, projects: [...new Set(projects as string[])] };
  if (role) agent.role = role;
  if (cls) agent.class = cls;
  return agent;
}

export async function readAgents(file: string): Promise<HubAgent[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as { agents?: unknown };
    if (!Array.isArray(parsed.agents)) return [];
    return parsed.agents.filter(
      (a): a is HubAgent => a !== null && typeof a === 'object' && typeof (a as HubAgent).id === 'string' && typeof (a as HubAgent).account === 'string'
    ).map((a) => ({ ...a, projects: Array.isArray(a.projects) ? a.projects : [] }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    // A corrupt registry must not be silently replaced by an empty one on the next write.
    throw new Error(`cannot read ${file}: ${(err as Error).message}`);
  }
}

export async function writeAgents(file: string, agents: HubAgent[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const sorted = [...agents].sort((a, b) => a.id.localeCompare(b.id));
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ agents: sorted }, null, 2) + '\n');
  await fs.rename(tmp, file);
}

/** An agent naming the session's project beats one that covers every project. */
export function matchAgent(agents: HubAgent[], s: Pick<HubSession, 'account' | 'project'>): HubAgent | undefined {
  if (!s.account) return undefined;
  const mine = agents.filter((a) => a.account === s.account).sort((a, b) => a.id.localeCompare(b.id));
  return mine.find((a) => a.projects.includes(s.project)) ?? mine.find((a) => a.projects.length === 0);
}

export function sessionStatus(s: HubSession, now: Date): SessionStatus | undefined {
  const age = now.getTime() - Date.parse(s.lastEventAt);
  if (!Number.isFinite(age) || age > DROP_MS) return undefined;
  if (s.state === 'ended') return age > ENDED_KEEP_MS ? undefined : 'ended';
  if (s.state === 'working' && age > STALE_MS) return 'stale';
  return s.state;
}

export function buildStatus(sessions: Iterable<HubSession>, agents: HubAgent[], now: Date): HubStatus {
  const byAgent = new Map<string, StatusSession[]>(agents.map((a) => [a.id, []]));
  const unassigned: StatusSession[] = [];
  for (const s of sessions) {
    const status = sessionStatus(s, now);
    if (!status) continue;
    const row = { ...s, status };
    const agent = matchAgent(agents, s);
    if (agent) byAgent.get(agent.id)!.push(row);
    else unassigned.push(row);
  }
  const newest = (a: StatusSession, b: StatusSession) => b.lastEventAt.localeCompare(a.lastEventAt);
  return {
    agents: [...agents]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((agent) => ({ agent, sessions: byAgent.get(agent.id)!.sort(newest) })),
    unassigned: unassigned.sort(newest),
    generatedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------- server

export interface HubServerOptions {
  dataDir: string;
  token: string;
  now?: () => Date;
}

export const MIN_TOKEN_LENGTH = 16;

function sameToken(given: string, expected: string): boolean {
  // Hash first: timingSafeEqual needs equal lengths, and a length check would leak the length.
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Browser login. The Office page cannot hold the token, so a login trades it
// for an HttpOnly cookie. The cookie is stateless, an expiry signed with the
// token itself: nothing to store, and a new token logs every browser out.
export const SESSION_COOKIE = 'raygent_hub';
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

function sessionSignature(token: string, exp: number): string {
  return crypto.createHmac('sha256', token).update(`office:${exp}`).digest('base64url');
}

export function makeSessionValue(token: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_S;
  return `v1.${exp}.${sessionSignature(token, exp)}`;
}

export function validSessionValue(value: string, token: string, now: Date): boolean {
  const m = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 <= now.getTime()) return false;
  const given = Buffer.from(m[2]);
  const expected = Buffer.from(sessionSignature(token, exp));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function readCookie(req: http.IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

function sessionCookie(req: http.IncomingMessage, value: string, maxAge: number): string {
  // Secure only behind TLS (nginx sets X-Forwarded-Proto); a local dev server is plain http.
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; HttpOnly${secure}; SameSite=Strict; Path=/api; Max-Age=${maxAge}`;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export async function createHubServer(opts: HubServerOptions): Promise<http.Server> {
  if (opts.token.length < MIN_TOKEN_LENGTH) throw new Error(`hub token must be at least ${MIN_TOKEN_LENGTH} characters`);
  const now = opts.now ?? (() => new Date());
  const eventsFile = path.join(opts.dataDir, 'events.jsonl');
  const agentsFile = path.join(opts.dataDir, 'agents.json');
  await fs.mkdir(opts.dataDir, { recursive: true });

  let lines: string[] = [];
  try {
    lines = (await fs.readFile(eventsFile, 'utf8')).split('\n');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const sessions = replay(lines, now());
  let agents = await readAgents(agentsFile);
  const streams = new Set<http.ServerResponse>();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
      }
      if (url.pathname === '/api/session' && req.method === 'POST') {
        let token: unknown;
        try {
          token = (JSON.parse(await readBody(req)) as { token?: unknown }).token;
        } catch {
          sendJson(res, 400, { error: 'expected {"token": "..."}' });
          return;
        }
        if (typeof token !== 'string' || !sameToken(token, opts.token)) {
          sendJson(res, 401, { error: 'unauthorized' });
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': sessionCookie(req, makeSessionValue(opts.token, now()), SESSION_MAX_AGE_S),
        });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (url.pathname === '/api/session' && req.method === 'DELETE') {
        res.writeHead(204, { 'Set-Cookie': sessionCookie(req, '', 0) });
        res.end();
        return;
      }

      const auth = req.headers.authorization ?? '';
      const bearer = auth.startsWith('Bearer ') && sameToken(auth.slice('Bearer '.length), opts.token);
      const cookie = readCookie(req, SESSION_COOKIE);
      if (!bearer && !(cookie && validSessionValue(cookie, opts.token, now()))) {
        sendJson(res, 401, { error: 'unauthorized' });
        return;
      }

      if (url.pathname === '/api/session' && req.method === 'GET') {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/events' && req.method === 'POST') {
        let body: unknown;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          sendJson(res, 400, { error: 'expected a JSON body' });
          return;
        }
        const event = validateEvent(body);
        if (typeof event === 'string') {
          sendJson(res, 400, { error: event });
          return;
        }
        event.receivedAt = now().toISOString();
        applyEvent(sessions, event);
        await fs.appendFile(eventsFile, JSON.stringify(event) + '\n');
        const frame = `data: ${JSON.stringify(event)}\n\n`;
        for (const s of streams) s.write(frame);
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === '/api/status' && req.method === 'GET') {
        sendJson(res, 200, buildStatus(sessions.values(), agents, now()));
        return;
      }

      if (url.pathname === '/api/agents' && req.method === 'GET') {
        sendJson(res, 200, { agents });
        return;
      }

      const agentRoute = /^\/api\/agents\/([^/]+)$/.exec(url.pathname);
      if (agentRoute) {
        const id = decodeURIComponent(agentRoute[1]);
        if (req.method === 'PUT') {
          let body: unknown;
          try {
            body = JSON.parse(await readBody(req));
          } catch {
            sendJson(res, 400, { error: 'expected a JSON body' });
            return;
          }
          const agent = validateAgent(id, body);
          if (typeof agent === 'string') {
            sendJson(res, 400, { error: agent });
            return;
          }
          const next = [...agents.filter((a) => a.id !== id), agent];
          await writeAgents(agentsFile, next);
          agents = next;
          sendJson(res, 200, agent);
          return;
        }
        if (req.method === 'DELETE') {
          if (!agents.some((a) => a.id === id)) {
            sendJson(res, 404, { error: `no agent ${id}` });
            return;
          }
          const next = agents.filter((a) => a.id !== id);
          await writeAgents(agentsFile, next);
          agents = next;
          res.writeHead(204);
          res.end();
          return;
        }
      }

      if (url.pathname === '/api/stream' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no', // nginx: pass events through as they come
        });
        res.write(': connected\n\n');
        streams.add(res);
        // Proxies drop a silent connection; a comment line every 25 s keeps it open.
        const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
        req.on('close', () => {
          clearInterval(ping);
          streams.delete(res);
        });
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    } catch (err) {
      if (!res.headersSent) sendJson(res, 500, { error: (err as Error).message });
      else res.end();
    }
  });
  server.on('close', () => {
    for (const s of streams) s.end();
    streams.clear();
  });
  return server;
}

// ---------------------------------------------------------------- client

export interface HubConfig {
  url: string;
  token: string;
}

export function hubConfigPath(): string {
  return path.join(path.dirname(accountsPath()), 'hub.json');
}

export async function readHubConfig(file: string = hubConfigPath()): Promise<HubConfig | undefined> {
  try {
    const parsed = JSON.parse((await fs.readFile(file, 'utf8')).replace(/^﻿/, '')) as Partial<HubConfig>;
    if (typeof parsed.url !== 'string' || typeof parsed.token !== 'string') return undefined;
    return { url: parsed.url, token: parsed.token };
  } catch {
    return undefined;
  }
}

export async function writeHubConfig(cfg: HubConfig, file: string = hubConfigPath()): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  // The token is the only gate to the hub; keep it readable by this user only.
  await fs.writeFile(file, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
}

export function hubUrl(cfg: HubConfig, route: string): URL {
  return new URL(route.replace(/^\/+/, ''), cfg.url.endsWith('/') ? cfg.url : `${cfg.url}/`);
}

export async function hubFetch(cfg: HubConfig, route: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  return fetch(hubUrl(cfg, route), {
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}

/** POSTs one event; never throws. */
export async function sendEvent(cfg: HubConfig, event: HubEvent, timeoutMs = 3_000): Promise<boolean> {
  try {
    const res = await hubFetch(cfg, '/api/events', { method: 'POST', body: JSON.stringify(event) }, timeoutMs);
    return res.ok;
  } catch {
    return false;
  }
}
