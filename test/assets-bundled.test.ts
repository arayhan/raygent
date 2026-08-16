import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { bundledAssetsDir } from '../src/paths.js';

describe('bundled assets', () => {
  it('resolves to a directory that exists in this checkout', async () => {
    const stat = await fs.stat(bundledAssetsDir());
    expect(stat.isDirectory()).toBe(true);
  });

  it('ships STATE.md with header comment, Phase 0, and hard cap <= 30 lines', async () => {
    const stateMd = await fs.readFile(path.join(bundledAssetsDir(), 'project', 'STATE.md'), 'utf8');
    expect(stateMd.startsWith('# State\n')).toBe(true);
    expect(stateMd).toContain('**Phase:** 0 — walking skeleton');
    expect(stateMd).toContain('**Next up:** 0-step-01-scaffold');
    expect(stateMd).toContain('## In flight');
    expect(stateMd).toContain('## Parked');
    const lines = stateMd.split('\n');
    expect(lines.length).toBeLessThanOrEqual(30);
  });

  it('ships commands/start.md with orientation instructions', async () => {
    const startMd = await fs.readFile(path.join(bundledAssetsDir(), 'project', 'commands', 'start.md'), 'utf8');
    expect(startMd.startsWith('---')).toBe(true);
    expect(startMd).toMatch(/^description: /m);
    expect(startMd).toContain('docs/STATE.md');
    expect(startMd).toContain('.claude/commands/verify.md');
    expect(startMd).toContain('docs/tasks/');
  });

  it('ships commands/wrap.md with session wrap instructions', async () => {
    const wrapMd = await fs.readFile(path.join(bundledAssetsDir(), 'project', 'commands', 'wrap.md'), 'utf8');
    expect(wrapMd.startsWith('---')).toBe(true);
    expect(wrapMd).toMatch(/^description: /m);
    expect(wrapMd).toContain('docs/STATE.md');
    expect(wrapMd).toContain('docs/PROGRESS.md');
    expect(wrapMd).toContain('docs/rules/git-workflow.md');
    expect(wrapMd).toContain('docs/LESSONS.md');
  });
});

describe('packaging', () => {
  it('lists assets in package.json files', async () => {
    const pkgPath = path.join(bundledAssetsDir(), '..', 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as { files?: string[] };
    expect(pkg.files ?? []).toContain('assets');
  });

  it('has the asset files the manifest promises', async () => {
    await expect(fs.access(path.join(bundledAssetsDir(), 'project', 'STATE.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(bundledAssetsDir(), 'project', 'commands', 'start.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(bundledAssetsDir(), 'project', 'commands', 'wrap.md'))).resolves.toBeUndefined();
  });
});
