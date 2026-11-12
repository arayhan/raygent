import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { accountsPath, normalizePath, readAccounts, writeAccounts, type Account, type AccountsFile } from './accounts.js';

// Multi-laptop sync. Three things travel:
//   - ~/raygent-brain (memory, instructions, hosts maps) through its own git remote;
//   - account policies, translated between ~/.raygent/accounts.json (absolute
//     paths, this laptop's config dirs) and slug-keyed files inside that repo;
//   - Claude Code transcripts, by rsync to a VPS folder per project slug, so a
//     session started on one laptop resumes on another even when the project
//     sits at a different path there.

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}
export type Runner = (cmd: string, args: string[]) => Promise<RunResult>;

// Never rejects: callers decide what a non-zero exit means.
export const defaultRunner: Runner = (cmd, args) =>
  new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      const e = err as (Error & { code?: number | string }) | null;
      // A string code (ENOENT) means the command never ran.
      const code = !e ? 0 : typeof e.code === 'number' ? e.code : 1;
      resolve({ code, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') || (e && typeof e.code !== 'number' ? e.message : '') });
    });
  });

export type RsyncFlavour = 'wsl' | 'native';

export interface SessionsConfig {
  host: string;
  key?: string;
  dir: string;
  keepDays?: number;
  rsync?: RsyncFlavour;
}

export interface SyncConfig {
  sessions?: SessionsConfig;
}

export type SharedAccount = Omit<Account, 'configDir'>;

export interface SharedAccounts {
  accounts: SharedAccount[];
  projects: Record<string, string[]>;
}

// What the shared file held after the last sync. A side that still matches it
// did not change, so the other side's value wins; a side that differs was edited.
export interface KnownShared {
  accounts: Record<string, SharedAccount>;
  policies: Record<string, string[]>;
}

export interface PhaseResult {
  phase: string;
  ok: boolean;
  detail: string;
}

export interface SyncState {
  lastRun?: string;
  lastOk?: boolean;
  phases?: PhaseResult[];
  // Per local folder name, so a project mapped later still gets its first push.
  pushed?: Record<string, number>;
  known?: KnownShared;
}

export interface SyncPaths {
  repo: string;
  host: string;
  accountsFile: string;
  statePath: string;
  lockPath: string;
  projectsRoot: string;
}

export function defaultSyncPaths(env: NodeJS.ProcessEnv = process.env): SyncPaths {
  const home = os.homedir();
  const raygentDir = path.dirname(accountsPath());
  return {
    repo: env.RAYGENT_BRAIN_DIR ?? path.join(home, 'raygent-brain'),
    host: env.COMPUTERNAME ?? os.hostname(),
    accountsFile: accountsPath(),
    statePath: path.join(raygentDir, 'sync-state.json'),
    lockPath: path.join(raygentDir, 'sync.lock'),
    // Every Orca profile links its projects/ here, so one folder covers all accounts.
    projectsRoot: env.RAYGENT_CLAUDE_PROJECTS ?? path.join(home, '.claude', 'projects'),
  };
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '')) as T;
  } catch {
    return fallback;
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])])
    );
  }
  return value;
}

export function stable(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0] ?? '';
}

// ---------------------------------------------------------------- sessions

// Claude Code names a project's transcript folder after its cwd this way.
export function sessionKey(projectPath: string): string {
  return projectPath.replace(/[^A-Za-z0-9]/g, '-');
}

// The folder name keeps the case of the cwd Claude was started with; on a
// case-sensitive disk `D--x` and `d--x` can both exist for one project.
export async function localProjectDirs(projectsRoot: string, key: string): Promise<{ primary: string; existing: string[] }> {
  let names: string[] = [];
  try {
    names = await fs.readdir(projectsRoot);
  } catch {
    // no sessions on this laptop yet
  }
  const lower = key.toLowerCase();
  return {
    primary: path.join(projectsRoot, key),
    existing: names
      .filter((n) => n.toLowerCase() === lower)
      .sort()
      .map((n) => path.join(projectsRoot, n)),
  };
}

// memory/ is a junction into raygent-brain (git carries it); the index holds
// absolute paths of the laptop that wrote it.
const SKIP = new Set(['memory', 'sessions-index.json']);

