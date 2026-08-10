import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  installed: boolean;
  source: 'personal' | 'project' | 'global';
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

async function readSkillDirNames(dir: string): Promise<string[]> {
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

  // precedence on name collision: personal > project > global
  const bySource = new Map<string, 'personal' | 'project' | 'global'>();
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

  const candidateDirs = [
    path.join(roots.skillsRoot, name),
    path.join(roots.agentSkillsDir, name),
    path.join(roots.globalAgentSkillsDir, name),
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
