import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { emitProjectState } from '../src/project-emit.js';
import { STATE_DOC_ROW } from '../src/doc-fill.js';

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
  ].join('\n');

  it('emits STATE.md and .claude/commands when hasClaudeCode is true', async () => {
    await fs.writeFile(path.join(tmp, 'AGENTS.md'), sampleAgentsMd);

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: true,
      force: false,
    });

    expect(result.written).toEqual([
      'docs/STATE.md',
      '.claude/commands/start.md',
      '.claude/commands/wrap.md',
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);

    expect(await exists(path.join(tmp, 'docs', 'STATE.md'))).toBe(true);
    expect(await exists(path.join(tmp, '.claude', 'commands', 'start.md'))).toBe(true);
    expect(await exists(path.join(tmp, '.claude', 'commands', 'wrap.md'))).toBe(true);

    const stateContent = await fs.readFile(path.join(tmp, 'docs', 'STATE.md'), 'utf8');
    expect(stateContent.startsWith('# State\n')).toBe(true);

    const agentsContent = await fs.readFile(path.join(tmp, 'AGENTS.md'), 'utf8');
    expect(agentsContent).toContain(STATE_DOC_ROW);
  });

  it('emits STATE.md but does NOT create .claude/ directory when hasClaudeCode is false', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
    });

    expect(result.written).toEqual(['docs/STATE.md']);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);

    expect(await exists(path.join(tmp, 'docs', 'STATE.md'))).toBe(true);
    expect(await exists(path.join(tmp, '.claude'))).toBe(false);
  });

  it('skips existing files when force is false, leaving existing content intact', async () => {
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, 'STATE.md'), 'EXISTING_STATE');

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: true,
      force: false,
    });

    expect(result.skipped).toContain('docs/STATE.md');
    expect(result.written).not.toContain('docs/STATE.md');

    const content = await fs.readFile(path.join(docsDir, 'STATE.md'), 'utf8');
    expect(content).toBe('EXISTING_STATE');
  });

  it('overwrites existing files when force is true', async () => {
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, 'STATE.md'), 'OLD_STATE');

    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: true,
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
    });

    expect(result.failed.length).toBeGreaterThan(0);
    expect(result.failed[0]).toContain('AGENTS.md: Docs table (PROGRESS.md row not found');
  });

  it('handles missing AGENTS.md without errors (stub projects)', async () => {
    const result = await emitProjectState({
      targetDir: tmp,
      hasClaudeCode: false,
      force: false,
    });

    expect(result.failed).toEqual([]);
    expect(result.written).toContain('docs/STATE.md');
  });
});
