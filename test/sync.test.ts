import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  sessionKey,
  localProjectDirs,
  newestMtime,
  parseListing,
  filesToPull,
  toRsyncPath,
  rsyncSsh,
  rsyncArgs,
  rsyncInvocation,
  syncSessions,
  unmappedProjectDirs,
  mergeAccounts,
  syncAccounts,
  gitIn,
  gitOut,
  acquireLock,
  releaseLock,
  runSync,
  defaultRunner,
  hiddenLauncherVbs,
  scheduleArgs,
  type Runner,
  type RunResult,
  type SessionsConfig,
  type SharedAccounts,
  type KnownShared,
  type SyncPaths,
  type SyncState,
} from '../src/sync.js';
import { normalizePath, type AccountsFile } from '../src/accounts.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-sync-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const cfg: SessionsConfig = { host: 'me@vps', key: '/keys/vps', dir: 'raygent-sync/sessions', keepDays: 30, rsync: 'native' };

function fakeRunner(handler: (cmd: string, args: string[]) => Partial<RunResult> | undefined = () => undefined) {
  const calls: { cmd: string; args: string[] }[] = [];
  const run: Runner = async (cmd, args) => {
    calls.push({ cmd, args });
    return { code: 0, stdout: '', stderr: '', ...(handler(cmd, args) ?? {}) };
  };
  return { run, calls };
}

function touch(file: string, content = 'x', mtimeSec?: number) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (mtimeSec !== undefined) fs.utimesSync(file, mtimeSec, mtimeSec);
}

describe('session folders', () => {
  it('names a project folder the way Claude Code does', () => {
    expect(sessionKey('D:\\Personal Data\\source-codes\\raygent\\raygent')).toBe('D--Personal-Data-source-codes-raygent-raygent');
    expect(sessionKey('/home/me/code/foo.bar')).toBe('-home-me-code-foo-bar');
  });

  it('finds the existing folder whatever its case, and names the primary exactly', async () => {
    fs.mkdirSync(path.join(dir, 'd--code-foo'));
    fs.mkdirSync(path.join(dir, 'd--code-foobar'));
    const found = await localProjectDirs(dir, 'D--code-foo');
    expect(found.primary).toBe(path.join(dir, 'D--code-foo'));
    expect(found.existing).toEqual([path.join(dir, 'd--code-foo')]);
  });

  it('newestMtime ignores memory and the session index', async () => {
    touch(path.join(dir, 'p', 'a.jsonl'), 'x', 1000);
    touch(path.join(dir, 'p', 'a', 'subagents', 's.jsonl'), 'x', 2000);
    touch(path.join(dir, 'p', 'memory', 'MEMORY.md'), 'x', 9000);
    touch(path.join(dir, 'p', 'sessions-index.json'), 'x', 9000);
    expect(await newestMtime(path.join(dir, 'p'))).toBe(2000 * 1000);
    expect(await newestMtime(path.join(dir, 'missing'))).toBe(0);
  });

  it('lists folders no slug maps to', async () => {
    fs.mkdirSync(path.join(dir, 'D--code-foo'));
    fs.mkdirSync(path.join(dir, 'C--Users-me'));
    expect(await unmappedProjectDirs(dir, { foo: 'd:\\code\\foo' })).toEqual(['C--Users-me']);
  });
});

describe('remote listing', () => {
  it('groups find output by slug and drops junk lines', () => {
    const listing = parseListing('foo/a.jsonl\t1700000000.75\nfoo/a/subagents/s.jsonl\t1700000001.0\nbar/b.jsonl\t1700000002\nloose.txt\t1\n\nfoo/x\tnot-a-number\n');
    expect(listing.get('foo')).toEqual([
      { path: 'a.jsonl', mtime: 1700000000 },
      { path: 'a/subagents/s.jsonl', mtime: 1700000001 },
    ]);
    expect(listing.get('bar')).toEqual([{ path: 'b.jsonl', mtime: 1700000002 }]);
    expect(listing.size).toBe(2);
  });

  it('pulls files that are missing or older here, even when they arrived late', async () => {
    touch(path.join(dir, 'same.jsonl'), 'x', 1000);
    touch(path.join(dir, 'older.jsonl'), 'x', 1000);
    const needed = await filesToPull(dir, [
      { path: 'same.jsonl', mtime: 1000 },
      { path: 'older.jsonl', mtime: 1001 },
      { path: 'missing.jsonl', mtime: 5 },
    ]);
    expect(needed).toEqual(['older.jsonl', 'missing.jsonl']);
  });
});

