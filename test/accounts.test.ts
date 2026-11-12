import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  accountsPath,
  readAccounts,
  writeAccounts,
  upsertAccount,
  removeAccount,
  setProjectPolicy,
  getProjectPolicy,
  normalizePath,
  pickAccount,
  parseClockTime,
  parseUntil,
  parseLimitLine,
  observeTranscript,
  currentAccount,
  discoverClaudeAccounts,
  suggestAccountId,
  maskEmail,
  resolveAccountEnv,
  installHooks,
  HOOK_COMMANDS,
  DEFAULT_LIMIT_MS,
  type Account,
  type AccountsFile,
} from '../src/accounts.js';

let dir: string;
let filePath: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-accounts-'));
  filePath = path.join(dir, 'accounts.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const claude = (id: string, extra: Partial<Account> = {}): Account => ({ id, provider: 'claude', ...extra });
const gemini = (id: string, extra: Partial<Account> = {}): Account => ({ id, provider: 'gemini', ...extra });

describe('readAccounts / writeAccounts', () => {
  it('returns an empty file when missing', async () => {
    expect(await readAccounts(filePath)).toEqual({ accounts: [], projects: {} });
  });

  it('returns an empty file when the JSON is corrupt', async () => {
    fs.writeFileSync(filePath, '{not json');
    expect(await readAccounts(filePath)).toEqual({ accounts: [], projects: {} });
  });

  it('drops entries without a valid provider', async () => {
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        accounts: [{ id: 'a', provider: 'claude' }, { id: 'b', provider: 'openai' }, { id: 'c' }, null, 'x', { provider: 'gemini' }],
        projects: {},
      })
    );
    const file = await readAccounts(filePath);
    expect(file.accounts).toEqual([{ id: 'a', provider: 'claude' }]);
  });

  it('drops projects values that are not string arrays', async () => {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ accounts: [], projects: { ok: ['a'], num: 5, mixed: ['a', 1], obj: { a: 1 }, str: 'a' } })
    );
    expect((await readAccounts(filePath)).projects).toEqual({ ok: ['a'] });
  });

  it('round-trips through writeAccounts and creates parent dirs', async () => {
    const nested = path.join(dir, 'deep', 'accounts.json');
    const file: AccountsFile = { accounts: [claude('a', { configDir: '/x' })], projects: { '/p': ['a'] } };
    await writeAccounts(file, nested);
    expect(await readAccounts(nested)).toEqual(file);
  });
});

describe('upsertAccount / removeAccount', () => {
  it('upserts by id, merging fields', async () => {
    await upsertAccount(claude('a', { configDir: '/x', email: 'a@b.c' }), filePath);
    await upsertAccount(claude('a', { org: 'acme' }), filePath);
    await upsertAccount(gemini('g'), filePath);
    const { accounts } = await readAccounts(filePath);
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toEqual({ id: 'a', provider: 'claude', configDir: '/x', email: 'a@b.c', org: 'acme' });
  });

  it('returns false when removing an unknown id', async () => {
    await upsertAccount(claude('a'), filePath);
    expect(await removeAccount('nope', filePath)).toBe(false);
    expect((await readAccounts(filePath)).accounts).toHaveLength(1);
  });

  it('removes the id from every policy and deletes a policy that becomes empty', async () => {
    await upsertAccount(claude('a'), filePath);
    await upsertAccount(claude('b'), filePath);
    await setProjectPolicy(path.join(dir, 'p1'), ['a', 'b'], filePath);
    await setProjectPolicy(path.join(dir, 'p2'), ['a'], filePath);

    expect(await removeAccount('a', filePath)).toBe(true);

    const file = await readAccounts(filePath);
    expect(file.accounts.map((a) => a.id)).toEqual(['b']);
    expect(file.projects[normalizePath(path.join(dir, 'p1'))]).toEqual(['b']);
    expect(file.projects[normalizePath(path.join(dir, 'p2'))]).toBeUndefined();
  });
});

