import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  applyEvent,
  buildStatus,
  createHubServer,
  eventFromHook,
  HUB_HOOK_COMMANDS,
  hubFetch,
  matchAgent,
  readHubConfig,
  replay,
  sendEvent,
  slugForPath,
  STALE_MS,
  TASK_MAX,
  validateAgent,
  validateEvent,
  writeHubConfig,
  type HubAgent,
  type HubConfig,
  type HubEvent,
  type SessionMap,
} from '../src/hub.js';
import { HOOK_COMMANDS, installHooks } from '../src/accounts.js';

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-hub-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const NOW = new Date('2026-11-14T10:00:00Z');
const ctx = { account: 'personal', project: 'raygent', host: 'LAPTOP-A', now: NOW };

function ev(type: HubEvent['type'], extra: Partial<HubEvent> = {}): HubEvent {
  return { type, session: 's1', provider: 'claude', account: 'personal', project: 'raygent', host: 'LAPTOP-A', ts: NOW.toISOString(), ...extra };
}

describe('eventFromHook', () => {
  it('maps each Claude Code hook to its event', () => {
    const map: Record<string, string> = {
      SessionStart: 'session.start',
      UserPromptSubmit: 'session.prompt',
      Notification: 'session.waiting',
      Stop: 'session.idle',
      SessionEnd: 'session.end',
    };
    for (const [hook, type] of Object.entries(map)) {
      expect(eventFromHook({ hook_event_name: hook, session_id: 'abc' }, ctx)?.type).toBe(type);
    }
    expect(Object.keys(HUB_HOOK_COMMANDS).sort()).toEqual(Object.keys(map).sort());
  });

  it('ignores unknown hooks and payloads without a session', () => {
    expect(eventFromHook({ hook_event_name: 'PreToolUse', session_id: 'abc' }, ctx)).toBeUndefined();
    expect(eventFromHook({ hook_event_name: 'Stop' }, ctx)).toBeUndefined();
  });

  it('keeps one line of the prompt, cut to the task length', () => {
    const long = `fix the\nlogin   bug ${'x'.repeat(300)}`;
    const e = eventFromHook({ hook_event_name: 'UserPromptSubmit', session_id: 'abc', prompt: long }, ctx)!;
    expect(e.task!.length).toBe(TASK_MAX);
    expect(e.task!.startsWith('fix the login bug x')).toBe(true);
    expect(e.task!.endsWith('…')).toBe(true);
    expect(e).toMatchObject({ account: 'personal', project: 'raygent', host: 'LAPTOP-A', provider: 'claude' });
  });

  it('sends no task on other hooks', () => {
    expect(eventFromHook({ hook_event_name: 'Stop', session_id: 'abc', prompt: 'x' }, ctx)?.task).toBeUndefined();
  });
});

describe('slugForPath', () => {
  it('picks the longest path that holds cwd', () => {
    const h = { raygent: path.join(tmp, 'src', 'raygent'), web: path.join(tmp, 'src', 'raygent', 'website') };
    expect(slugForPath(h, path.join(tmp, 'src', 'raygent', 'website', 'src'))).toBe('web');
    expect(slugForPath(h, path.join(tmp, 'src', 'raygent', 'lib'))).toBe('raygent');
    expect(slugForPath(h, path.join(tmp, 'src', 'raygent'))).toBe('raygent');
  });

  it('does not match a sibling that shares a prefix', () => {
    const h = { raygent: path.join(tmp, 'raygent') };
    expect(slugForPath(h, path.join(tmp, 'raygent-website'))).toBe('raygent-website');
  });

  it('falls back to the folder name', () => {
    expect(slugForPath({}, path.join(tmp, 'my-app'))).toBe('my-app');
  });

  it.runIf(process.platform === 'win32')('ignores case on Windows', () => {
    expect(slugForPath({ raygent: 'D:\\Work\\Raygent' }, 'd:\\work\\raygent\\src')).toBe('raygent');
  });
});