describe('rsync argv', () => {
  it('converts Windows paths for WSL and cwRsync', () => {
    expect(toRsyncPath('C:\\Users\\me\\.claude\\projects\\x', 'wsl', 'win32')).toBe('/mnt/c/Users/me/.claude/projects/x');
    expect(toRsyncPath('D:\\a b\\c', 'native', 'win32')).toBe('/cygdrive/d/a b/c');
    expect(toRsyncPath('/home/me/x', 'native', 'linux')).toBe('/home/me/x');
  });

  it('uses the Windows OpenSSH from WSL so the Windows key applies', () => {
    expect(rsyncSsh({ ...cfg, key: 'C:\\Users\\me\\.ssh\\vps', rsync: 'wsl' }, 'wsl', 'win32')).toBe(
      '/mnt/c/Windows/System32/OpenSSH/ssh.exe -i C:/Users/me/.ssh/vps -o BatchMode=yes'
    );
    expect(rsyncSsh(cfg, 'native', 'linux')).toBe('ssh -i /keys/vps -o BatchMode=yes');
  });

  it('builds push and pull argv', () => {
    expect(rsyncArgs('push', cfg, 'foo', '/home/me/.claude/projects/-code-foo', 'linux')).toEqual([
      '-rt', '--update', '-e', 'ssh -i /keys/vps -o BatchMode=yes',
      '--exclude', 'memory', '--exclude', 'sessions-index.json',
      '/home/me/.claude/projects/-code-foo/', 'me@vps:raygent-sync/sessions/foo/',
    ]);
    expect(rsyncArgs('pull', cfg, 'foo', '/p/', 'linux', '/tmp/list.txt')).toEqual([
      '-rt', '--update', '-e', 'ssh -i /keys/vps -o BatchMode=yes',
      '--files-from', '/tmp/list.txt', 'me@vps:raygent-sync/sessions/foo/', '/p/',
    ]);
    expect(() => rsyncArgs('pull', cfg, 'foo', '/p', 'linux')).toThrow(/file list/);
  });

  it('runs rsync through wsl on Windows', () => {
    expect(rsyncInvocation({ ...cfg, rsync: undefined }, ['-rt'], 'win32')).toEqual({ cmd: 'wsl', args: ['-e', 'rsync', '-rt'] });
    expect(rsyncInvocation({ ...cfg, rsync: undefined }, ['-rt'], 'linux')).toEqual({ cmd: 'rsync', args: ['-rt'] });
  });
});

