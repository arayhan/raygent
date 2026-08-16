import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initProject, installSelectedSkills, docTitle, FRAMEWORKS_BY_PLATFORM } from '../src/init-lib.js';

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-init-'));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe('docTitle', () => {
  it('derives titles from filenames', () => {
    expect(docTitle('STATE.md')).toBe('State');
    expect(docTitle('PRD.md')).toBe('PRD');
    expect(docTitle('product-roadmap.md')).toBe('Product Roadmap');
    expect(docTitle('handoff.md')).toBe('Handoff');
  });
});

describe('initProject', () => {
  it('creates the 10 product docs, including DESIGN.html', async () => {
    const { docsDir } = await initProject(
      { projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'product' },
      cwd
    );

    const files = fs.readdirSync(docsDir).sort();
    expect(files).toEqual(
      [
        'ANTISLOP.md',
        'ARCHITECTURE.md',
        'DATABASE.md',
        'DESIGN.html',
        'DESIGN.md',
        'PRD.md',
        'PROGRESS.md',
        'STATE.md',
        'VISION.md',
        'product-roadmap.md',
      ].sort()
    );
    expect(fs.readFileSync(path.join(docsDir, 'PRD.md'), 'utf8')).toContain('# PRD');
  });

  it('creates the 9 client docs, without DESIGN.html', async () => {
    const { docsDir } = await initProject(
      { projectName: 'demo', platform: 'cli', framework: 'node', type: 'client' },
      cwd
    );

    const files = fs.readdirSync(docsDir).sort();
    expect(files).toEqual(
      ['ANTISLOP.md', 'ARCHITECTURE.md', 'DATABASE.md', 'DESIGN.md', 'PRD.md', 'PROGRESS.md', 'STATE.md', 'handoff.md', 'scope.md'].sort()
    );
    expect(files).not.toContain('DESIGN.html');
  });

  it('accepts every platform with a framework from its own list', async () => {
    for (const [platform, frameworks] of Object.entries(FRAMEWORKS_BY_PLATFORM)) {
      for (const framework of frameworks) {
        const projectName = `demo-${platform}-${framework}`;
        await expect(
          initProject({ projectName, platform, framework, type: 'product' }, cwd)
        ).resolves.toBeDefined();
      }
    }
  });

  it('rejects an invalid platform and creates nothing', async () => {
    await expect(
      initProject({ projectName: 'demo', platform: 'blockchain', framework: 'nextjs', type: 'product' }, cwd)
    ).rejects.toThrow(/invalid platform/);
    expect(fs.existsSync(path.join(cwd, 'demo'))).toBe(false);
  });

  it('rejects a framework not in the chosen platform\'s list, and creates nothing', async () => {
    await expect(
      initProject({ projectName: 'demo', platform: 'web', framework: 'react-native', type: 'product' }, cwd)
    ).rejects.toThrow(/invalid framework 'react-native' for platform 'web'/);
    expect(fs.existsSync(path.join(cwd, 'demo'))).toBe(false);
  });

  it('rejects an invalid type and creates nothing', async () => {
    await expect(
      initProject({ projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'internal' }, cwd)
    ).rejects.toThrow(/invalid type/);
    expect(fs.existsSync(path.join(cwd, 'demo'))).toBe(false);
  });

  it('rejects an invalid project name like ".." without touching the filesystem', async () => {
    await expect(
      initProject({ projectName: '..', platform: 'web', framework: 'nextjs', type: 'product' }, cwd)
    ).rejects.toThrow(/invalid project name/);
    expect(fs.readdirSync(cwd)).toEqual([]);
  });

  it('rejects a project name containing a slash', async () => {
    await expect(
      initProject({ projectName: 'a/b', platform: 'web', framework: 'nextjs', type: 'product' }, cwd)
    ).rejects.toThrow(/invalid project name/);
  });

  it('rejects Windows reserved names and trailing dots', async () => {
    for (const name of ['nul', 'CON', 'lpt1', 'aux.md', 'demo.']) {
      await expect(
        initProject({ projectName: name, platform: 'web', framework: 'nextjs', type: 'product' }, cwd)
      ).rejects.toThrow(/invalid project name/);
    }
    expect(fs.readdirSync(cwd)).toEqual([]);
  });

  it('refuses to overwrite existing docs without --force, naming the conflict', async () => {
    await initProject({ projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'client' }, cwd);
    const prdPath = path.join(cwd, 'demo', 'docs', 'PRD.md');
    fs.writeFileSync(prdPath, 'do not touch');

    await expect(
      initProject({ projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'client' }, cwd)
    ).rejects.toThrow(/PRD\.md/);
    expect(fs.readFileSync(prdPath, 'utf8')).toBe('do not touch');
  });

  it('overwrites existing docs when --force is set', async () => {
    await initProject({ projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'client' }, cwd);
    const prdPath = path.join(cwd, 'demo', 'docs', 'PRD.md');
    fs.writeFileSync(prdPath, 'stale content');

    await initProject({ projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'client', force: true }, cwd);

    expect(fs.readFileSync(prdPath, 'utf8')).toContain('# PRD');
  });

  it('succeeds when the project folder already exists with unrelated files', async () => {
    fs.mkdirSync(path.join(cwd, 'demo'), { recursive: true });
    const sentinel = path.join(cwd, 'demo', 'README.md');
    fs.writeFileSync(sentinel, 'keep me');

    await initProject({ projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'client' }, cwd);

    expect(fs.readFileSync(sentinel, 'utf8')).toBe('keep me');
    expect(fs.existsSync(path.join(cwd, 'demo', 'docs', 'PRD.md'))).toBe(true);
  });
});

