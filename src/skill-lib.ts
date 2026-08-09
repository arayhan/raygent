import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  installed: boolean;
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
  return skills;
}