describe('syncSessions', () => {
  const now = () => new Date(5_000_000_000);

  it('pulls only what is missing, pushes only folders changed since the last push', async () => {
    const root = path.join(dir, 'projects');
    touch(path.join(root, '-code-foo', 'old.jsonl'), 'x', 1000);
    touch(path.join(root, '-code-bar', 'b.jsonl'), 'x', 3000);
    const { run, calls } = fakeRunner((cmd) => (cmd === 'ssh' ? { stdout: 'foo/old.jsonl\t1000\nfoo/new.jsonl\t2000\nbaz/z.jsonl\t1\n' } : undefined));
    const state: SyncState = { lastPush: 2000 * 1000 };
    const detail = await syncSessions(cfg, { foo: '/code/foo', bar: '/code/bar' }, root, state, { run, now, platform: 'linux', tmpDir: dir });

    const rsyncs = calls.filter((c) => c.cmd === 'rsync');
    expect(rsyncs).toHaveLength(2);
    expect(rsyncs[0].args.slice(-2)).toEqual(['me@vps:raygent-sync/sessions/foo/', path.join(root, '-code-foo') + '/']);
    expect(rsyncs[1].args.slice(-2)).toEqual([path.join(root, '-code-bar') + '/', 'me@vps:raygent-sync/sessions/bar/']);
    expect(detail).toBe('pulled 1 file into 1 folder, pushed 1 folder');
    expect(state.lastPush).toBe(5_000_000_000);
    expect(fs.readdirSync(dir).filter((f) => f.startsWith('raygent-sync-'))).toEqual([]);
  });

  it('creates the project folder for a session that only exists remotely', async () => {
    const root = path.join(dir, 'projects');
    const { run, calls } = fakeRunner((cmd) => (cmd === 'ssh' ? { stdout: 'foo/a.jsonl\t10\n' } : undefined));
    await syncSessions(cfg, { foo: '/code/foo' }, root, {}, { run, now, platform: 'linux', tmpDir: dir });
    expect(fs.existsSync(path.join(root, '-code-foo'))).toBe(true);
    expect(calls.filter((c) => c.cmd === 'rsync')).toHaveLength(1);
  });

  it('keeps the push mark when a push fails, and reports the failure', async () => {
    const root = path.join(dir, 'projects');
    touch(path.join(root, '-code-foo', 'a.jsonl'), 'x', 3000);
    const { run } = fakeRunner((cmd) => (cmd === 'rsync' ? { code: 255, stderr: 'connection refused' } : undefined));
    const state: SyncState = { lastPush: 1 };
    await expect(syncSessions(cfg, { foo: '/code/foo' }, root, state, { run, now, platform: 'linux', tmpDir: dir })).rejects.toThrow(
      /push foo: connection refused/
    );
    expect(state.lastPush).toBe(1);
  });

  it('fails when the listing cannot be read', async () => {
    const { run } = fakeRunner(() => ({ code: 255, stderr: 'Permission denied (publickey).' }));
    await expect(syncSessions(cfg, {}, dir, {}, { run, now, platform: 'linux' })).rejects.toThrow(/Permission denied/);
  });

  it('dry run only plans', async () => {
    const root = path.join(dir, 'projects');
    touch(path.join(root, '-code-foo', 'a.jsonl'), 'x', 3000);
    const { run, calls } = fakeRunner();
    const state: SyncState = {};
    const detail = await syncSessions(cfg, { foo: '/code/foo' }, root, state, { run, now, platform: 'linux', dryRun: true });
    expect(calls.map((c) => c.cmd)).toEqual(['ssh']);
    expect(detail).toMatch(/^push foo: rsync /);
    expect(state.lastPush).toBeUndefined();
  });
});

