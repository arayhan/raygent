import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  installed: boolean;
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

export async function listSkills(roots: Roots): Promise<SkillInfo[]> {
  let entries;
  try {
    entries = await fs.readdir(roots.skillsRoot, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const skills: SkillInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const installed = await exists(path.join(roots.projectSkillsDir, entry.name));
    skills.push({ name: entry.name, installed });
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

  const sourceDir = path.join(roots.skillsRoot, name);
  const destDir = path.join(roots.projectSkillsDir, name);

  let sourceIsDir = false;
  try {
    sourceIsDir = (await fs.stat(sourceDir)).isDirectory();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  if (!sourceIsDir) {
    throw new Error(`skill '${name}' not found in ${roots.skillsRoot}`);
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