export async function newestMtime(dir: string): Promise<number> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let newest = 0;
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) newest = Math.max(newest, await newestMtime(p));
    else if (e.isFile()) newest = Math.max(newest, (await fs.stat(p)).mtimeMs);
  }
  return newest;
}

export interface RemoteFile {
  path: string;
  mtime: number; // whole seconds
}

// `find -printf '%P\t%T@\n'` run inside the sessions dir: `<slug>/<file>\t<epoch>`.
export function parseListing(stdout: string): Map<string, RemoteFile[]> {
  const bySlug = new Map<string, RemoteFile[]>();
  for (const line of stdout.split(/\r?\n/)) {
    const [rel, t] = line.split('\t');
    const cut = rel?.indexOf('/') ?? -1;
    const mtime = Math.floor(Number(t));
    if (!rel || cut <= 0 || !Number.isFinite(mtime)) continue;
    const slug = rel.slice(0, cut);
    const list = bySlug.get(slug) ?? [];
    list.push({ path: rel.slice(cut + 1), mtime });
    bySlug.set(slug, list);
  }
  return bySlug;
}

// Remote files missing locally or newer than the local copy. Compared against
// the files themselves, not a stored timestamp: a file another laptop pushes
// late keeps its old mtime and would slip under any "last pull" mark.
export async function filesToPull(localDir: string, remote: RemoteFile[]): Promise<string[]> {
  const needed: string[] = [];
  for (const f of remote) {
    try {
      const st = await fs.stat(path.join(localDir, f.path));
      if (Math.floor(st.mtimeMs / 1000) < f.mtime) needed.push(f.path);
    } catch {
      needed.push(f.path);
    }
  }
  return needed;
}

export function expandHome(p: string): string {
  return p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? path.join(os.homedir(), p.slice(1)) : p;
}

export function rsyncFlavour(cfg: SessionsConfig, platform: NodeJS.Platform = process.platform): RsyncFlavour {
  return cfg.rsync ?? (platform === 'win32' ? 'wsl' : 'native');
}

// Windows has no rsync of its own: WSL's sees C:\ as /mnt/c, cwRsync as /cygdrive/c.
export function toRsyncPath(p: string, flavour: RsyncFlavour, platform: NodeJS.Platform = process.platform): string {
  if (platform !== 'win32') return p;
  const m = /^([A-Za-z]):[\\/]?(.*)$/.exec(p);
  if (!m) return p.replace(/\\/g, '/');
  return `${flavour === 'wsl' ? '/mnt' : '/cygdrive'}/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`;
}

const WINDOWS_SSH = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe';

export function sshCommand(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' && existsSync(WINDOWS_SSH) ? WINDOWS_SSH : 'ssh';
}

function sshOptions(cfg: SessionsConfig): string[] {
  return [...(cfg.key ? ['-i', expandHome(cfg.key)] : []), '-o', 'BatchMode=yes'];
}

// The ssh rsync runs as its transport. From WSL it is still the Windows
// OpenSSH, so the Windows key and known_hosts apply and nothing is copied into WSL.
export function rsyncSsh(cfg: SessionsConfig, flavour: RsyncFlavour, platform: NodeJS.Platform = process.platform): string {
  const key = cfg.key ? expandHome(cfg.key) : undefined;
  if (platform !== 'win32') return ['ssh', ...(key ? ['-i', key] : []), '-o', 'BatchMode=yes'].join(' ');
  const exe = flavour === 'wsl' ? '/mnt/c/Windows/System32/OpenSSH/ssh.exe' : 'ssh';
  const keyArg = key ? (flavour === 'wsl' ? key.replace(/\\/g, '/') : toRsyncPath(key, flavour, platform)) : undefined;
  const quoted = keyArg && /\s/.test(keyArg) ? `"${keyArg}"` : keyArg;
  return [exe, ...(quoted ? ['-i', quoted] : []), '-o', 'BatchMode=yes'].join(' ');
}

export function remoteDir(cfg: SessionsConfig): string {
  return cfg.dir.replace(/\/+$/, '');
}

