import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { bundledSkillsDir, defaultRoots } from '../src/paths.js';
import { addSkill, listSkills } from '../src/skill-lib.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'raygent-skills-'));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

/** Roots pointed at empty temp dirs, so only the bundle is a real source. */
function isolatedRoots(overrides: Partial<ReturnType<typeof defaultRoots>> = {}) {
  return {
    skillsRoot: path.join(tmp, 'personal'),
    projectSkillsDir: path.join(tmp, 'project', '.claude', 'skills'),
    agentSkillsDir: path.join(tmp, 'agent'),
    globalAgentSkillsDir: path.join(tmp, 'global'),
    bundledSkillsDir: bundledSkillsDir(),
    ...overrides,
  };
}

describe('bundled skills', () => {
  it('resolves to a directory that exists in this checkout', async () => {
    const stat = await fs.stat(bundledSkillsDir());
    expect(stat.isDirectory()).toBe(true);
  });

  it('ships the raygent skill with a name in its frontmatter', async () => {
    const skillMd = await fs.readFile(path.join(bundledSkillsDir(), 'raygent', 'SKILL.md'), 'utf8');
    expect(skillMd.startsWith('---')).toBe(true);
    expect(skillMd).toMatch(/^name: raygent$/m);
    expect(skillMd).toMatch(/^user-invocable: true$/m);
  });

  it('references only files that exist', async () => {
    // A SKILL.md pointing at a missing reference file is a dead instruction the
    // agent follows into nothing.
    const dir = path.join(bundledSkillsDir(), 'raygent');
    const skillMd = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8');
    const referenced = [...skillMd.matchAll(/`(reference\/[\w.-]+)`/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const rel of new Set(referenced)) {
      await expect(fs.access(path.join(dir, rel))).resolves.toBeUndefined();
    }
  });

  it('is installable by name through addSkill', async () => {
    const roots = isolatedRoots();
    await addSkill('raygent', roots);
    const installed = await fs.readFile(path.join(roots.projectSkillsDir, 'raygent', 'SKILL.md'), 'utf8');
    expect(installed).toMatch(/^name: raygent$/m);
  });

  it('copies the reference folder, not just SKILL.md', async () => {
    const roots = isolatedRoots();
    await addSkill('raygent', roots);
    const entries = await fs.readdir(path.join(roots.projectSkillsDir, 'raygent', 'reference'));
    expect(entries).toContain('critique.md');
    expect(entries).toContain('questions.md');
  });

  it('lets a personal skill of the same name win', async () => {
    // Shipping a skill inside the package must never shadow one the user wrote.
    const personal = path.join(tmp, 'personal', 'raygent');
    await fs.mkdir(personal, { recursive: true });
    await fs.writeFile(path.join(personal, 'SKILL.md'), '---\nname: raygent\n---\nMINE\n');

    const roots = isolatedRoots();
    await addSkill('raygent', roots);
    const installed = await fs.readFile(path.join(roots.projectSkillsDir, 'raygent', 'SKILL.md'), 'utf8');
    expect(installed).toContain('MINE');
  });

  it('lists the bundled skill with source "bundled"', async () => {
    const found = (await listSkills(isolatedRoots())).find((s) => s.name === 'raygent');
    expect(found?.source).toBe('bundled');
  });

  it('reports a personal copy as personal, not bundled', async () => {
    const personal = path.join(tmp, 'personal', 'raygent');
    await fs.mkdir(personal, { recursive: true });
    await fs.writeFile(path.join(personal, 'SKILL.md'), '---\nname: raygent\n---\n');
    const found = (await listSkills(isolatedRoots())).find((s) => s.name === 'raygent');
    expect(found?.source).toBe('personal');
  });
});

describe('defaultRoots', () => {
  it('includes the bundled skills directory', () => {
    expect(defaultRoots(tmp).bundledSkillsDir).toBe(bundledSkillsDir());
  });
});

describe('packaging', () => {
  it('lists skills in package.json files', async () => {
    // Without this entry the skill is absent from every published install and
    // present in every dev checkout, so nothing here would ever notice. Asserting
    // the manifest is the cheap check that catches the real regression: somebody
    // pruning the files array.
    const pkgPath = path.join(bundledSkillsDir(), '..', 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as { files?: string[] };
    expect(pkg.files ?? []).toContain('skills');
  });

  it('has the skill directory the manifest promises', async () => {
    const entries = await fs.readdir(bundledSkillsDir(), { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    expect(dirs).toContain('raygent');
  });
});