describe('project policy', () => {
  it('throws for an unknown account id', async () => {
    await upsertAccount(claude('a'), filePath);
    await expect(setProjectPolicy(path.join(dir, 'p'), ['a', 'ghost'], filePath)).rejects.toThrow(/unknown account 'ghost'/);
    expect((await readAccounts(filePath)).projects).toEqual({});
  });

  it('finds the policy when the lookup path has a trailing slash', async () => {
    const proj = path.join(dir, 'proj');
    await upsertAccount(claude('a'), filePath);
    await setProjectPolicy(proj, ['a'], filePath);
    const file = await readAccounts(filePath);
    expect(getProjectPolicy(proj + path.sep, file)).toEqual(['a']);
    expect(getProjectPolicy(proj + '/', file)).toEqual(['a']);
  });

  it('finds the policy regardless of case on win32', async () => {
    const proj = path.join(dir, 'proj');
    await upsertAccount(claude('a'), filePath);
    await setProjectPolicy(proj, ['a'], filePath);
    const file = await readAccounts(filePath);
    if (process.platform === 'win32') {
      expect(getProjectPolicy(proj.toUpperCase(), file)).toEqual(['a']);
    } else {
      expect(getProjectPolicy(proj.toUpperCase(), file)).toBeUndefined();
    }
  });

  it('deletes the policy when ids are empty', async () => {
    const proj = path.join(dir, 'proj');
    await upsertAccount(claude('a'), filePath);
    await setProjectPolicy(proj, ['a'], filePath);
    await setProjectPolicy(proj, [], filePath);
    expect(getProjectPolicy(proj, await readAccounts(filePath))).toBeUndefined();
  });

  it('collapses duplicate ids', async () => {
    const proj = path.join(dir, 'proj');
    await upsertAccount(claude('a'), filePath);
    await upsertAccount(claude('b'), filePath);
    await setProjectPolicy(proj, ['b', 'a', 'b', 'a'], filePath);
    expect(getProjectPolicy(proj, await readAccounts(filePath))).toEqual(['b', 'a']);
  });
});

describe('pickAccount', () => {
  const now = new Date(2026, 10, 12, 15, 0);
  const proj = path.join(os.tmpdir(), 'pick-proj');
  const policyFor = (ids: string[]) => ({ [normalizePath(proj)]: ids });

  it('honours policy order', () => {
    const file: AccountsFile = { accounts: [claude('a'), claude('b')], projects: policyFor(['b', 'a']) };
    expect(pickAccount(file, proj, 'claude', now)).toEqual({ account: claude('b'), hasPolicy: true });
  });

  it('skips a limited account', () => {
    const until = new Date(2026, 10, 12, 19, 30).toISOString();
    const file: AccountsFile = {
      accounts: [claude('a', { limitedUntil: until }), claude('b')],
      projects: policyFor(['a', 'b']),
    };
    expect(pickAccount(file, proj, 'claude', now).account.id).toBe('b');
  });

  it('treats an expired limitedUntil as free', () => {
    const past = new Date(2026, 10, 12, 14, 0).toISOString();
    const file: AccountsFile = { accounts: [claude('a', { limitedUntil: past }), claude('b')], projects: policyFor(['a', 'b']) };
    expect(pickAccount(file, proj, 'claude', now).account.id).toBe('a');
  });

  it('returns the first account of the provider with hasPolicy false when there is no policy', () => {
    const file: AccountsFile = { accounts: [gemini('g'), claude('a'), claude('b')], projects: {} };
    expect(pickAccount(file, proj, 'claude', now)).toEqual({ account: claude('a'), hasPolicy: false });
  });

  it('throws naming reset times when all are limited', () => {
    const u1 = new Date(2026, 10, 12, 19, 30).toISOString();
    const u2 = new Date(2026, 10, 12, 21, 0).toISOString();
    const file: AccountsFile = {
      accounts: [claude('a', { limitedUntil: u1 }), claude('b', { limitedUntil: u2 })],
      projects: {},
    };
    expect(() => pickAccount(file, proj, 'claude', now)).toThrow(new RegExp(`a until ${u1}.*b until ${u2}`));
  });

  it('throws when the policy has no account of the requested provider', () => {
    const file: AccountsFile = { accounts: [claude('a'), gemini('g')], projects: policyFor(['a']) };
    expect(() => pickAccount(file, proj, 'gemini', now)).toThrow(/no gemini account allowed/);
  });
});

