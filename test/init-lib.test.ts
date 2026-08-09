import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initProject, docTitle } from '../src/init-lib.js';

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-init-'));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe('docTitle', () => {
  it('derives titles from filenames', () => {
    expect(docTitle('PRD.md')).toBe('PRD');
    expect(docTitle('product-roadmap.md')).toBe('Product Roadmap');
    expect(docTitle('handoff.md')).toBe('Handoff');
  });
});

describe('initProject', () => {
  it('creates the 9 product docs, including DESIGN.html', async () => {
    const { docsDir } = await initProject({ projectName: 'demo', framework: 'next', type: 'product' }, cwd);

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
        'VISION.md',
        'product-roadmap.md',
      ].sort()
    );
    expect(fs.readFileSync(path.join(docsDir, 'PRD.md'), 'utf8')).toContain('# PRD');
  });

  it('creates the 8 client docs, without DESIGN.html', async () => {
    const { docsDir } = await initProject({ projectName: 'demo', framework: 'node', type: 'client' }, cwd);

    const files = fs.readdirSync(docsDir).sort();
    expect(files).toEqual(
      ['ANTISLOP.md', 'ARCHITECTURE.md', 'DATABASE.md', 'DESIGN.md', 'PRD.md', 'PROGRESS.md', 'handoff.md', 'scope.md'].sort()
    );
    expect(files).not.toContain('DESIGN.html');
  });

  it('rejects an invalid framework and creates nothing', async () => {
    await expect(initProject({ projectName: 'demo', framework: 'ruby', type: 'product' }, cwd)).rejects.toThrow(
      /invalid framework/
    );
    expect(fs.existsSync(path.join(cwd, 'demo'))).toBe(false);
  });

  it('rejects an invalid type and creates nothing', async () => {
    await expect(initProject({ projectName: 'demo', framework: 'next', type: 'internal' }, cwd)).rejects.toThrow(
      /invalid type/
    );
    expect(fs.existsSync(path.join(cwd, 'demo'))).toBe(false);
  });

  it('rejects an invalid project name like ".." without touching the filesystem', async () => {
    await expect(initProject({ projectName: '..', framework: 'next', type: 'product' }, cwd)).rejects.toThrow(
      /invalid project name/
    );
    expect(fs.readdirSync(cwd)).toEqual([]);
  });

  it('rejects a project name containing a slash', async () => {
    await expect(initProject({ projectName: 'a/b', framework: 'next', type: 'product' }, cwd)).rejects.toThrow(
      /invalid project name/
    );
  });

  it('refuses to overwrite existing docs without --force, naming the conflict', async () => {
    await initProject({ projectName: 'demo', framework: 'next', type: 'client' }, cwd);
    const prdPath = path.join(cwd, 'demo', 'docs', 'PRD.md');
    fs.writeFileSync(prdPath, 'do not touch');

    await expect(initProject({ projectName: 'demo', framework: 'next', type: 'client' }, cwd)).rejects.toThrow(
      /PRD\.md/
    );
    expect(fs.readFileSync(prdPath, 'utf8')).toBe('do not touch');
  });

  it('overwrites existing docs when --force is set', async () => {
    await initProject({ projectName: 'demo', framework: 'next', type: 'client' }, cwd);
    const prdPath = path.join(cwd, 'demo', 'docs', 'PRD.md');
    fs.writeFileSync(prdPath, 'stale content');

    await initProject({ projectName: 'demo', framework: 'next', type: 'client', force: true }, cwd);

    expect(fs.readFileSync(prdPath, 'utf8')).toContain('# PRD');
  });

  it('succeeds when the project folder already exists with unrelated files', async () => {
    fs.mkdirSync(path.join(cwd, 'demo'), { recursive: true });
    const sentinel = path.join(cwd, 'demo', 'README.md');
    fs.writeFileSync(sentinel, 'keep me');

    await initProject({ projectName: 'demo', framework: 'next', type: 'client' }, cwd);

    expect(fs.readFileSync(sentinel, 'utf8')).toBe('keep me');
    expect(fs.existsSync(path.join(cwd, 'demo', 'docs', 'PRD.md'))).toBe(true);
  });
});