export function rsyncArgs(
  kind: 'push' | 'pull',
  cfg: SessionsConfig,
  slug: string,
  localDir: string,
  platform: NodeJS.Platform = process.platform,
  listFile?: string
): string[] {
  const flavour = rsyncFlavour(cfg, platform);
  const remote = `${cfg.host}:${remoteDir(cfg)}/${slug}/`;
  const local = toRsyncPath(localDir, flavour, platform).replace(/\/?$/, '/');
  // --update: the newer copy of a transcript wins whole; never --delete, Claude purges old ones itself.
  const base = ['-rt', '--update', '-e', rsyncSsh(cfg, flavour, platform)];
  if (kind === 'push') return [...base, '--exclude', 'memory', '--exclude', 'sessions-index.json', local, remote];
  if (!listFile) throw new Error('pull needs a file list');
  return [...base, '--files-from', toRsyncPath(listFile, flavour, platform), remote, local];
}

export function rsyncInvocation(cfg: SessionsConfig, args: string[], platform: NodeJS.Platform = process.platform): { cmd: string; args: string[] } {
  return rsyncFlavour(cfg, platform) === 'wsl' ? { cmd: 'wsl', args: ['-e', 'rsync', ...args] } : { cmd: 'rsync', args };
}

export async function remoteListing(cfg: SessionsConfig, run: Runner, platform: NodeJS.Platform = process.platform): Promise<Map<string, RemoteFile[]>> {
  const dir = remoteDir(cfg);
  // Only recent files come back: older ones were purged locally on purpose.
  const script = `mkdir -p '${dir}' && cd '${dir}' && find . -type f -mtime -${cfg.keepDays ?? 30} -printf '%P\\t%T@\\n'`;
  const r = await run(sshCommand(platform), [...sshOptions(cfg), cfg.host, script]);
  if (r.code !== 0) throw new Error(`ssh ${cfg.host}: ${firstLine(r.stderr) || `exit ${r.code}`}`);
  return parseListing(r.stdout);
}

export interface SessionsDeps {
  run: Runner;
  now: () => Date;
  platform: NodeJS.Platform;
  dryRun?: boolean;
  tmpDir?: string;
}

export async function syncSessions(
  cfg: SessionsConfig,
  hosts: Record<string, string>,
  projectsRoot: string,
  state: SyncState,
  deps: SessionsDeps
): Promise<string> {
  const { run, platform } = deps;
  const listing = await remoteListing(cfg, run, platform);
  const errors: string[] = [];
  const planned: string[] = [];
  let pulledFiles = 0;
  let pulledDirs = 0;
  const pushStart = deps.now().getTime();

  const rsync = async (args: string[], label: string) => {
    if (deps.dryRun) {
      planned.push(`${label}: rsync ${args.join(' ')}`);
      return true;
    }
    const inv = rsyncInvocation(cfg, args, platform);
    const r = await run(inv.cmd, inv.args);
    if (r.code !== 0) errors.push(`${label}: ${firstLine(r.stderr) || `rsync exit ${r.code}`}`);
    return r.code === 0;
  };

  const slugs = Object.keys(hosts).sort();
  for (const slug of slugs) {
    const remote = listing.get(slug) ?? [];
    if (remote.length === 0) continue;
    const { primary, existing } = await localProjectDirs(projectsRoot, sessionKey(hosts[slug]));
    for (const target of existing.length > 0 ? existing : [primary]) {
      const needed = await filesToPull(target, remote);
      if (needed.length === 0) continue;
      const listFile = path.join(deps.tmpDir ?? os.tmpdir(), `raygent-sync-${slug}-${process.pid}.txt`);
      if (!deps.dryRun) {
        await fs.mkdir(target, { recursive: true });
        await fs.writeFile(listFile, needed.join('\n') + '\n');
      }
      const ok = await rsync(rsyncArgs('pull', cfg, slug, target, platform, listFile), `pull ${slug}`);
      if (!deps.dryRun) await fs.rm(listFile, { force: true });
      if (ok) {
        pulledFiles += needed.length;
        pulledDirs++;
      }
    }
  }

  let pushed = 0;
  const marks = { ...(state.pushed ?? {}) };
  for (const slug of slugs) {
    const { existing } = await localProjectDirs(projectsRoot, sessionKey(hosts[slug]));
    for (const dir of existing) {
      const name = path.basename(dir);
      if ((await newestMtime(dir)) <= (marks[name] ?? 0)) continue;
      // Only a clean push moves a folder's mark; a failed one is retried next run.
      if (await rsync(rsyncArgs('push', cfg, slug, dir, platform), `push ${slug}`)) {
        pushed++;
        marks[name] = pushStart;
      }
    }
  }
  if (!deps.dryRun) state.pushed = marks;

  if (deps.dryRun) return planned.length > 0 ? planned.join('\n') : 'nothing to pull or push';
  if (errors.length > 0) throw new Error(errors.join('; '));
  return `pulled ${pulledFiles} file${pulledFiles === 1 ? '' : 's'} into ${pulledDirs} folder${pulledDirs === 1 ? '' : 's'}, pushed ${pushed} folder${pushed === 1 ? '' : 's'}`;
}

