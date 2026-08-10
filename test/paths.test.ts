import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { defaultRoots } from '../src/paths.js';

describe('defaultRoots', () => {
  it('resolves skillsRoot under the home directory and projectSkillsDir/agentSkillsDir under cwd', () => {
    const roots = defaultRoots('/tmp/some-project');
    expect(roots.skillsRoot).toBe(path.join(os.homedir(), '.raygent', 'skills'));
    expect(roots.projectSkillsDir).toBe(path.join('/tmp/some-project', '.claude', 'skills'));
    expect(roots.agentSkillsDir).toBe(path.join('/tmp/some-project', '.agent', 'skills'));
  });

  it('defaults cwd to process.cwd() when not given', () => {
    const roots = defaultRoots();
    expect(roots.projectSkillsDir).toBe(path.join(process.cwd(), '.claude', 'skills'));
  });
});