describe('mergeAccounts', () => {
  const hostsA = { raygent: 'D:\\src\\raygent', web: 'D:\\src\\web' };
  const keyA = normalizePath('D:\\src\\raygent');
  const empty: KnownShared = { accounts: {}, policies: {} };
  const personal = { id: 'personal', provider: 'claude' as const, email: 'p@x.com', configDir: 'C:\\profiles\\p' };
  const office = { id: 'office', provider: 'claude' as const, email: 'o@x.com', configDir: 'C:\\profiles\\o' };
  const gemini = { id: 'gemini', provider: 'gemini' as const, env: { GEMINI_API_KEY: '$GEMINI_API_KEY' } };

  it('first sync exports everything, with slug keys and config dirs split out', () => {
    const local: AccountsFile = { accounts: [personal, gemini], projects: { [keyA]: ['personal'], 'z:\\elsewhere': ['personal'] } };
    const r = mergeAccounts(local, { accounts: [], projects: {} }, {}, hostsA, empty);
    expect(r.shared.accounts).toEqual([{ id: 'personal', provider: 'claude', email: 'p@x.com' }, gemini]);
    expect(r.shared.projects).toEqual({ raygent: ['personal'], 'z:\\elsewhere': ['personal'] });
    expect(r.host).toEqual({ personal: 'C:\\profiles\\p' });
    expect(r.local).toEqual(local);
    expect(r.known.policies).toEqual(r.shared.projects);
  });

  it('a new laptop imports with its own paths and only the accounts logged in there', () => {
    const shared: SharedAccounts = {
      accounts: [{ id: 'personal', provider: 'claude', email: 'p@x.com' }, { id: 'office', provider: 'claude' }, gemini],
      projects: { raygent: ['personal'], other: ['office'] },
    };
    const local: AccountsFile = { accounts: [{ ...personal, configDir: 'E:\\prof\\p' }], projects: {} };
    const r = mergeAccounts(local, shared, {}, { raygent: 'E:\\code\\raygent' }, empty);
    expect(r.local.accounts).toEqual([{ id: 'personal', provider: 'claude', email: 'p@x.com', configDir: 'E:\\prof\\p' }, gemini]);
    expect(r.local.projects).toEqual({ [normalizePath('E:\\code\\raygent')]: ['personal'] });
    expect(r.shared.accounts.map((a) => a.id)).toEqual(['personal', 'office', 'gemini']);
    expect(r.shared.projects.other).toEqual(['office']);
  });

  it('takes the config dir from the host file when this laptop has none', () => {
    const shared: SharedAccounts = { accounts: [{ id: 'office', provider: 'claude' }], projects: {} };
    const r = mergeAccounts({ accounts: [gemini], projects: {} }, shared, { office: 'C:\\profiles\\o' }, hostsA, empty);
    expect(r.local.accounts).toContainEqual({ id: 'office', provider: 'claude', configDir: 'C:\\profiles\\o' });
  });

  it('the side that changed wins; local wins when both changed', () => {
    const known: KnownShared = {
      accounts: { personal: { id: 'personal', provider: 'claude', email: 'p@x.com' } },
      policies: { raygent: ['personal'], web: ['personal'] },
    };
    const shared: SharedAccounts = {
      accounts: [{ id: 'personal', provider: 'claude', email: 'p@x.com', limitedUntil: '2030-01-01T00:00:00.000Z' }],
      projects: { raygent: ['personal', 'office'], web: ['office'] },
    };
    const local: AccountsFile = {
      accounts: [personal, office],
      projects: { [keyA]: ['personal'], [normalizePath(hostsA.web)]: ['office', 'personal'] },
    };
    const r = mergeAccounts(local, shared, {}, hostsA, known);
    expect(r.local.accounts[0]).toEqual({ ...personal, limitedUntil: '2030-01-01T00:00:00.000Z' });
    expect(r.shared.projects.raygent).toEqual(['personal', 'office']);
    expect(r.shared.projects.web).toEqual(['office', 'personal']);
  });

  it('propagates removals of accounts and policies in both directions', () => {
    const known: KnownShared = {
      accounts: {
        personal: { id: 'personal', provider: 'claude', email: 'p@x.com' },
        office: { id: 'office', provider: 'claude', email: 'o@x.com' },
        gemini,
      },
      policies: { raygent: ['personal'], web: ['office'] },
    };
    // Other laptop removed `office` and cleared `web`; this laptop removed gemini and cleared raygent.
    const shared: SharedAccounts = {
      accounts: [{ id: 'personal', provider: 'claude', email: 'p@x.com' }, gemini],
      projects: { raygent: ['personal'] },
    };
    const local: AccountsFile = { accounts: [personal, office], projects: { [normalizePath(hostsA.web)]: ['office'] } };
    const r = mergeAccounts(local, shared, { personal: personal.configDir, office: office.configDir }, hostsA, known);
    expect(r.local.accounts.map((a) => a.id)).toEqual(['personal']);
    expect(r.shared.accounts.map((a) => a.id)).toEqual(['personal']);
    expect(r.local.projects).toEqual({});
    expect(r.shared.projects).toEqual({});
  });

  it('keeps an account that is simply not logged in on this laptop', () => {
    const known: KnownShared = { accounts: { office: { id: 'office', provider: 'claude' } }, policies: {} };
    const shared: SharedAccounts = { accounts: [{ id: 'office', provider: 'claude' }], projects: {} };
    const r = mergeAccounts({ accounts: [personal], projects: {} }, shared, {}, hostsA, known);
    expect(r.shared.accounts.map((a) => a.id)).toEqual(['office', 'personal']);
    expect(r.local.accounts.map((a) => a.id)).toEqual(['personal']);
  });

  it('treats an empty side as fresh instead of a mass removal', () => {
    const known: KnownShared = { accounts: { personal: { id: 'personal', provider: 'claude', email: 'p@x.com' } }, policies: { raygent: ['personal'] } };
    const shared: SharedAccounts = { accounts: [{ id: 'personal', provider: 'claude', email: 'p@x.com' }], projects: { raygent: ['personal'] } };
    const r = mergeAccounts({ accounts: [], projects: {} }, shared, { personal: personal.configDir }, hostsA, known);
    expect(r.local).toEqual({ accounts: [personal], projects: { [keyA]: ['personal'] } });
  });

  it('keeps a local edit made after the other laptop removed the account', () => {
    const known: KnownShared = { accounts: { office: { id: 'office', provider: 'claude', email: 'o@x.com' } }, policies: {} };
    const edited = { ...office, limitedUntil: '2030-01-01T00:00:00.000Z' };
    const r = mergeAccounts({ accounts: [personal, edited], projects: {} }, { accounts: [{ id: 'personal', provider: 'claude', email: 'p@x.com' }], projects: {} }, {}, hostsA, known);
    expect(r.local.accounts.map((a) => a.id)).toEqual(['personal', 'office']);
  });
});