// Transcript folders that no slug maps to on this laptop: they never sync.
// A folder holding only memory or a stale index has nothing to lose, so it is left out.
export async function unmappedProjectDirs(projectsRoot: string, hosts: Record<string, string>): Promise<string[]> {
  const mapped = new Set(Object.values(hosts).map((p) => sessionKey(p).toLowerCase()));
  let names: string[] = [];
  try {
    names = await fs.readdir(projectsRoot);
  } catch {
    return [];
  }
  const unmapped: string[] = [];
  for (const n of names.sort()) {
    if (!mapped.has(n.toLowerCase()) && (await newestMtime(path.join(projectsRoot, n))) > 0) unmapped.push(n);
  }
  return unmapped;
}

// ---------------------------------------------------------------- accounts

export interface MergeResult {
  local: AccountsFile;
  shared: SharedAccounts;
  host: Record<string, string>;
  known: KnownShared;
}

function strip(a: Account): SharedAccount {
  const { configDir: _configDir, ...rest } = a;
  return rest;
}

function sameValue(a: unknown, b: unknown): boolean {
  return b !== undefined && stable(a) === stable(b);
}

// Merges this laptop's accounts.json with the shared one. A side that still
// equals the last synced value did not change, so the other side wins; when
// both changed, this laptop wins. Absent on one side and known before means it
// was removed there. A Claude account with no config dir on this laptop is
// "not logged in here": it stays shared and is left out of the local file.
export function mergeAccounts(
  local: AccountsFile,
  shared: SharedAccounts,
  hostDirs: Record<string, string>,
  hosts: Record<string, string>,
  knownIn: KnownShared
): MergeResult {
  // An empty side means a fresh laptop or a file moved aside, not "delete everything".
  const known: KnownShared = local.accounts.length === 0 || shared.accounts.length === 0 ? { accounts: {}, policies: {} } : knownIn;

  const localById = new Map(local.accounts.map((a) => [a.id, a]));
  const sharedById = new Map(shared.accounts.map((a) => [a.id, a]));
  const order = [...shared.accounts.map((a) => a.id), ...local.accounts.map((a) => a.id).filter((id) => !sharedById.has(id))];
  const outShared: SharedAccount[] = [];
  const outLocal: Account[] = [];

  for (const id of order) {
    const l = localById.get(id);
    const s = sharedById.get(id);
    const k = known.accounts[id];
    if (l && s) {
      const pick = sameValue(strip(l), k) ? s : strip(l);
      outShared.push(pick);
      outLocal.push(l.configDir ? { ...pick, configDir: l.configDir } : pick);
    } else if (s) {
      const configDir = hostDirs[id];
      const wasHere = s.provider !== 'claude' || configDir !== undefined;
      if (k && wasHere) continue; // removed on this laptop
      outShared.push(s);
      if (s.provider !== 'claude') outLocal.push(s);
      else if (configDir) outLocal.push({ ...s, configDir });
    } else if (l) {
      if (k && sameValue(strip(l), k)) continue; // removed on the other laptop, untouched here
      outShared.push(strip(l));
      outLocal.push(l);
    }
  }

  const slugByPath = new Map(Object.entries(hosts).map(([slug, p]) => [normalizePath(p), slug]));
  const localByShared = new Map<string, { localKey: string; ids: string[] }>();
  for (const [localKey, ids] of Object.entries(local.projects)) {
    localByShared.set(slugByPath.get(localKey) ?? localKey, { localKey, ids });
  }
  const sharedProjects: Record<string, string[]> = {};
  const localProjects: Record<string, string[]> = {};
  const keys = [...new Set([...Object.keys(shared.projects), ...localByShared.keys()])].sort();
  for (const key of keys) {
    const l = localByShared.get(key);
    const s = shared.projects[key];
    const k = known.policies[key];
    if (l && s) {
      const pick = sameValue(l.ids, k) ? s : l.ids;
      sharedProjects[key] = pick;
      localProjects[l.localKey] = pick;
    } else if (s) {
      const localKey = hosts[key] !== undefined ? normalizePath(hosts[key]) : undefined;
      if (!localKey) {
        sharedProjects[key] = s; // a project this laptop does not have
        continue;
      }
      if (k) continue; // cleared on this laptop
      sharedProjects[key] = s;
      localProjects[localKey] = s;
    } else if (l) {
      if (k && sameValue(l.ids, k)) continue; // cleared on the other laptop
      sharedProjects[key] = l.ids;
      localProjects[l.localKey] = l.ids;
    }
  }

  const host: Record<string, string> = {};
  for (const a of [...outLocal].sort((x, y) => x.id.localeCompare(y.id))) if (a.configDir) host[a.id] = a.configDir;

  return {
    local: { accounts: outLocal, projects: localProjects },
    shared: { accounts: outShared, projects: sharedProjects },
    host,
    known: { accounts: Object.fromEntries(outShared.map((a) => [a.id, a])), policies: sharedProjects },
  };
}

