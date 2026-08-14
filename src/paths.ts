import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export interface Roots {
  skillsRoot: string;
  projectSkillsDir: string;
  agentSkillsDir: string;
  globalAgentSkillsDir: string;
  /** Skills shipped inside this package (skills/ at the package root). */
  bundledSkillsDir: string;
}

/**
 * The skills/ folder shipped with raygent itself, holding the `raygent` skill.
 * dist/paths.js -> package root is one level up, the same shape scaffold-tools
 * uses to find vendor/.
 *
 * Only reachable in a published install if "skills" is in package.json's files
 * array. Leaving it out fails silently: everything works from a dev checkout.
 */
export function bundledSkillsDir(): string {
  return path.join(fileURLToPath(new URL('..', import.meta.url)), 'skills');
}

export function defaultRoots(cwd: string = process.cwd()): Roots {
  return {
    skillsRoot: path.join(os.homedir(), '.raygent', 'skills'),
    projectSkillsDir: path.join(cwd, '.claude', 'skills'),
    agentSkillsDir: path.join(cwd, '.agent', 'skills'),
    globalAgentSkillsDir: path.join(os.homedir(), '.agents', 'skills'),
    bundledSkillsDir: bundledSkillsDir(),
  };
}