describe('parseClockTime', () => {
  const now = new Date(2026, 10, 12, 15, 0);

  it('reads 7:30pm as today 19:30', () => {
    expect(parseClockTime('7:30pm', now)).toEqual(new Date(2026, 10, 12, 19, 30));
  });

  it('rolls 11am to tomorrow because it already passed', () => {
    expect(parseClockTime('11am', now)).toEqual(new Date(2026, 10, 13, 11, 0));
  });

  it('reads 12pm as noon (tomorrow here, since noon already passed)', () => {
    const t = parseClockTime('12pm', now)!;
    expect(t.getHours()).toBe(12);
    expect(t).toEqual(new Date(2026, 10, 13, 12, 0));
  });

  it('reads 12am as 00:00 the next day', () => {
    expect(parseClockTime('12am', now)).toEqual(new Date(2026, 10, 13, 0, 0));
  });

  it('returns undefined when there is no clock time', () => {
    expect(parseClockTime('soon', now)).toBeUndefined();
  });
});

describe('parseUntil', () => {
  const now = new Date(2026, 10, 12, 15, 0);

  it('round-trips an ISO string', () => {
    const iso = '2026-11-12T19:30:00.000Z';
    expect(parseUntil(iso, now).toISOString()).toBe(iso);
  });

  it('accepts a clock string', () => {
    expect(parseUntil('7:30pm', now)).toEqual(new Date(2026, 10, 12, 19, 30));
  });

  it('throws on garbage', () => {
    expect(() => parseUntil('whenever', now)).toThrow(/cannot read 'whenever'/);
  });
});

describe('parseLimitLine', () => {
  const now = new Date(2026, 10, 12, 15, 0);

  it('reads the real limit line', () => {
    const line = 'Usage limit reached · continuing automatically at 7:30pm · esc to cancel';
    expect(parseLimitLine(line, now)).toEqual(new Date(2026, 10, 12, 19, 30));
  });

  it('falls back to now + 5h when no time is given', () => {
    expect(parseLimitLine('Usage limit reached', now)!.getTime()).toBe(now.getTime() + DEFAULT_LIMIT_MS);
  });

  it('returns undefined for an unrelated line', () => {
    expect(parseLimitLine('Compacting conversation at 7:30pm', now)).toBeUndefined();
  });
});

describe('observeTranscript', () => {
  const now = new Date(2026, 10, 12, 15, 0);
  const LIMIT = 'Usage limit reached · continuing automatically at 7:30pm · esc to cancel';
  let configDir: string;
  let transcript: string;
  let env: NodeJS.ProcessEnv;

  const writeTranscript = (ageMs: number) => {
    const notice = { type: 'system', subtype: 'informational', content: LIMIT, timestamp: new Date(now.getTime() - ageMs).toISOString() };
    fs.writeFileSync(
      transcript,
      [
        JSON.stringify({ type: 'user', message: { content: 'hi' } }),
        JSON.stringify({ type: 'assistant', message: { content: 'hello' } }),
        'not json at all',
        JSON.stringify(notice),
      ].join('\n') + '\n'
    );
  };

  beforeEach(async () => {
    configDir = path.join(dir, 'cfg');
    transcript = path.join(dir, 'transcript.jsonl');
    env = { CLAUDE_CONFIG_DIR: configDir };
    await writeAccounts({ accounts: [claude('work', { configDir })], projects: {} }, filePath);
  });

  it('marks the account whose configDir matches and returns it', async () => {
    writeTranscript(60_000);
    const limitedUntil = new Date(2026, 10, 12, 19, 30).toISOString();
    expect(await observeTranscript(transcript, filePath, env, now)).toEqual({ id: 'work', limitedUntil });
    expect((await readAccounts(filePath)).accounts[0].limitedUntil).toBe(limitedUntil);
  });

  it('ignores a notice older than 6 hours', async () => {
    writeTranscript(7 * 60 * 60 * 1000);
    expect(await observeTranscript(transcript, filePath, env, now)).toBeUndefined();
    expect((await readAccounts(filePath)).accounts[0].limitedUntil).toBeUndefined();
  });

  it('returns undefined for an unknown config dir', async () => {
    writeTranscript(60_000);
    const other = { CLAUDE_CONFIG_DIR: path.join(dir, 'elsewhere') };
    expect(await observeTranscript(transcript, filePath, other, now)).toBeUndefined();
    expect((await readAccounts(filePath)).accounts[0].limitedUntil).toBeUndefined();
  });

  it('returns undefined for a missing transcript', async () => {
    expect(await observeTranscript(path.join(dir, 'nope.jsonl'), filePath, env, now)).toBeUndefined();
  });

  it('does not move limitedUntil backwards', async () => {
    writeTranscript(60_000);
    const first = await observeTranscript(transcript, filePath, env, now);
    const second = await observeTranscript(transcript, filePath, env, now);
    expect(second).toEqual(first);

    const later = new Date(2026, 10, 12, 23, 0).toISOString();
    await writeAccounts({ accounts: [claude('work', { configDir, limitedUntil: later })], projects: {} }, filePath);
    expect(await observeTranscript(transcript, filePath, env, now)).toEqual({ id: 'work', limitedUntil: later });
    expect((await readAccounts(filePath)).accounts[0].limitedUntil).toBe(later);
  });
});