describe('syncAccounts', () => {
  function paths(): SyncPaths {
    return {
      repo: path.join(dir, 'repo'),
      host: 'LAPTOP',
      accountsFile: path.join(dir, 'raygent', 'accounts.json'),
      statePath: path.join(dir, 'raygent', 'sync-state.json'),
      lockPath: path.join(dir, 'raygent', 'sync.lock'),
      projectsRoot: path.join(dir, 'projects'),
    };
  }

  it('writes the shared and host files and remembers what it wrote', async () => {
    const p = paths();
    touch(p.accountsFile, JSON.stringify({ accounts: [{ id: 'personal', provider: 'claude', configDir: 'C:\\p', email: 'p@x.com' }], projects: { [normalizePath('/code/raygent')]: ['personal'] } }));
    const state: SyncState = {};
    const detail = await syncAccounts(p, { raygent: '/code/raygent' }, state);
    expect(detail).toBe('1 account, 1 policy; local file unchanged');
    expect(JSON.parse(fs.readFileSync(path.join(p.repo, 'accounts.json'), 'utf8'))).toEqual({
      accounts: [{ email: 'p@x.com', id: 'personal', provider: 'claude' }],
      projects: { raygent: ['personal'] },
    });
    expect(JSON.parse(fs.readFileSync(path.join(p.repo, 'hosts', 'LAPTOP.accounts.json'), 'utf8'))).toEqual({ personal: 'C:\\p' });
    expect(state.known?.policies).toEqual({ raygent: ['personal'] });
  });

  it('refuses a corrupt shared file instead of reading it as empty', async () => {
    const p = paths();
    touch(p.accountsFile, JSON.stringify({ accounts: [{ id: 'personal', provider: 'claude', configDir: 'C:\\p' }], projects: {} }));
    touch(path.join(p.repo, 'accounts.json'), '<<<<<<< HEAD\n{}');
    await expect(syncAccounts(p, {}, {})).rejects.toThrow(/not valid JSON/);
  });

  it('dry run writes nothing', async () => {
    const p = paths();
    touch(p.accountsFile, JSON.stringify({ accounts: [{ id: 'g', provider: 'gemini' }], projects: {} }));
    await syncAccounts(p, {}, {}, true);
    expect(fs.existsSync(p.repo)).toBe(false);
  });
});

