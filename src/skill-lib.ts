import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  /** Present in this project's .claude/skills. */
  installed: boolean;
  /** Present in ~/.claude/skills, where it works from any directory. */
  installedGlobally: boolean;
  source: 'personal' | 'project' | 'global' | 'bundled';
}

/**
 * Where an install lands. Global is ~/.claude/skills and ~/.agents/skills;
 * project is ./.claude/skills and ./.agent/skills.
 */
export type SkillScope = 'global' | 'project';

export function skillDestDirs(roots: Roots, scope: SkillScope): string[] {
  if (scope === 'global') {
    const dirs: string[] = [];
    if (roots.globalSkillsDir) dirs.push(roots.globalSkillsDir);
    if (roots.globalAgentSkillsDir && !dirs.includes(roots.globalAgentSkillsDir)) {
      dirs.push(roots.globalAgentSkillsDir);
    }
    return dirs;
  }
  const dirs: string[] = [];
  if (roots.projectSkillsDir) dirs.push(roots.projectSkillsDir);
  if (roots.agentSkillsDir && !dirs.includes(roots.agentSkillsDir)) {
    dirs.push(roots.agentSkillsDir);
  }
  return dirs;
}

export function skillDestDir(roots: Roots, scope: SkillScope): string {
  return scope === 'global' ? roots.globalSkillsDir : roots.projectSkillsDir;
}

/** The directory a listed skill was discovered in, for reading its SKILL.md. */
export function skillSourceDir(roots: Roots, source: SkillInfo['source']): string {
  if (source === 'personal') return roots.skillsRoot;
  if (source === 'project') return roots.agentSkillsDir;
  if (source === 'global') return roots.globalAgentSkillsDir;
  return roots.bundledSkillsDir;
}

function assertValidSkillName(name: string): void {
  if (
    !/^[A-Za-z0-9._-]+$/.test(name) ||
    name === '.' ||
    name === '..' ||
    name.endsWith('.') ||
    /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(name)
  ) {
    throw new Error(`invalid skill name '${name}'`);
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
}

async function readSkillDirNames(dir: string | undefined): Promise<string[]> {
  // An absent root means "no skills there", not a crash. Roots is built by hand
  // in several places and tests are outside the typecheck (tsconfig includes
  // only src/), so a missing field surfaces at runtime rather than at compile
  // time -- adding bundledSkillsDir broke 15 tests exactly this way.
  if (!dir) return [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function listSkills(roots: Roots): Promise<SkillInfo[]> {
  const personalNames = await readSkillDirNames(roots.skillsRoot);
  const projectNames = await readSkillDirNames(roots.agentSkillsDir);
  const globalNames = await readSkillDirNames(roots.globalAgentSkillsDir);
  const bundledNames = await readSkillDirNames(roots.bundledSkillsDir);

  // precedence on name collision: personal > project > global > bundled.
  // Bundled is last so raygent's own copy never shadows one the user wrote,
  // matching the candidate order in addSkill.
  const bySource = new Map<string, SkillInfo['source']>();
  for (const name of bundledNames) bySource.set(name, 'bundled');
  for (const name of globalNames) bySource.set(name, 'global');
  for (const name of projectNames) bySource.set(name, 'project');
  for (const name of personalNames) bySource.set(name, 'personal');

  const skills: SkillInfo[] = [];
  for (const [name, source] of bySource) {
    const installed = await exists(path.join(roots.projectSkillsDir, name));
    const installedGlobally = roots.globalSkillsDir
      ? await exists(path.join(roots.globalSkillsDir, name))
      : false;
    skills.push({ name, installed, installedGlobally, source });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

export async function addSkill(
  name: string,
  roots: Roots,
  opts: { force?: boolean; scope?: SkillScope } = {}
): Promise<void> {
  assertValidSkillName(name);

  const scope = opts.scope ?? 'project';
  const primaryDestDir = path.join(skillDestDir(roots, scope), name);
  const allDestDirs = skillDestDirs(roots, scope).map((d) => path.join(d, name));

  async function isDir(dir: string): Promise<boolean> {
    try {
      return (await fs.stat(dir)).isDirectory();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw err;
    }
  }

  // Order is precedence. The bundled copy is LAST so a user's own version of a
  // skill with the same name always wins -- shipping one inside the package must
  // not quietly override something they wrote.
  const candidateDirs = [
    path.join(roots.skillsRoot, name),
    path.join(roots.agentSkillsDir, name),
    path.join(roots.globalAgentSkillsDir, name),
    path.join(roots.bundledSkillsDir, name),
  ];

  let sourceDir: string | undefined;
  for (const candidate of candidateDirs) {
    if (await isDir(candidate)) {
      sourceDir = candidate;
      break;
    }
  }
  if (!sourceDir) {
    throw new Error(`skill '${name}' not found in ${candidateDirs.join(', ')}`);
  }

  const primaryExists = await exists(primaryDestDir);
  if (primaryExists && !opts.force) {
    throw new Error(`skill '${name}' is already installed at ${primaryDestDir} (use --force to overwrite)`);
  }

  for (const destDir of allDestDirs) {
    if (path.resolve(destDir) === path.resolve(sourceDir)) {
      continue;
    }
    await fs.mkdir(path.dirname(destDir), { recursive: true });
    const destExists = await exists(destDir);
    if (destExists) {
      // copy fully into a temp sibling first so a failed copy never destroys the
      // existing install
      const tmpDir = `${destDir}.raygent-tmp`;
      await fs.rm(tmpDir, { recursive: true, force: true });
      try {
        await fs.cp(sourceDir, tmpDir, { recursive: true });
        await fs.rm(destDir, { recursive: true, force: true });
        await fs.rename(tmpDir, destDir);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    } else {
      await fs.cp(sourceDir, destDir, { recursive: true });
    }
  }
}

export async function removeSkill(
  name: string,
  roots: Roots,
  opts: { scope?: SkillScope } = {}
): Promise<void> {
  assertValidSkillName(name);

  const scope = opts.scope ?? 'project';
  const destDirs = skillDestDirs(roots, scope).map((d) => path.join(d, name));
  let removed = 0;

  for (const destDir of destDirs) {
    if (await exists(destDir)) {
      await fs.rm(destDir, { recursive: true, force: true });
      removed++;
    }
  }

  if (removed === 0) {
    const scopeDir = skillDestDir(roots, scope);
    throw new Error(`skill '${name}' is not installed in ${scopeDir}`);
  }
}