// A corrupt file must stop the merge: read as empty, it would look like
// "every account was removed" and wipe the other side.
async function readStrict<T>(file: string, fallback: T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
  try {
    return JSON.parse(raw.replace(/^\uFEFF/, '')) as T;
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${(err as Error).message}); fix it before syncing`);
  }
}

export async function syncAccounts(paths: SyncPaths, hosts: Record<string, string>, state: SyncState, dryRun = false): Promise<string> {
  const sharedPath = path.join(paths.repo, 'accounts.json');
  const hostPath = path.join(paths.repo, 'hosts', `${paths.host}.accounts.json`);
  await readStrict(paths.accountsFile, null);
  const local = await readAccounts(paths.accountsFile);
  const sharedRaw = await readStrict<Partial<SharedAccounts>>(sharedPath, {});
  const shared: SharedAccounts = {
    accounts: Array.isArray(sharedRaw.accounts) ? sharedRaw.accounts : [],
    projects: sharedRaw.projects && typeof sharedRaw.projects === 'object' ? sharedRaw.projects : {},
  };
  const hostDirs = await readStrict<Record<string, string>>(hostPath, {});
  const merged = mergeAccounts(local, shared, hostDirs, hosts, state.known ?? { accounts: {}, policies: {} });

  const localChanged = stable(merged.local) !== stable(local);
  if (!dryRun) {
    // Writing only on change keeps the Orca plugin's file watcher quiet.
    if (localChanged) await writeAccounts(merged.local, paths.accountsFile);
    await writeJson(sharedPath, { accounts: merged.shared.accounts.map(sortKeys), projects: merged.shared.projects });
    await writeJson(hostPath, merged.host);
    state.known = merged.known;
  }
  const n = merged.shared.accounts.length;
  const p = Object.keys(merged.shared.projects).length;
  return `${n} account${n === 1 ? '' : 's'}, ${p} polic${p === 1 ? 'y' : 'ies'}; local file ${localChanged ? (dryRun ? 'would change' : 'updated') : 'unchanged'}`;
}

// ---------------------------------------------------------------- git

const SYNCED_ACCOUNTS_FILE = /^(accounts\.json|hosts\/[^/]+\.accounts\.json)$/;

async function git(run: Runner, repo: string, ...args: string[]): Promise<RunResult> {
  return run('git', ['-C', repo, ...args]);
}

async function mustGit(run: Runner, repo: string, ...args: string[]): Promise<RunResult> {
  const r = await git(run, repo, ...args);
  if (r.code !== 0) throw new Error(`git ${args[0]}: ${firstLine(r.stderr) || firstLine(r.stdout) || `exit ${r.code}`}`);
  return r;
}

export async function commitAll(repo: string, host: string, now: Date, run: Runner): Promise<boolean> {
  await mustGit(run, repo, 'add', '-A');
  const status = await mustGit(run, repo, 'status', '--porcelain');
  if (!status.stdout.trim()) return false;
  await mustGit(run, repo, 'commit', '-q', '-m', `sync: ${host} ${now.toISOString()}`);
  return true;
}

async function hasRemote(repo: string, run: Runner): Promise<boolean> {
  return (await git(run, repo, 'remote')).stdout.trim() !== '';
}

async function rebasing(repo: string, run: Runner): Promise<boolean> {
  for (const name of ['rebase-merge', 'rebase-apply']) {
    const p = (await git(run, repo, 'rev-parse', '--git-path', name)).stdout.trim();
    if (p && existsSync(path.isAbsolute(p) ? p : path.join(repo, p))) return true;
  }
  return false;
}

// Commit, then pull --rebase. A conflict in the synced accounts files takes
// upstream's side: the accounts phase re-merges this laptop's state right
// after. Any other conflict (a memory file edited on both laptops) is aborted
// and reported for a human.
export async function gitIn(repo: string, host: string, now: Date, run: Runner): Promise<string> {
  const committed = await commitAll(repo, host, now, run);
  if (!(await hasRemote(repo, run))) return committed ? 'committed (no remote)' : 'clean (no remote)';
  let r = await git(run, repo, 'pull', '--rebase', '--autostash', '-q');
  for (let i = 0; r.code !== 0 && i < 50; i++) {
    const conflicts = (await git(run, repo, 'diff', '--name-only', '--diff-filter=U')).stdout.split(/\r?\n/).filter(Boolean);
    if (conflicts.length === 0) {
      if (!(await rebasing(repo, run))) throw new Error(`git pull: ${firstLine(r.stderr) || `exit ${r.code}`}`);
      // Taking upstream's side can leave a commit empty; there is nothing left to keep.
      r = await git(run, repo, 'rebase', '--skip');
      continue;
    }
    if (!conflicts.every((f) => SYNCED_ACCOUNTS_FILE.test(f))) {
      await git(run, repo, 'rebase', '--abort');
      throw new Error(`rebase conflict, resolve by hand in ${repo}: ${conflicts.join(', ')}`);
    }
    for (const f of conflicts) {
      await mustGit(run, repo, 'checkout', '--ours', '--', f); // during a rebase "ours" is upstream
      await mustGit(run, repo, 'add', '--', f);
    }
    r = await git(run, repo, '-c', 'core.editor=true', 'rebase', '--continue');
  }
  if (r.code !== 0) {
    await git(run, repo, 'rebase', '--abort');
    throw new Error(`git pull: ${firstLine(r.stderr) || `exit ${r.code}`}`);
  }
  return committed ? 'committed and pulled' : 'pulled';
}

export async function gitOut(repo: string, host: string, now: Date, run: Runner): Promise<string> {
  const committed = await commitAll(repo, host, now, run);
  if (!(await hasRemote(repo, run))) return committed ? 'committed (no remote)' : 'clean (no remote)';
  const ahead = await git(run, repo, 'rev-list', '--count', '@{u}..HEAD');
  if (ahead.code !== 0) {
    await mustGit(run, repo, 'push', '-q', '-u', 'origin', 'HEAD');
    return 'pushed (upstream set)';
  }
  const n = Number(ahead.stdout.trim());
  if (n > 0) {
    await mustGit(run, repo, 'push', '-q');
    return `pushed ${n} commit${n === 1 ? '' : 's'}`;
  }
  return 'up to date';
}

// ---------------------------------------------------------------- lock + run

export const LOCK_STALE_MS = 10 * 60 * 1000;

export async function acquireLock(lockPath: string, now: Date = new Date(), staleMs: number = LOCK_STALE_MS): Promise<boolean> {
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  const body = JSON.stringify({ pid: process.pid, at: now.toISOString() });
  try {
    await fs.writeFile(lockPath, body, { flag: 'wx' });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
  const held = await readJson<{ at?: string }>(lockPath, {});
  const at = Date.parse(held.at ?? '');
  if (Number.isFinite(at) && now.getTime() - at < staleMs) return false;
  await fs.writeFile(lockPath, body);
  return true;
}

export async function releaseLock(lockPath: string): Promise<void> {
  await fs.rm(lockPath, { force: true });
}

export interface SyncOptions {
  git: boolean;
  accounts: boolean;
  sessions: boolean;
  dryRun: boolean;
}

export interface SyncDeps {
  paths: SyncPaths;
  run: Runner;
  now: () => Date;
  platform: NodeJS.Platform;
  tmpDir?: string;
}

export function defaultSyncDeps(): SyncDeps {
  return { paths: defaultSyncPaths(), run: defaultRunner, now: () => new Date(), platform: process.platform };
}

export async function runSync(opts: SyncOptions, deps: SyncDeps = defaultSyncDeps()): Promise<PhaseResult[]> {
  const { paths, run } = deps;
  if (!existsSync(paths.repo)) return [{ phase: 'config', ok: false, detail: `${paths.repo} not found` }];
  if (!(await acquireLock(paths.lockPath, deps.now()))) return [{ phase: 'lock', ok: true, detail: 'another sync is running; skipped' }];

  const results: PhaseResult[] = [];
  // Each phase reports its own failure and the rest still run.
  const phase = async (name: string, enabled: boolean, work: () => Promise<string>) => {
    if (!enabled) return;
    try {
      results.push({ phase: name, ok: true, detail: await work() });
    } catch (err) {
      results.push({ phase: name, ok: false, detail: (err as Error).message });
    }
  };

  try {
    const state = await readJson<SyncState>(paths.statePath, {});
    const config = await readJson<SyncConfig>(path.join(paths.repo, 'sync.json'), {});
    const hosts = await readJson<Record<string, string>>(path.join(paths.repo, 'hosts', `${paths.host}.json`), {});
    const live = !opts.dryRun;

    await phase('git', opts.git && opts.dryRun, async () => {
      const status = await mustGit(run, paths.repo, 'status', '--porcelain');
      const changed = status.stdout.split(/\r?\n/).filter(Boolean).length;
      return `${changed} changed file${changed === 1 ? '' : 's'} to commit; ${(await hasRemote(paths.repo, run)) ? 'would pull and push' : 'no remote'}`;
    });
    await phase('git in', opts.git && live, () => gitIn(paths.repo, paths.host, deps.now(), run));
    await phase('accounts', opts.accounts, () => syncAccounts(paths, hosts, state, opts.dryRun));
    await phase('git out', opts.git && live, () => gitOut(paths.repo, paths.host, deps.now(), run));
    await phase('sessions', opts.sessions && config.sessions !== undefined, () =>
      syncSessions(config.sessions as SessionsConfig, hosts, paths.projectsRoot, state, {
        run,
        now: deps.now,
        platform: deps.platform,
        dryRun: opts.dryRun,
        tmpDir: deps.tmpDir,
      })
    );

    if (live) {
      state.lastRun = deps.now().toISOString();
      state.lastOk = results.every((r) => r.ok);
      state.phases = results;
      await writeJson(paths.statePath, state);
    }
  } finally {
    await releaseLock(paths.lockPath);
  }
  return results;
}

// ---------------------------------------------------------------- schedule

export const TASK_NAME = 'raygent-sync';
export const CRON_LINE = '*/15 * * * * raygent sync --quiet';

// wscript runs node with no console window, so the task never flashes one.
export function hiddenLauncherVbs(nodePath: string, cliPath: string): string {
  return `CreateObject("WScript.Shell").Run """${nodePath}"" ""${cliPath}"" sync --quiet", 0, False\r\n`;
}

export function scheduleArgs(vbsPath: string): string[] {
  return ['/Create', '/F', '/SC', 'MINUTE', '/MO', '15', '/TN', TASK_NAME, '/TR', `wscript.exe //B "${vbsPath}"`];
}