// Each case spawns a dozen git processes; on Windows that alone nears the 5 s default.
describe('git phases (real git)', { timeout: 30_000 }, () => {
  const g = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const now = new Date('2026-11-13T00:00:00.000Z');

  function clone(name: string, remote: string): string {
    const p = path.join(dir, name);
    execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '-q', remote, p], { stdio: 'ignore' });
    g(p, 'config', 'user.email', 'test@example.com');
    g(p, 'config', 'user.name', 'test');
    g(p, 'config', 'core.autocrlf', 'false');
    return p;
  }

  function setup() {
    const remote = path.join(dir, 'remote.git');
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote], { stdio: 'ignore' });
    const a = clone('a', remote);
    touch(path.join(a, 'accounts.json'), '{"v":0}\n');
    touch(path.join(a, 'memory.md'), 'base\n');
    g(a, 'add', '-A');
    g(a, 'commit', '-q', '-m', 'init');
    g(a, 'push', '-q', '-u', 'origin', 'HEAD');
    return { remote, a, b: clone('b', remote) };
  }

  it('commits, pulls and pushes', async () => {
    const { a, b } = setup();
    touch(path.join(a, 'memory.md'), 'from a\n');
    expect(await gitIn(a, 'A', now, defaultRunner)).toBe('committed and pulled');
    expect(await gitOut(a, 'A', now, defaultRunner)).toBe('pushed 1 commit');
    expect(g(a, 'log', '-1', '--format=%s')).toBe('sync: A 2026-11-13T00:00:00.000Z');
    expect(await gitIn(b, 'B', now, defaultRunner)).toBe('pulled');
    expect(fs.readFileSync(path.join(b, 'memory.md'), 'utf8')).toBe('from a\n');
    expect(await gitOut(b, 'B', now, defaultRunner)).toBe('up to date');
  });

  it('takes upstream for a conflict in the accounts file', async () => {
    const { a, b } = setup();
    touch(path.join(a, 'accounts.json'), '{"v":"a"}\n');
    await gitIn(a, 'A', now, defaultRunner);
    await gitOut(a, 'A', now, defaultRunner);
    touch(path.join(b, 'accounts.json'), '{"v":"b"}\n');
    touch(path.join(b, 'notes.md'), 'b only\n');
    expect(await gitIn(b, 'B', now, defaultRunner)).toBe('committed and pulled');
    expect(fs.readFileSync(path.join(b, 'accounts.json'), 'utf8')).toBe('{"v":"a"}\n');
    expect(fs.existsSync(path.join(b, 'notes.md'))).toBe(true);
    expect(g(b, 'status', '--porcelain')).toBe('');
  });

  it('skips a local commit that only touched the accounts file', async () => {
    const { a, b } = setup();
    touch(path.join(a, 'accounts.json'), '{"v":"a"}\n');
    await gitIn(a, 'A', now, defaultRunner);
    await gitOut(a, 'A', now, defaultRunner);
    touch(path.join(b, 'accounts.json'), '{"v":"b"}\n');
    expect(await gitIn(b, 'B', now, defaultRunner)).toBe('committed and pulled');
    expect(g(b, 'rev-parse', 'HEAD')).toBe(g(b, 'rev-parse', '@{u}'));
  });

  it('aborts and reports any other conflict', async () => {
    const { a, b } = setup();
    touch(path.join(a, 'memory.md'), 'a version\n');
    await gitIn(a, 'A', now, defaultRunner);
    await gitOut(a, 'A', now, defaultRunner);
    touch(path.join(b, 'memory.md'), 'b version\n');
    await expect(gitIn(b, 'B', now, defaultRunner)).rejects.toThrow(/rebase conflict.*memory\.md/);
    expect(fs.existsSync(path.join(b, '.git', 'rebase-merge'))).toBe(false);
    expect(fs.readFileSync(path.join(b, 'memory.md'), 'utf8')).toBe('b version\n');
  });

  it('works without a remote', async () => {
    const p = path.join(dir, 'solo');
    execFileSync('git', ['init', '-q', p], { stdio: 'ignore' });
    g(p, 'config', 'user.email', 'test@example.com');
    g(p, 'config', 'user.name', 'test');
    touch(path.join(p, 'x.md'), 'x');
    expect(await gitIn(p, 'A', now, defaultRunner)).toBe('committed (no remote)');
    expect(await gitOut(p, 'A', now, defaultRunner)).toBe('clean (no remote)');
  });
});

