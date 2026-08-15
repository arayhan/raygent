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
  /**
   * Where Claude Code reads personal skills from, and the default install
   * DESTINATION. Deliberately separate from globalAgentSkillsDir (~/.agents/
   * skills), which is a source this reads from -- collapsing the two would write
   * skills to a directory Claude Code never looks in.
   */
  globalSkillsDir: string;
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

/** Where Claude Code reads personal skills from — the default install target. */
export function globalSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

export function defaultRoots(cwd: string = process.cwd()): Roots {
  return {
    skillsRoot: path.join(os.homedir(), '.raygent', 'skills'),
    projectSkillsDir: path.join(cwd, '.claude', 'skills'),
    agentSkillsDir: path.join(cwd, '.agent', 'skills'),
    globalAgentSkillsDir: path.join(os.homedir(), '.agents', 'skills'),
    bundledSkillsDir: bundledSkillsDir(),
    globalSkillsDir: globalSkillsDir(),
  };
}
