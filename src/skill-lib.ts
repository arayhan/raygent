import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  installed: boolean;
}

function assertValidSkillName(name: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name === '.' || name === '..') {
    throw new Error(`invalid skill name '${name}'`);
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
    const installed = await fs
      .access(path.join(roots.projectSkillsDir, entry.name))
      .then(() => true)
      .catch(() => false);
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

  const sourceIsDir = await fs
    .stat(sourceDir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (!sourceIsDir) {
    throw new Error(`skill '${name}' not found in ${roots.skillsRoot}`);
  }

  const destExists = await fs.access(destDir).then(() => true).catch(() => false);
  if (destExists && !opts.force) {
    throw new Error(`skill '${name}' is already installed at ${destDir} (use --force to overwrite)`);
  }

  await fs.mkdir(roots.projectSkillsDir, { recursive: true });
  if (destExists) {
    await fs.rm(destDir, { recursive: true, force: true });
  }
  await fs.cp(sourceDir, destDir, { recursive: true });
}

export async function removeSkill(name: string, roots: Roots): Promise<void> {
  assertValidSkillName(name);

  const destDir = path.join(roots.projectSkillsDir, name);
  const destExists = await fs.access(destDir).then(() => true).catch(() => false);
  if (!destExists) {
    throw new Error(`skill '${name}' is not installed in ${roots.projectSkillsDir}`);
  }
  await fs.rm(destDir, { recursive: true, force: true });
}