describe('lock', () => {
  it('blocks a second run until the first releases or goes stale', async () => {
    const lock = path.join(dir, 'sync.lock');
    const t = new Date('2026-11-13T00:00:00.000Z');
    expect(await acquireLock(lock, t)).toBe(true);
    expect(await acquireLock(lock, new Date(t.getTime() + 60_000))).toBe(false);
    expect(await acquireLock(lock, new Date(t.getTime() + 11 * 60_000))).toBe(true);
    await releaseLock(lock);
    expect(await acquireLock(lock, t)).toBe(true);
  });
});

describe('runSync', () => {
  function deps(run: Runner) {
    const paths: SyncPaths = {
      repo: path.join(dir, 'repo'),
      host: 'LAPTOP',
      accountsFile: path.join(dir, 'raygent', 'accounts.json'),
      statePath: path.join(dir, 'raygent', 'sync-state.json'),
      lockPath: path.join(dir, 'raygent', 'sync.lock'),
      projectsRoot: path.join(dir, 'projects'),
    };
    return { paths, run, now: () => new Date('2026-11-13T00:00:00.000Z'), platform: 'linux' as const, tmpDir: dir };
  }

  it('keeps going when a phase fails, records state, releases the lock', async () => {
    const { run } = fakeRunner((cmd) => (cmd === 'git' ? { code: 1, stderr: 'fatal: not a git repository' } : { stdout: '' }));
    const d = deps(run);
    touch(path.join(d.paths.repo, 'sync.json'), JSON.stringify({ sessions: cfg }));
    touch(path.join(d.paths.repo, 'hosts', 'LAPTOP.json'), '{}');
    const results = await runSync({ git: true, accounts: true, sessions: true, dryRun: false }, d);
    expect(results.map((r) => [r.phase, r.ok])).toEqual([
      ['git in', false],
      ['accounts', true],
      ['git out', false],
      ['sessions', true],
    ]);
    const state = JSON.parse(fs.readFileSync(d.paths.statePath, 'utf8')) as SyncState;
    expect(state.lastOk).toBe(false);
    expect(state.lastRun).toBe('2026-11-13T00:00:00.000Z');
    expect(fs.existsSync(d.paths.lockPath)).toBe(false);
  });

  it('skips sessions without a config and reports a missing repo', async () => {
    const { run } = fakeRunner();
    const d = deps(run);
    expect(await runSync({ git: false, accounts: false, sessions: true, dryRun: false }, d)).toEqual([
      { phase: 'config', ok: false, detail: `${d.paths.repo} not found` },
    ]);
    fs.mkdirSync(d.paths.repo);
    expect(await runSync({ git: false, accounts: false, sessions: true, dryRun: false }, d)).toEqual([]);
  });

  it('skips while another sync holds the lock', async () => {
    const { run } = fakeRunner();
    const d = deps(run);
    fs.mkdirSync(d.paths.repo);
    await acquireLock(d.paths.lockPath, d.now());
    expect(await runSync({ git: true, accounts: true, sessions: true, dryRun: false }, d)).toEqual([
      { phase: 'lock', ok: true, detail: 'another sync is running; skipped' },
    ]);
  });
});

describe('scheduled task', () => {
  it('launches node hidden through wscript every 15 minutes', () => {
    expect(hiddenLauncherVbs('C:\\node\\node.exe', 'D:\\r\\dist\\cli.js')).toBe(
      'CreateObject("WScript.Shell").Run """C:\\node\\node.exe"" ""D:\\r\\dist\\cli.js"" sync --quiet", 0, False\r\n'
    );
    expect(scheduleArgs('C:\\u\\.raygent\\sync-hidden.vbs')).toEqual([
      '/Create', '/F', '/SC', 'MINUTE', '/MO', '15', '/TN', 'raygent-sync', '/TR', 'wscript.exe //B "C:\\u\\.raygent\\sync-hidden.vbs"',
    ]);
  });
});