describe('installSelectedSkills', () => {
  let skillsRoot: string;
  let agentSkillsDir: string;
  let globalAgentSkillsDir: string;
  let targetDir: string;

  beforeEach(() => {
    skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-init-skills-'));
    agentSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-init-agent-'));
    globalAgentSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-init-global-'));
    targetDir = path.join(cwd, 'demo');
    fs.mkdirSync(targetDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(skillsRoot, { recursive: true, force: true });
    fs.rmSync(agentSkillsDir, { recursive: true, force: true });
    fs.rmSync(globalAgentSkillsDir, { recursive: true, force: true });
  });

  it('copies personal skills into <targetDir>/.claude/skills', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.writeFileSync(path.join(skillsRoot, 'my-skill', 'SKILL.md'), '# my-skill');

    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: ['my-skill'],
      builtinSkillNames: [],
    });

    const copied = fs.readFileSync(path.join(targetDir, '.claude', 'skills', 'my-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# my-skill');
  });

  it('writes .claude/skills.json listing built-in skill names', async () => {
    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: [],
      builtinSkillNames: ['ui-ux-pro-max', 'impeccable'],
    });

    const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.claude', 'skills.json'), 'utf8'));
    expect(manifest).toEqual(['ui-ux-pro-max', 'impeccable']);
  });

  it('does not write skills.json when no built-in skills are selected', async () => {
    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: [],
      builtinSkillNames: [],
    });

    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills.json'))).toBe(false);
  });

  it('overwrites an already-installed personal skill instead of throwing', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.writeFileSync(path.join(skillsRoot, 'my-skill', 'SKILL.md'), '# new');
    const installedDir = path.join(targetDir, '.claude', 'skills', 'my-skill');
    fs.mkdirSync(installedDir, { recursive: true });
    fs.writeFileSync(path.join(installedDir, 'SKILL.md'), '# old');

    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: ['my-skill'],
      builtinSkillNames: [],
    });

    expect(fs.readFileSync(path.join(installedDir, 'SKILL.md'), 'utf8')).toBe('# new');
  });

  it('merges builtin names into an existing skills.json instead of clobbering it', async () => {
    const claudeDir = path.join(targetDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'skills.json'), JSON.stringify(['hand-added', 'impeccable']));

    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: [],
      builtinSkillNames: ['impeccable', 'ui-ux-pro-max'],
    });

    const manifest = JSON.parse(fs.readFileSync(path.join(claudeDir, 'skills.json'), 'utf8'));
    expect(manifest).toEqual(['hand-added', 'impeccable', 'ui-ux-pro-max']);
  });

  it('copies a builtin skill for real when found in globalAgentSkillsDir, no manifest entry for it', async () => {
    fs.mkdirSync(path.join(globalAgentSkillsDir, 'impeccable'));
    fs.writeFileSync(path.join(globalAgentSkillsDir, 'impeccable', 'SKILL.md'), '# impeccable');

    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: [],
      builtinSkillNames: ['impeccable'],
    });

    const copied = fs.readFileSync(path.join(targetDir, '.claude', 'skills', 'impeccable', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# impeccable');
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills.json'))).toBe(false);
  });

  it('mixes resolved and unresolved builtin names: resolved gets copied, unresolved goes to skills.json', async () => {
    fs.mkdirSync(path.join(globalAgentSkillsDir, 'impeccable'));
    fs.writeFileSync(path.join(globalAgentSkillsDir, 'impeccable', 'SKILL.md'), '# impeccable');

    await installSelectedSkills({
      targetDir,
      skillsRoot,
      agentSkillsDir,
      globalAgentSkillsDir,
      personalSkillNames: [],
      builtinSkillNames: ['impeccable', 'some-unknown-skill'],
    });

    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'impeccable', 'SKILL.md'))).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.claude', 'skills.json'), 'utf8'));
    expect(manifest).toEqual(['some-unknown-skill']);
  });
});
