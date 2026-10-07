import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { emitProjectState, projectHasDataLayer } from '../src/project-emit.js';
import { STATE_DOC_ROW, PHASE_ZERO_ROW, PREFERENCES_RULE_TEXT } from '../src/doc-fill.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'raygent-emit-'));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function exists(p: string): Promise<boolean> {
  return fs
    .access(p)
    .then(() => true)
    .catch(() => false);
}

describe('projectHasDataLayer', () => {
  it('returns true for web applications with data layers', () => {
    expect(projectHasDataLayer({ platform: 'web', kind: 'app' })).toBe(true);
    expect(projectHasDataLayer({ platform: 'web' })).toBe(true);
  });

  it('returns false for CLI projects', () => {
    expect(projectHasDataLayer({ platform: 'cli' })).toBe(false);
  });

  it('returns false for landing pages', () => {
    expect(projectHasDataLayer({ platform: 'web', kind: 'landing' })).toBe(false);
  });
});

describe('emitProjectState', () => {
  const sampleAgentsMd = [
    '# Test Project',
    '',
    '## Docs (read in this order)',
    '',
    '| Doc | Content |',
    '|---|---|',
    '| [docs/PRODUCT.md](docs/PRODUCT.md) | Product truth |',
    '| [docs/PROGRESS.md](docs/PROGRESS.md) | Decision log |',
    '',
    '## Phases',
    '',
    '| Phase | Scope | Status |',
    '|---|---|---|',
    '| 1 | MVP features | Build now |',
    '| 2 | Polish | After 1 |',
    '',
    '## Hard rules (violations = rework)',
    '',
    '1. **Secrets never reach the client.**',
    '',
    '**Project-specific rules get added here.** Silent traps only.',
    '',
  ].join('\n');

  it('emits STATE.md, .claude/commands, and 4 Phase 0 tasks for web apps', async () => {
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), sampleAgentsMd);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: true,
      force: false,
      platform: 'web',
      kind: 'app',
    });

    expect(result.written).toEqual([
      'docs/STATE.md',
      '.claude/commands/start.md',
      '.claude/commands/wrap.md',
      'docs/tasks/0-step-01-scaffold.md',
      'docs/tasks/0-step-02-verify-loop.md',
      'docs/tasks/0-step-03-data-round-trip.md',
      'docs/tasks/0-gate-deploy.md',
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);

    expect(await exists(path.join(tmp, 'docs', 'STATE.md'))).toBe(true);
    expect(await exists(path.join(tmp, '.claude', 'commands', 'start.md'))).toBe(true);
    expect(await exists(path.join(tmp, '.claude', 'commands', 'wrap.md'))).toBe(true);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-step-01-scaffold.md'))).toBe(true);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-step-02-verify-loop.md'))).toBe(true);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-step-03-data-round-trip.md'))).toBe(true);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-gate-deploy.md'))).toBe(true);

    const stateContent = await fs.readFile(path.join(tmp, 'docs', 'STATE.md'), 'utf8');
    expect(stateContent.startsWith('# State\n')).toBe(true);

    const agentsContent = await fs.readFile(path.join(tmp, 'AGENTS.md'), 'utf8');
    expect(agentsContent).toContain(STATE_DOC_ROW);
    expect(agentsContent).toContain(PHASE_ZERO_ROW);
  });

  it('skips 0-step-03-data-round-trip for landing pages (emits 3 tasks)', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'web',
      kind: 'landing',
    });

    expect(result.written).toEqual([
      'docs/STATE.md',
      'docs/tasks/0-step-01-scaffold.md',
      'docs/tasks/0-step-02-verify-loop.md',
      'docs/tasks/0-gate-deploy.md',
    ]);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-step-03-data-round-trip.md'))).toBe(false);
  });

  it('skips 0-step-03-data-round-trip for CLI projects (emits 3 tasks)', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'cli',
    });

    expect(result.written).toEqual([
      'docs/STATE.md',
      'docs/tasks/0-step-01-scaffold.md',
      'docs/tasks/0-step-02-verify-loop.md',
      'docs/tasks/0-gate-deploy.md',
    ]);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-step-03-data-round-trip.md'))).toBe(false);
  });

  it('creates docs/tasks directory when it does not exist (stub path)', async () => {
    expect(await exists(path.join(tmp, 'docs', 'tasks'))).toBe(false);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'cli',
    });

    expect(result.failed).toEqual([]);
    expect(await exists(path.join(tmp, 'docs', 'tasks'))).toBe(true);
  });

  it('skips existing files when force is false, leaving existing content intact', async () => {
    const docsDir = path.join(tmp, 'docs');
    const tasksDir = path.join(docsDir, 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, 'STATE.md'), 'EXISTING_STATE');
    await fs.writeFile(path.join(tasksDir, '0-step-01-scaffold.md'), 'EXISTING_TASK');

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: true,
      force: false,
      platform: 'web',
      kind: 'app',
    });

    expect(result.skipped).toContain('docs/STATE.md');
    expect(result.skipped).toContain('docs/tasks/0-step-01-scaffold.md');
    expect(result.written).not.toContain('docs/STATE.md');

    const content = await fs.readFile(path.join(docsDir, 'STATE.md'), 'utf8');
    expect(content).toBe('EXISTING_STATE');
    const taskContent = await fs.readFile(path.join(tasksDir, '0-step-01-scaffold.md'), 'utf8');
    expect(taskContent).toBe('EXISTING_TASK');
  });

  it('overwrites existing files when force is true', async () => {
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, 'STATE.md'), 'OLD_STATE');

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: true,
      platform: 'web',
      kind: 'app',
    });

    expect(result.written).toContain('docs/STATE.md');
    expect(result.skipped).not.toContain('docs/STATE.md');

    const content = await fs.readFile(path.join(docsDir, 'STATE.md'), 'utf8');
    expect(content.startsWith('# State\n')).toBe(true);
  });

  it('fails loudly when AGENTS.md exists but has no PROGRESS.md anchor', async () => {
    const brokenAgentsMd = [
      '# Test Project',
      '',
      '## Docs (read in this order)',
      '',
      '| Doc | Content |',
      '|---|---|',
      '| [docs/PRODUCT.md](docs/PRODUCT.md) | Product truth |',
    ].join('\n');
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), brokenAgentsMd);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: true,
      force: false,
      platform: 'web',
      kind: 'app',
    });

    expect(result.failed.length).toBeGreaterThan(0);
    expect(result.failed.some((f) => f.includes('PROGRESS.md row not found'))).toBe(true);
  });

  it('fails loudly when AGENTS.md exists but has no Phase 1 anchor', async () => {
    const brokenPhasesAgentsMd = [
      '# Test Project',
      '',
      '## Docs (read in this order)',
      '',
      '| Doc | Content |',
      '|---|---|',
      '| [docs/PRODUCT.md](docs/PRODUCT.md) | Product truth |',
      '| [docs/PROGRESS.md](docs/PROGRESS.md) | Decision log |',
      '',
      '## Phases',
      '',
      '| Phase | Scope | Status |',
      '|---|---|---|',
    ].join('\n');
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), brokenPhasesAgentsMd);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: true,
      force: false,
      platform: 'web',
      kind: 'app',
    });

    expect(result.failed.length).toBeGreaterThan(0);
    expect(result.failed.some((f) => f.includes('Phase 1 row not found'))).toBe(true);
  });

  it('handles missing AGENTS.md without errors (stub projects)', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'cli',
    });

    expect(result.failed).toEqual([]);
    expect(result.written).toContain('docs/STATE.md');
    expect(result.written).toContain('docs/tasks/0-step-01-scaffold.md');
  });

  it('emits no preferences doc and leaves Hard rules alone when nothing was chosen', async () => {
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), sampleAgentsMd);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'web',
      kind: 'app',
      preferences: {},
    });

    expect(result.written).not.toContain('docs/rules/project-preferences.md');
    expect(await exists(path.join(tmp, 'docs', 'rules', 'project-preferences.md'))).toBe(false);
    const agentsContent = await fs.readFile(path.join(tmp, 'AGENTS.md'), 'utf8');
    expect(agentsContent).not.toContain('project-preferences.md');
  });

  it('emits the preferences doc and adds it as a hard rule in AGENTS.md', async () => {
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), sampleAgentsMd);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'web',
      kind: 'app',
      preferences: { comments: 'minimal', viewport: 'web-first' },
    });

    expect(result.written).toContain('docs/rules/project-preferences.md');
    expect(result.failed).toEqual([]);
    const doc = await fs.readFile(path.join(tmp, 'docs', 'rules', 'project-preferences.md'), 'utf8');
    expect(doc).toContain('## Code comments: minimal');
    expect(doc).toContain('## Layout priority: web-first');
    const agentsContent = await fs.readFile(path.join(tmp, 'AGENTS.md'), 'utf8');
    expect(agentsContent).toContain(`2. ${PREFERENCES_RULE_TEXT}`);
  });

  it('does not overwrite an existing preferences doc without force', async () => {
    await fs.mkdir(path.join(tmp, 'docs', 'rules'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'docs', 'rules', 'project-preferences.md'), 'HAND_EDITED');

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'cli',
      preferences: { comments: 'none' },
    });

    expect(result.skipped).toContain('docs/rules/project-preferences.md');
    const doc = await fs.readFile(path.join(tmp, 'docs', 'rules', 'project-preferences.md'), 'utf8');
    expect(doc).toBe('HAND_EDITED');
  });

  it('fails loudly when preferences are set but AGENTS.md has no Hard rules anchor', async () => {
    const noAnchor = sampleAgentsMd
      .split('\n')
      .filter((line) => !line.includes('Project-specific rules get added here.'))
      .join('\n');
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), noAnchor);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'web',
      kind: 'app',
      preferences: { comments: 'full' },
    });

    expect(result.failed.some((f) => f.includes('Hard rules'))).toBe(true);
  });

  it('emits the UI-first task set and points verify-loop at the UI shell', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'web',
      kind: 'app',
      target: 'fullstack',
      preferences: { buildFocus: 'ui-first' },
    });

    expect(result.written).toEqual([
      'docs/STATE.md',
      'docs/tasks/0-step-01-scaffold.md',
      'docs/tasks/0-step-02-verify-loop.md',
      'docs/tasks/0-step-03-ui-shell.md',
      'docs/tasks/0-gate-ui-review.md',
      'docs/tasks/0-gate-deploy.md',
      'docs/tasks/1-step-01-data-round-trip.md',
      'docs/rules/project-preferences.md',
    ]);
    expect(await exists(path.join(tmp, 'docs', 'tasks', '0-step-03-data-round-trip.md'))).toBe(false);
    const verifyLoop = await fs.readFile(path.join(tmp, 'docs', 'tasks', '0-step-02-verify-loop.md'), 'utf8');
    expect(verifyLoop).toContain('**Blocks:** 0-step-03-ui-shell, 0-gate-deploy');
    expect(verifyLoop).not.toContain('0-step-03-data-round-trip');
  });

  it('keeps the plain task set for a UI-first landing page, which has no data to hold back', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
      platform: 'web',
      kind: 'landing',
      preferences: { buildFocus: 'ui-first' },
    });

    expect(result.written.filter((f) => f.startsWith('docs/tasks/'))).toEqual([
      'docs/tasks/0-step-01-scaffold.md',
      'docs/tasks/0-step-02-verify-loop.md',
      'docs/tasks/0-gate-deploy.md',
    ]);
  });
});