describe('currentAccount', () => {
  it('falls back to <homeDir>/.claude when CLAUDE_CONFIG_DIR is unset', () => {
    const home = path.join(dir, 'home');
    const file: AccountsFile = {
      accounts: [claude('other', { configDir: path.join(dir, 'x') }), claude('default', { configDir: path.join(home, '.claude') })],
      projects: {},
    };
    expect(currentAccount(file, {}, home)?.id).toBe('default');
  });

  it('matches a configDir written with the other slash style', () => {
    const cfg = path.join(dir, 'cfg');
    const file: AccountsFile = { accounts: [claude('a', { configDir: cfg.replace(/\\/g, '/') + '/' })], projects: {} };
    expect(currentAccount(file, { CLAUDE_CONFIG_DIR: cfg }, dir)?.id).toBe('a');
  });

  it('ignores non-claude accounts', () => {
    const cfg = path.join(dir, 'cfg');
    const file: AccountsFile = { accounts: [gemini('g', { configDir: cfg })], projects: {} };
    expect(currentAccount(file, { CLAUDE_CONFIG_DIR: cfg }, dir)).toBeUndefined();
  });
});

describe('discoverClaudeAccounts', () => {
  let root: string;
  let home: string;

  const writeProfile = (name: string, json?: string) => {
    const home = path.join(root, name, 'home');
    fs.mkdirSync(home, { recursive: true });
    if (json !== undefined) fs.writeFileSync(path.join(home, '.claude.json'), json);
  };

  beforeEach(() => {
    root = path.join(dir, 'profiles');
    home = path.join(dir, 'userhome');
    fs.mkdirSync(home, { recursive: true });
  });

  it('finds profiles and the plain home account, tolerating duplicate keys', async () => {
    // duplicate "D:/x" / "D:/x" keys, as Claude writes when paths differ by case
    writeProfile(
      'aaaa1111-0000',
      '{"projects":{"D:/x":{"n":1},"D:/x":{"n":2}},"oauthAccount":{"emailAddress":"someone@gmail.com","organizationName":"Me"}}'
    );
    writeProfile('bbbb2222-0000', JSON.stringify({ oauthAccount: { emailAddress: 'dev@acme-corp.com' } }));
    writeProfile('cccc3333-0000'); // no .claude.json
    // the plain layout keeps the state file beside ~/.claude, not inside it
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'me@example.org' } }));

    const found = await discoverClaudeAccounts(root, home);

    expect(found).toEqual([
      { id: 'someone', configDir: path.join(root, 'aaaa1111-0000', 'home'), email: 'someone@gmail.com', org: 'Me' },
      { id: 'acme-corp', configDir: path.join(root, 'bbbb2222-0000', 'home'), email: 'dev@acme-corp.com', org: undefined },
      { id: 'default', configDir: path.join(home, '.claude'), email: 'me@example.org', org: undefined },
    ]);
  });

  it('yields only the home account when the profiles root is absent', async () => {
    fs.writeFileSync(path.join(home, '.claude.json'), '{}');
    const found = await discoverClaudeAccounts(path.join(dir, 'no-such-root'), home);
    expect(found.map((a) => a.id)).toEqual(['default']);
  });
});

