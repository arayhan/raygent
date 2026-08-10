import path from 'node:path';
import os from 'node:os';

export interface Roots {
  skillsRoot: string;
  projectSkillsDir: string;
  agentSkillsDir: string;
  globalAgentSkillsDir: string;
}

export function defaultRoots(cwd: string = process.cwd()): Roots {
  return {
    skillsRoot: path.join(os.homedir(), '.raygent', 'skills'),
    projectSkillsDir: path.join(cwd, '.claude', 'skills'),
    agentSkillsDir: path.join(cwd, '.agent', 'skills'),
    globalAgentSkillsDir: path.join(os.homedir(), '.agents', 'skills'),
  };
}
