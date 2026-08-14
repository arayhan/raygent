import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { listSkills, addSkill, removeSkill } from '../src/skill-lib.js';
import type { Roots } from '../src/paths.js';

let skillsRoot: string;
let projectSkillsDir: string;
let agentSkillsDir: string;
let globalAgentSkillsDir: string;
let bundledSkillsDir: string;
let roots: Roots;

beforeEach(() => {
  skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-skills-'));
  projectSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-project-'));
  agentSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-agent-'));
  globalAgentSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-global-agent-'));
  // Pointed at a temp dir rather than the real bundle, so these tests assert on
  // what they create and are not perturbed by whatever raygent ships.
  bundledSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-bundled-'));
  roots = { skillsRoot, projectSkillsDir, agentSkillsDir, globalAgentSkillsDir, bundledSkillsDir };
});

afterEach(() => {
  fs.rmSync(skillsRoot, { recursive: true, force: true });
  fs.rmSync(projectSkillsDir, { recursive: true, force: true });
  fs.rmSync(agentSkillsDir, { recursive: true, force: true });
  fs.rmSync(globalAgentSkillsDir, { recursive: true, force: true });
  fs.rmSync(bundledSkillsDir, { recursive: true, force: true });
});

describe('listSkills', () => {
  it('returns skills found in skillsRoot, marking installed status and source personal', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'skill-a'));
    fs.mkdirSync(path.join(skillsRoot, 'skill-b'));
    fs.mkdirSync(path.join(projectSkillsDir, 'skill-a'));

    const result = await listSkills(roots);

    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'skill-a', installed: true, source: 'personal' },
        { name: 'skill-b', installed: false, source: 'personal' },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when skillsRoot does not exist', async () => {
    fs.rmSync(skillsRoot, { recursive: true, force: true });
    const result = await listSkills(roots);
    expect(result).toEqual([]);
  });

  it('includes skills found only in agentSkillsDir, tagged source project', async () => {
    fs.mkdirSync(path.join(agentSkillsDir, 'project-only'));

    const result = await listSkills(roots);

    expect(result).toEqual([{ name: 'project-only', installed: false, source: 'project' }]);
  });

  it('includes skills found only in globalAgentSkillsDir, tagged source global', async () => {
    fs.mkdirSync(path.join(globalAgentSkillsDir, 'global-only'));

    const result = await listSkills(roots);

    expect(result).toEqual([{ name: 'global-only', installed: false, source: 'global' }]);
  });

  it('when a name exists in personal and project dirs, lists it once with source personal', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'shared'));
    fs.mkdirSync(path.join(agentSkillsDir, 'shared'));

    const result = await listSkills(roots);

    expect(result).toEqual([{ name: 'shared', installed: false, source: 'personal' }]);
  });

  it('precedence personal > project > global on a three-way name collision', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'shared'));
    fs.mkdirSync(path.join(agentSkillsDir, 'shared'));
    fs.mkdirSync(path.join(globalAgentSkillsDir, 'shared'));

    const result = await listSkills(roots);

    expect(result).toEqual([{ name: 'shared', installed: false, source: 'personal' }]);
  });

  it('project wins over global when personal has no entry', async () => {
    fs.mkdirSync(path.join(agentSkillsDir, 'shared'));
    fs.mkdirSync(path.join(globalAgentSkillsDir, 'shared'));

    const result = await listSkills(roots);

    expect(result).toEqual([{ name: 'shared', installed: false, source: 'project' }]);
  });

  it('does not throw when agentSkillsDir or globalAgentSkillsDir does not exist', async () => {
    fs.rmSync(agentSkillsDir, { recursive: true, force: true });
    fs.rmSync(globalAgentSkillsDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(skillsRoot, 'skill-a'));

    const result = await listSkills(roots);

    expect(result).toEqual([{ name: 'skill-a', installed: false, source: 'personal' }]);
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

  it('throws when the source skill does not exist in any location', async () => {
    await expect(addSkill('missing-skill', roots)).rejects.toThrow(
      `skill 'missing-skill' not found in ${path.join(skillsRoot, 'missing-skill')}, ${path.join(agentSkillsDir, 'missing-skill')}, ${path.join(globalAgentSkillsDir, 'missing-skill')}`
    );
  });

  it('falls back to agentSkillsDir when the skill is not in skillsRoot', async () => {
    fs.mkdirSync(path.join(agentSkillsDir, 'agent-skill'));
    fs.writeFileSync(path.join(agentSkillsDir, 'agent-skill', 'SKILL.md'), '# from agent');

    await addSkill('agent-skill', roots);

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'agent-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# from agent');
  });

  it('falls back to globalAgentSkillsDir when the skill is in neither skillsRoot nor agentSkillsDir', async () => {
    fs.mkdirSync(path.join(globalAgentSkillsDir, 'global-skill'));
    fs.writeFileSync(path.join(globalAgentSkillsDir, 'global-skill', 'SKILL.md'), '# from global');

    await addSkill('global-skill', roots);

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'global-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# from global');
  });

  it('prefers skillsRoot content when the name exists in both locations', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'shared'));
    fs.writeFileSync(path.join(skillsRoot, 'shared', 'SKILL.md'), '# personal');
    fs.mkdirSync(path.join(agentSkillsDir, 'shared'));
    fs.writeFileSync(path.join(agentSkillsDir, 'shared', 'SKILL.md'), '# agent');

    await addSkill('shared', roots);

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'shared', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# personal');
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

  it('rejects a name of "." without touching the filesystem', async () => {
    await expect(addSkill('.', roots)).rejects.toThrow(Error);

    // projectSkillsDir should remain exactly as it started (empty tmp dir) -
    // no botched copy of skillsRoot's contents into it.
    expect(fs.readdirSync(projectSkillsDir)).toEqual([]);
  });

  it('rejects a path-traversal name like "../evil"', async () => {
    await expect(addSkill('../evil', roots)).rejects.toThrow(Error);
  });

  it('rejects Windows reserved names and trailing dots', async () => {
    await expect(addSkill('nul', roots)).rejects.toThrow(/invalid skill name/);
    await expect(addSkill('CON', roots)).rejects.toThrow(/invalid skill name/);
    await expect(addSkill('com1.txt', roots)).rejects.toThrow(/invalid skill name/);
    await expect(addSkill('foo.', roots)).rejects.toThrow(/invalid skill name/);
  });

  it('rejects a source that exists but is a plain file, not a directory', async () => {
    fs.writeFileSync(path.join(skillsRoot, 'not-a-skill'), 'not a directory');

    await expect(addSkill('not-a-skill', roots)).rejects.toThrow(Error);
  });
});

describe('removeSkill', () => {
  it('removes an installed skill from projectSkillsDir', async () => {
    fs.mkdirSync(path.join(projectSkillsDir, 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), '# my-skill');

    await removeSkill('my-skill', roots);

    expect(fs.existsSync(path.join(projectSkillsDir, 'my-skill'))).toBe(false);
  });

  it('throws when the skill is not installed', async () => {
    await expect(removeSkill('missing-skill', roots)).rejects.toThrow(
      `skill 'missing-skill' is not installed in ${projectSkillsDir}`
    );
  });

  it('rejects a name of "." and does not delete projectSkillsDir', async () => {
    const sentinel = path.join(projectSkillsDir, 'sentinel.txt');
    fs.writeFileSync(sentinel, 'keep me');

    await expect(removeSkill('.', roots)).rejects.toThrow(Error);

    expect(fs.existsSync(projectSkillsDir)).toBe(true);
    expect(fs.existsSync(sentinel)).toBe(true);
  });

  it('rejects a path-traversal name like "../evil"', async () => {
    await expect(removeSkill('../evil', roots)).rejects.toThrow(Error);
  });
});