describe('session state', () => {
  it('moves through working, waiting, idle and ended', () => {
    const m: SessionMap = new Map();
    expect(applyEvent(m, ev('session.start')).state).toBe('idle');
    expect(applyEvent(m, ev('session.prompt', { task: 'fix bug' })).state).toBe('working');
    expect(applyEvent(m, ev('session.waiting')).state).toBe('waiting');
    expect(applyEvent(m, ev('session.idle')).state).toBe('idle');
    expect(applyEvent(m, ev('session.end')).state).toBe('ended');
    expect(m.get('s1')!.task).toBe('fix bug');
  });

  it('treats a notification on an idle session as still idle', () => {
    const m: SessionMap = new Map();
    applyEvent(m, ev('session.start'));
    expect(applyEvent(m, ev('session.waiting')).state).toBe('idle');
  });

  it('brings an ended session back when it is resumed', () => {
    const m: SessionMap = new Map();
    applyEvent(m, ev('session.end'));
    expect(applyEvent(m, ev('session.start')).state).toBe('idle');
  });

  it('replays recent events and skips old or broken lines', () => {
    const old = new Date(NOW.getTime() - 25 * 3600_000).toISOString();
    const lines = [
      JSON.stringify(ev('session.prompt', { session: 'old', receivedAt: old })),
      'not json',
      JSON.stringify(ev('session.prompt', { task: 'now', receivedAt: NOW.toISOString() })),
      '',
    ];
    const m = replay(lines, NOW);
    expect([...m.keys()]).toEqual(['s1']);
    expect(m.get('s1')!.state).toBe('working');
  });
});

describe('status', () => {
  const agents: HubAgent[] = [
    { id: 'kage', account: 'personal', projects: ['raygent'], role: 'backend dev' },
    { id: 'all', account: 'personal', projects: [] },
    { id: 'ryu', account: 'work', projects: [] },
  ];

  it('prefers an agent that names the project over one that covers all', () => {
    expect(matchAgent(agents, { account: 'personal', project: 'raygent' })?.id).toBe('kage');
    expect(matchAgent(agents, { account: 'personal', project: 'other' })?.id).toBe('all');
    expect(matchAgent(agents, { account: 'nobody', project: 'raygent' })).toBeUndefined();
    expect(matchAgent(agents, { project: 'raygent' })).toBeUndefined();
  });

  it('groups sessions by agent, marks stale ones and drops old ones', () => {
    const m: SessionMap = new Map();
    const at = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
    applyEvent(m, ev('session.prompt', { session: 'a', receivedAt: at(60_000) }));
    applyEvent(m, ev('session.prompt', { session: 'b', project: 'x', receivedAt: at(STALE_MS + 60_000) }));
    applyEvent(m, ev('session.idle', { session: 'c', account: 'stranger', receivedAt: at(1000) }));
    applyEvent(m, ev('session.idle', { session: 'd', receivedAt: at(13 * 3600_000) }));
    applyEvent(m, ev('session.end', { session: 'e', receivedAt: at(20 * 60_000) }));
    const s = buildStatus(m.values(), agents, NOW);
    const of = (id: string) => s.agents.find((a) => a.agent.id === id)!.sessions.map((x) => `${x.session}:${x.status}`);
    expect(of('kage')).toEqual(['a:working']);
    expect(of('all')).toEqual(['b:stale']);
    expect(of('ryu')).toEqual([]);
    expect(s.unassigned.map((x) => x.session)).toEqual(['c']);
  });
});

describe('validation', () => {
  it('builds a clean event and drops unknown fields', () => {
    const e = validateEvent({ ...ev('session.prompt'), task: 'x'.repeat(500), evil: true }) as HubEvent;
    expect(typeof e).toBe('object');
    expect('evil' in e).toBe(false);
    expect(e.task!.length).toBe(TASK_MAX);
  });

  it('refuses bad events', () => {
    expect(validateEvent({ ...ev('session.start'), type: 'nope' })).toMatch(/type/);
    expect(validateEvent({ ...ev('session.start'), session: '' })).toMatch(/session/);
    expect(validateEvent({ ...ev('session.start'), ts: 'yesterday' })).toMatch(/ts/);
    expect(validateEvent([])).toMatch(/object/);
  });

  it('validates agents', () => {
    expect(validateAgent('Kage', { account: 'a' })).toMatch(/agent id/);
    expect(validateAgent('kage', {})).toMatch(/account/);
    expect(validateAgent('kage', { account: 'a', projects: ['x', 'x'], class: 'ninja' })).toEqual({
      id: 'kage',
      account: 'a',
      projects: ['x'],
      class: 'ninja',
    });
  });
});

