import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { listSkills, addSkill } from '../src/skill-lib.js';
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

describe('addSkill', () => {
  it('copies a skill from skillsRoot to projectSkillsDir', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.writeFileSync(path.join(skillsRoot, 'my-skill', 'SKILL.md'), '# my-skill');

    await addSkill('my-skill', roots);

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# my-skill');
  });

  it('throws when the source skill does not exist', async () => {
    await expect(addSkill('missing-skill', roots)).rejects.toThrow(
      `skill 'missing-skill' not found in ${skillsRoot}`
    );
  });

  it('throws when destination already exists and force is not set', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.mkdirSync(path.join(projectSkillsDir, 'my-skill'), { recursive: true });

    await expect(addSkill('my-skill', roots)).rejects.toThrow(/already installed/);
  });

  it('overwrites the destination when force is true', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.writeFileSync(path.join(skillsRoot, 'my-skill', 'SKILL.md'), '# new content');
    fs.mkdirSync(path.join(projectSkillsDir, 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), '# old content');

    await addSkill('my-skill', roots, { force: true });

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# new content');
  });
});
