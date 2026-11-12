import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

// AI accounts and the per-project policy that says which of them a project
// may use, in fallback order. Claude accounts are plain CLAUDE_CONFIG_DIR
// folders that are already logged in, so no token ever lands in this file.
// Gemini accounts carry env var *names* ($GEMINI_API_KEY); the value is read
// from the process environment at launch.

export type AccountProvider = 'claude' | 'gemini';
export const ACCOUNT_PROVIDERS: AccountProvider[] = ['claude', 'gemini'];

export interface Account {
  id: string;
  provider: AccountProvider;
  configDir?: string;
  env?: Record<string, string>;
  email?: string;
  org?: string;
  limitedUntil?: string;
}

export interface AccountsFile {
  accounts: Account[];
  projects: Record<string, string[]>;
}

export function accountsPath(): string {
  return path.join(os.homedir(), '.raygent', 'accounts.json');
}

// Policy keys and configDir comparisons must survive `D:\x\` vs `d:/x`.
export function normalizePath(p: string): string {
  let resolved = path.resolve(p);
  if (resolved.length > 1) resolved = resolved.replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isAccount(value: unknown): value is Account {
  if (value === null || typeof value !== 'object') return false;
  const a = value as Account;
  return typeof a.id === 'string' && ACCOUNT_PROVIDERS.includes(a.provider);
}

export async function readAccounts(filePath: string = accountsPath()): Promise<AccountsFile> {
  const empty: AccountsFile = { accounts: [], projects: {} };
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return empty;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return empty;
    const file = parsed as Partial<AccountsFile>;
    const accounts = Array.isArray(file.accounts) ? file.accounts.filter(isAccount) : [];
    const projects: Record<string, string[]> = {};
    if (file.projects && typeof file.projects === 'object' && !Array.isArray(file.projects)) {
      for (const [key, ids] of Object.entries(file.projects)) {
        if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) projects[key] = ids;
      }
    }
    return { accounts, projects };
  } catch {
    return empty;
  }
}

export async function writeAccounts(file: AccountsFile, filePath: string = accountsPath()): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(file, null, 2) + '\n');
}

export async function upsertAccount(entry: Account, filePath: string = accountsPath()): Promise<void> {
  const file = await readAccounts(filePath);
  const existing = file.accounts.findIndex((a) => a.id === entry.id);
  if (existing >= 0) {
    file.accounts[existing] = { ...file.accounts[existing], ...entry };
  } else {
    file.accounts.push(entry);
  }
  await writeAccounts(file, filePath);
}

export async function removeAccount(id: string, filePath: string = accountsPath()): Promise<boolean> {
  const file = await readAccounts(filePath);
  const before = file.accounts.length;
  file.accounts = file.accounts.filter((a) => a.id !== id);
  if (file.accounts.length === before) return false;
  for (const [key, ids] of Object.entries(file.projects)) {
    const kept = ids.filter((x) => x !== id);
    if (kept.length === 0) delete file.projects[key];
    else file.projects[key] = kept;
  }
  await writeAccounts(file, filePath);
  return true;
}

export function getProjectPolicy(projectPath: string, file: AccountsFile): string[] | undefined {
  return file.projects[normalizePath(projectPath)];
}