describe('hub server', () => {
  const TOKEN = 'test-token-0123456789';
  let server: http.Server;
  let cfg: HubConfig;

  async function start(): Promise<void> {
    server = await createHubServer({ dataDir: tmp, token: TOKEN });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    cfg = { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, token: TOKEN };
  }
  async function stop(): Promise<void> {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  afterEach(async () => {
    if (server?.listening) await stop();
  });

  it('refuses a short token', async () => {
    await expect(createHubServer({ dataDir: tmp, token: 'short' })).rejects.toThrow(/at least/);
  });

  it('answers /healthz without a token and nothing else', async () => {
    await start();
    expect(await (await fetch(`${cfg.url}/healthz`)).text()).toBe('ok');
    expect((await fetch(`${cfg.url}/api/status`)).status).toBe(401);
    expect((await hubFetch({ ...cfg, token: 'wrong-token-0123456789' }, '/api/status')).status).toBe(401);
  });

  it('records events, keeps agents and both survive a restart', async () => {
    await start();
    expect(await sendEvent(cfg, ev('session.prompt', { task: 'ship the hub' }))).toBe(true);
    let status = await (await hubFetch(cfg, '/api/status')).json();
    expect(status.unassigned).toHaveLength(1);
    expect(status.unassigned[0]).toMatchObject({ status: 'working', task: 'ship the hub', project: 'raygent' });

    const put = await hubFetch(cfg, '/api/agents/kage', { method: 'PUT', body: JSON.stringify({ account: 'personal', role: 'dev' }) });
    expect(put.status).toBe(200);
    status = await (await hubFetch(cfg, '/api/status')).json();
    expect(status.unassigned).toHaveLength(0);
    expect(status.agents[0].sessions[0].session).toBe('s1');

    await stop();
    await start();
    status = await (await hubFetch(cfg, '/api/status')).json();
    expect(status.agents[0].agent.id).toBe('kage');
    expect(status.agents[0].sessions[0].status).toBe('working');

    expect((await hubFetch(cfg, '/api/agents/kage', { method: 'DELETE' })).status).toBe(204);
    expect((await hubFetch(cfg, '/api/agents/kage', { method: 'DELETE' })).status).toBe(404);
  });

  it('rejects a bad event with the reason', async () => {
    await start();
    const res = await hubFetch(cfg, '/api/events', { method: 'POST', body: JSON.stringify({ type: 'session.start' }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/provider|session/);
  });

  it('streams each event as it arrives', async () => {
    await start();
    const res = await hubFetch(cfg, '/api/stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const read = async () => {
      while (!text.includes('data: ')) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value);
      }
    };
    await sendEvent(cfg, ev('session.idle', { session: 'streamed' }));
    await read();
    const line = text.split('\n').find((l) => l.startsWith('data: '))!;
    expect(JSON.parse(line.slice(6))).toMatchObject({ type: 'session.idle', session: 'streamed' });
    await reader.cancel();
  });

  it('sendEvent reports a dead hub instead of throwing', async () => {
    expect(await sendEvent({ url: 'http://127.0.0.1:1', token: TOKEN }, ev('session.start'), 500)).toBe(false);
  });
});

describe('client config and hooks', () => {
  it('writes and reads hub.json, and treats a broken one as absent', async () => {
    const file = path.join(tmp, 'hub.json');
    expect(await readHubConfig(file)).toBeUndefined();
    await writeHubConfig({ url: 'https://hub.example.com', token: 't' }, file);
    expect(await readHubConfig(file)).toEqual({ url: 'https://hub.example.com', token: 't' });
    fs.writeFileSync(file, '{');
    expect(await readHubConfig(file)).toBeUndefined();
  });

  it('installs the hub hooks once, next to the accounts hooks', async () => {
    const settings = path.join(tmp, 'settings.json');
    await installHooks(settings);
    expect(await installHooks(settings, HUB_HOOK_COMMANDS)).toBe('added');
    expect(await installHooks(settings, HUB_HOOK_COMMANDS)).toBe('unchanged');
    const hooks = JSON.parse(fs.readFileSync(settings, 'utf8')).hooks as Record<string, { hooks: { command: string }[] }[]>;
    const commands = (event: string) => (hooks[event] ?? []).flatMap((e) => e.hooks.map((h) => h.command));
    expect(commands('Stop')).toEqual([HOOK_COMMANDS.Stop, 'raygent hub emit']);
    expect(commands('UserPromptSubmit')).toEqual(['raygent hub emit']);
  });
});
