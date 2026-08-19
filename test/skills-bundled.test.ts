import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { bundledSkillsDir, defaultRoots } from '../src/paths.js';
import { addSkill, listSkills, removeSkill } from '../src/skill-lib.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'raygent-skills-'));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

/**
 * Roots pointed at empty temp dirs, so only the bundle is a real source. The
 * global destination is a temp dir too: no test may write into the real
 * ~/.claude/skills.
 */
function isolatedRoots(overrides: Partial<ReturnType<typeof defaultRoots>> = {}) {
  return {
    skillsRoot: path.join(tmp, 'personal'),
    projectSkillsDir: path.join(tmp, 'project', '.claude', 'skills'),
    agentSkillsDir: path.join(tmp, 'agent'),
    globalAgentSkillsDir: path.join(tmp, 'global'),
    bundledSkillsDir: bundledSkillsDir(),
    globalSkillsDir: path.join(tmp, 'home', '.claude', 'skills'),
    ...overrides,
  };
}

async function exists(p: string): Promise<boolean> {
  return fs
    .access(p)
    .then(() => true)
    .catch(() => false);
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

  it('offers bootstrap as a subcommand', async () => {
    const skillMd = await fs.readFile(path.join(bundledSkillsDir(), 'raygent', 'SKILL.md'), 'utf8');
    expect(skillMd).toMatch(/^argument-hint: .*bootstrap/m);
  });

  it('delegates bootstrap to the path the scaffolder actually writes', async () => {
    // The router names a literal path inside generated projects. If the
    // in-project skill is ever renamed in raygent-scaffolds, this pin fails here
    // instead of the router silently finding nothing at runtime.
    const skillMd = await fs.readFile(path.join(bundledSkillsDir(), 'raygent', 'SKILL.md'), 'utf8');
    expect(skillMd).toContain('.claude/skills/bootstrap-project/SKILL.md');
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

  it('installs globally when asked, and not into the project', async () => {
    const roots = isolatedRoots();
    await addSkill('raygent', roots, { scope: 'global' });
    expect(await exists(path.join(roots.globalSkillsDir, 'raygent', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(roots.globalAgentSkillsDir, 'raygent', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(roots.projectSkillsDir, 'raygent'))).toBe(false);
    expect(await exists(path.join(roots.agentSkillsDir, 'raygent'))).toBe(false);
  });

  it('does not create a project skills directory during a global install', async () => {
    // A global install used to mkdir ./.claude/skills in whatever directory you
    // happened to be standing in, leaving an empty folder behind.
    const roots = isolatedRoots();
    await addSkill('raygent', roots, { scope: 'global' });
    expect(await exists(roots.projectSkillsDir)).toBe(false);
    expect(await exists(roots.agentSkillsDir)).toBe(false);
  });

  it('scope project and the default produce the same tree', async () => {
    const a = isolatedRoots({ projectSkillsDir: path.join(tmp, 'a') });
    const b = isolatedRoots({ projectSkillsDir: path.join(tmp, 'b') });
    await addSkill('raygent', a);
    await addSkill('raygent', b, { scope: 'project' });
    const listOf = async (root: string) => (await fs.readdir(path.join(root, 'raygent'))).sort();
    expect(await listOf(path.join(tmp, 'a'))).toEqual(await listOf(path.join(tmp, 'b')));
  });

  it('removeSkill undoes the scope it was given', async () => {
    const roots = isolatedRoots();
    await addSkill('raygent', roots, { scope: 'global' });
    await addSkill('raygent', roots, { scope: 'project' });

    await removeSkill('raygent', roots, { scope: 'global' });
    expect(await exists(path.join(roots.globalSkillsDir, 'raygent'))).toBe(false);
    expect(await exists(path.join(roots.projectSkillsDir, 'raygent'))).toBe(true);

    await removeSkill('raygent', roots, { scope: 'project' });
    expect(await exists(path.join(roots.projectSkillsDir, 'raygent'))).toBe(false);
  });

  it('reports both install locations independently', async () => {
    const roots = isolatedRoots();
    const find = async () => (await listSkills(roots)).find((s) => s.name === 'raygent');

    expect(await find()).toMatchObject({ installed: false, installedGlobally: false });
    await addSkill('raygent', roots, { scope: 'global' });
    expect(await find()).toMatchObject({ installed: false, installedGlobally: true });
    await addSkill('raygent', roots, { scope: 'project' });
    expect(await find()).toMatchObject({ installed: true, installedGlobally: true });
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