export async function setProjectPolicy(
  projectPath: string,
  ids: string[],
  filePath: string = accountsPath()
): Promise<void> {
  const file = await readAccounts(filePath);
  for (const id of ids) {
    if (!file.accounts.some((a) => a.id === id)) {
      throw new Error(`unknown account '${id}' (registered: ${file.accounts.map((a) => a.id).join(', ') || 'none'})`);
    }
  }
  const key = normalizePath(projectPath);
  if (ids.length === 0) delete file.projects[key];
  else file.projects[key] = [...new Set(ids)];
  await writeAccounts(file, filePath);
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

export function describeAccount(a: Account): string {
  const who = a.email ? maskEmail(a.email) : a.org ?? a.configDir ?? Object.keys(a.env ?? {}).join(',');
  return `${a.id} (${a.provider}${who ? `, ${who}` : ''})`;
}

export interface DiscoveredAccount {
  id: string;
  configDir: string;
  email?: string;
  org?: string;
}

const PUBLIC_MAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com']);

// A work account is named after its domain, a personal one after its mailbox.
export function suggestAccountId(email: string | undefined, fallback: string): string {
  if (!email || !email.includes('@')) return fallback;
  const [local, domain] = email.toLowerCase().split('@');
  const base = PUBLIC_MAIL.has(domain) ? local.replace(/\d+$/, '') : domain.split('.')[0];
  return base.replace(/[^a-z0-9-]+/g, '-') || fallback;
}

async function readClaudeIdentity(stateFile: string): Promise<{ email?: string; org?: string } | undefined> {
  let raw: string;
  try {
    raw = await fs.readFile(stateFile, 'utf8');
  } catch {
    return undefined;
  }
  try {
    // .claude.json can hold duplicate keys (project paths differing by case);
    // JSON.parse keeps the last one, which is fine for the account block.
    const parsed = JSON.parse(raw) as { oauthAccount?: { emailAddress?: string; organizationName?: string } };
    const acct = parsed.oauthAccount ?? {};
    return {
      email: typeof acct.emailAddress === 'string' ? acct.emailAddress : undefined,
      org: typeof acct.organizationName === 'string' ? acct.organizationName : undefined,
    };
  } catch {
    return {};
  }
}

export function defaultOrcaProfilesRoot(): string {
  const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'orca', 'claude-profiles');
}

