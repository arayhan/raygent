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
 * Where an install lands. Global is ~/.claude/skills and works everywhere;
 * project is ./.claude/skills and works only here.
 */
export type SkillScope = 'global' | 'project';

export function skillDestDir(roots: Roots, scope: SkillScope): string {
  return scope === 'global' ? roots.globalSkillsDir : roots.projectSkillsDir;
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

  // Defaults to project so every existing caller keeps its behaviour --
  // installSelectedSkills writes into a freshly generated project and must not
  // start scattering skills into the user's home directory. Only the CLI's
  // install command asks for global.
  const destDir = path.join(skillDestDir(roots, opts.scope ?? 'project'), name);

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

  const destExists = await exists(destDir);
  if (destExists && !opts.force) {
    throw new Error(`skill '${name}' is already installed at ${destDir} (use --force to overwrite)`);
  }

  // The destination's parent, not the project's. Using projectSkillsDir here
  // meant a global install created an empty ./.claude/skills in whatever
  // directory you happened to be standing in.
  await fs.mkdir(path.dirname(destDir), { recursive: true });
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

export async function removeSkill(
  name: string,
  roots: Roots,
  opts: { scope?: SkillScope } = {}
): Promise<void> {
  assertValidSkillName(name);

  // Same default as addSkill, so remove undoes what add did.
  const scopeDir = skillDestDir(roots, opts.scope ?? 'project');
  const destDir = path.join(scopeDir, name);
  if (!(await exists(destDir))) {
    throw new Error(`skill '${name}' is not installed in ${scopeDir}`);
  }
  await fs.rm(destDir, { recursive: true, force: true });
}
