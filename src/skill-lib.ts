import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  installed: boolean;
  source: 'personal' | 'project' | 'global' | 'bundled';
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
    skills.push({ name, installed, source });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

export async function addSkill(
  name: string,
  roots: Roots,
  opts: { force?: boolean } = {}
): Promise<void> {
  assertValidSkillName(name);

  const destDir = path.join(roots.projectSkillsDir, name);

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

  await fs.mkdir(roots.projectSkillsDir, { recursive: true });
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

export async function removeSkill(name: string, roots: Roots): Promise<void> {
  assertValidSkillName(name);

  const destDir = path.join(roots.projectSkillsDir, name);
  if (!(await exists(destDir))) {
    throw new Error(`skill '${name}' is not installed in ${roots.projectSkillsDir}`);
  }
  await fs.rm(destDir, { recursive: true, force: true });
}