export async function discoverClaudeAccounts(
  profilesRoot: string = defaultOrcaProfilesRoot(),
  homeDir: string = os.homedir()
): Promise<DiscoveredAccount[]> {
  const found: DiscoveredAccount[] = [];
  let profiles: string[] = [];
  try {
    profiles = (await fs.readdir(profilesRoot, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    // no Orca on this machine
  }
  for (const name of profiles.sort()) {
    const configDir = path.join(profilesRoot, name, 'home');
    const identity = await readClaudeIdentity(path.join(configDir, '.claude.json'));
    if (!identity) continue;
    found.push({ id: suggestAccountId(identity.email, name.slice(0, 8)), configDir, ...identity });
  }
  // Without CLAUDE_CONFIG_DIR the state file sits beside ~/.claude, not inside it.
  const plainIdentity = await readClaudeIdentity(path.join(homeDir, '.claude.json'));
  if (plainIdentity) found.push({ id: 'default', configDir: path.join(homeDir, '.claude'), ...plainIdentity });
  return found;
}

export function currentAccount(
  file: AccountsFile,
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = os.homedir()
): Account | undefined {
  const dir = normalizePath(env.CLAUDE_CONFIG_DIR ?? path.join(homeDir, '.claude'));
  return file.accounts.find((a) => a.provider === 'claude' && a.configDir !== undefined && normalizePath(a.configDir) === dir);
}

export function isLimited(a: Account, now: Date = new Date()): boolean {
  if (!a.limitedUntil) return false;
  const until = Date.parse(a.limitedUntil);
  return Number.isFinite(until) && until > now.getTime();
}

export interface PickedAccount {
  account: Account;
  hasPolicy: boolean;
}

export function pickAccount(
  file: AccountsFile,
  projectPath: string,
  provider: AccountProvider,
  now: Date = new Date()
): PickedAccount {
  const policy = getProjectPolicy(projectPath, file);
  const candidates = policy
    ? policy.map((id) => file.accounts.find((a) => a.id === id)).filter((a): a is Account => a !== undefined && a.provider === provider)
    : file.accounts.filter((a) => a.provider === provider);
  if (candidates.length === 0) {
    throw new Error(
      policy
        ? `no ${provider} account allowed for ${projectPath} (policy: ${policy.join(', ')})`
        : `no ${provider} account registered (run: raygent accounts discover)`
    );
  }
  const account = candidates.find((a) => !isLimited(a, now));
  if (!account) {
    throw new Error(
      `every allowed ${provider} account is limited: ${candidates.map((a) => `${a.id} until ${a.limitedUntil}`).join(', ')}`
    );
  }
  return { account, hasPolicy: policy !== undefined };
}

const CLOCK_RE = /(\d{1,2})(?::(\d{2}))?\s*([ap]m)\b/i;

// "7:30pm" means the next 7:30pm in local time.
export function parseClockTime(text: string, now: Date = new Date()): Date | undefined {
  const m = CLOCK_RE.exec(text);
  if (!m) return undefined;
  let hours = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') hours += 12;
  const t = new Date(now);
  t.setHours(hours, Number(m[2] ?? 0), 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t;
}

export function parseUntil(text: string, now: Date = new Date()): Date {
  const iso = Date.parse(text);
  if (Number.isFinite(iso)) return new Date(iso);
  const clock = parseClockTime(text, now);
  if (clock) return clock;
  throw new Error(`cannot read '${text}' as a time (use ISO 8601 or e.g. 7:30pm)`);
}

export const DEFAULT_LIMIT_MS = 5 * 60 * 60 * 1000;

// Claude Code writes "Usage limit reached · continuing automatically at 7:30pm"
// into the transcript. Without a time, assume the usual 5-hour window.
export function parseLimitLine(content: string, now: Date = new Date()): Date | undefined {
  if (!/usage limit reached/i.test(content)) return undefined;
  return parseClockTime(content, now) ?? new Date(now.getTime() + DEFAULT_LIMIT_MS);
}

export async function markLimited(
  id: string,
  until: Date | undefined,
  filePath: string = accountsPath()
): Promise<Account> {
  const file = await readAccounts(filePath);
  const account = file.accounts.find((a) => a.id === id);
  if (!account) throw new Error(`unknown account '${id}'`);
  if (until) account.limitedUntil = until.toISOString();
  else delete account.limitedUntil;
  await writeAccounts(file, filePath);
  return account;
}

const TRANSCRIPT_TAIL_LINES = 200;
const LIMIT_LINE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface ObservedLimit {
  id: string;
  limitedUntil: string;
}

// Hook target. Reads the end of a session transcript and, when the newest
// limit notice is recent, marks the account the session runs under.
export async function observeTranscript(
  transcriptPath: string,
  filePath: string = accountsPath(),
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date()
): Promise<ObservedLimit | undefined> {
  let raw: string;
  try {
    raw = await fs.readFile(transcriptPath, 'utf8');
  } catch {
    return undefined;
  }
  const lines = raw.split('\n').slice(-TRANSCRIPT_TAIL_LINES);
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry: { type?: string; content?: unknown; timestamp?: string };
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (entry.type !== 'system' || typeof entry.content !== 'string') continue;
    const until = parseLimitLine(entry.content, now);
    if (!until) continue;
    const ts = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
    // An old notice would re-mark a window that already reset.
    if (Number.isFinite(ts) && now.getTime() - ts > LIMIT_LINE_MAX_AGE_MS) return undefined;
    const file = await readAccounts(filePath);
    const account = currentAccount(file, env);
    if (!account) return undefined;
    if (account.limitedUntil && Date.parse(account.limitedUntil) >= until.getTime()) {
      return { id: account.id, limitedUntil: account.limitedUntil };
    }
    account.limitedUntil = until.toISOString();
    await writeAccounts(file, filePath);
    return { id: account.id, limitedUntil: account.limitedUntil };
  }
  return undefined;
}

export function resolveAccountEnv(a: Account, env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(a.env ?? {})) {
    if (value.startsWith('$')) {
      const name = value.slice(1);
      const resolved = env[name];
      if (resolved === undefined) throw new Error(`account '${a.id}' needs env var ${name}, which is not set`);
      out[key] = resolved;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export const HOOK_COMMANDS: Record<string, string> = {
  SessionStart: 'raygent accounts check --hook',
  Stop: 'raygent accounts observe',
  Notification: 'raygent accounts observe',
};

interface HookCommand {
  type: string;
  command: string;
  timeout?: number;
}

interface HookEntry {
  hooks?: HookCommand[];
}

// Merges the raygent hooks into a Claude Code settings.json, keeping every
// other key. A file that does not parse is left alone: overwriting it would
// drop whatever the user (or Orca) put there.
export async function installHooks(settingsPath: string): Promise<'added' | 'unchanged'> {
  let settings: { hooks?: Record<string, HookEntry[]> } & Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${settingsPath} is not a JSON object`);
    }
    settings = parsed as typeof settings;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`refusing to rewrite ${settingsPath}: ${(err as Error).message}`);
    }
  }
  const hooks = (settings.hooks ??= {});
  let changed = false;
  for (const [event, command] of Object.entries(HOOK_COMMANDS)) {
    const entries = (hooks[event] ??= []);
    const present = entries.some((e) => (e.hooks ?? []).some((h) => h.command === command));
    if (present) continue;
    entries.push({ hooks: [{ type: 'command', command, timeout: 15 }] });
    changed = true;
  }
  if (!changed) return 'unchanged';
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return 'added';
}