describe('suggestAccountId', () => {
  it('names a personal account after its mailbox minus trailing digits', () => {
    expect(suggestAccountId('rayhan99@gmail.com', 'fb')).toBe('rayhan');
  });

  it('names a work account after its domain', () => {
    expect(suggestAccountId('x@badr-interactive.com', 'fb')).toBe('badr-interactive');
  });

  it('uses the fallback when there is no email', () => {
    expect(suggestAccountId(undefined, 'fb')).toBe('fb');
  });
});

describe('maskEmail', () => {
  it('masks the mailbox', () => {
    expect(maskEmail('rayhan@gmail.com')).toBe('r***@gmail.com');
  });
});

describe('resolveAccountEnv', () => {
  it('reads $NAME from the passed env and passes literals through', () => {
    const a = gemini('g', { env: { GEMINI_API_KEY: '$MY_KEY', MODEL: 'flash' } });
    expect(resolveAccountEnv(a, { MY_KEY: 'secret' })).toEqual({ GEMINI_API_KEY: 'secret', MODEL: 'flash' });
  });

  it('throws naming the missing var', () => {
    const a = gemini('g', { env: { GEMINI_API_KEY: '$MY_KEY' } });
    expect(() => resolveAccountEnv(a, {})).toThrow(/MY_KEY/);
  });
});

describe('installHooks', () => {
  let settings: string;

  beforeEach(() => {
    settings = path.join(dir, 'claude', 'settings.json');
  });

  it('creates a missing file with the three hook events', async () => {
    expect(await installHooks(settings)).toBe('added');
    const parsed = JSON.parse(fs.readFileSync(settings, 'utf8'));
    expect(Object.keys(parsed.hooks).sort()).toEqual(Object.keys(HOOK_COMMANDS).sort());
    for (const [event, command] of Object.entries(HOOK_COMMANDS)) {
      expect(parsed.hooks[event]).toEqual([{ hooks: [{ type: 'command', command, timeout: 15 }] }]);
    }
  });

  it('keeps unrelated top-level keys and existing hook entries', async () => {
    const other = { hooks: [{ type: 'command', command: 'echo hi' }] };
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    fs.writeFileSync(settings, JSON.stringify({ theme: 'dark', hooks: { SessionStart: [other] } }));

    expect(await installHooks(settings)).toBe('added');

    const parsed = JSON.parse(fs.readFileSync(settings, 'utf8'));
    expect(parsed.theme).toBe('dark');
    expect(parsed.hooks.SessionStart).toHaveLength(2);
    expect(parsed.hooks.SessionStart[0]).toEqual(other);
    expect(parsed.hooks.SessionStart[1].hooks[0].command).toBe(HOOK_COMMANDS.SessionStart);
    expect(Object.keys(parsed.hooks).sort()).toEqual(['Notification', 'SessionStart', 'Stop']);
  });

  it('is idempotent: a second run returns unchanged and leaves bytes identical', async () => {
    await installHooks(settings);
    const before = fs.readFileSync(settings);
    expect(await installHooks(settings)).toBe('unchanged');
    expect(fs.readFileSync(settings).equals(before)).toBe(true);
  });

  it('throws on a corrupt file and leaves it untouched', async () => {
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    fs.writeFileSync(settings, '{broken');
    await expect(installHooks(settings)).rejects.toThrow(/refusing to rewrite/);
    expect(fs.readFileSync(settings, 'utf8')).toBe('{broken');
  });
});

describe('accountsPath', () => {
  it('resolves under ~/.raygent', () => {
    expect(accountsPath()).toBe(path.join(os.homedir(), '.raygent', 'accounts.json'));
  });
});
