import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { listSkills } from '../src/skill-lib.js';
import type { Roots } from '../src/paths.js';

let skillsRoot: string;
let projectSkillsDir: string;
let roots: Roots;

beforeEach(() => {
  skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-skills-'));
  projectSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-project-'));
  roots = { skillsRoot, projectSkillsDir };
});

afterEach(() => {
  fs.rmSync(skillsRoot, { recursive: true, force: true });
  fs.rmSync(projectSkillsDir, { recursive: true, force: true });
});

describe('listSkills', () => {
  it('returns skills found in skillsRoot, marking installed status', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'skill-a'));
    fs.mkdirSync(path.join(skillsRoot, 'skill-b'));
    fs.mkdirSync(path.join(projectSkillsDir, 'skill-a'));

    const result = await listSkills(roots);

    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'skill-a', installed: true },
        { name: 'skill-b', installed: false },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when skillsRoot does not exist', async () => {
    fs.rmSync(skillsRoot, { recursive: true, force: true });
    const result = await listSkills(roots);
    expect(result).toEqual([]);
  });
});
