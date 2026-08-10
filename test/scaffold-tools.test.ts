import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { supportsRealScaffold, resolveCcpBin } from '../src/scaffold-tools.js';

describe('supportsRealScaffold', () => {
  it('is true for web + each real-scaffold framework', () => {
    expect(supportsRealScaffold('web', 'nextjs')).toBe(true);
    expect(supportsRealScaffold('web', 'vite-react')).toBe(true);
    expect(supportsRealScaffold('web', 'tanstack-start')).toBe(true);
  });

  it('is true for mobile + react-native and desktop + electron', () => {
    expect(supportsRealScaffold('mobile', 'react-native')).toBe(true);
    expect(supportsRealScaffold('desktop', 'electron')).toBe(true);
  });

  it('is false for web + remix (validated framework, no real scaffold yet)', () => {
    expect(supportsRealScaffold('web', 'remix')).toBe(false);
  });

  it('is false for platforms without any real scaffold', () => {
    expect(supportsRealScaffold('cli', 'node')).toBe(false);
    expect(supportsRealScaffold('cli', 'rust')).toBe(false);
    expect(supportsRealScaffold('agent-skills', 'claude-code')).toBe(false);
  });

  it('does not cross-match a framework against the wrong platform', () => {
    expect(supportsRealScaffold('web', 'react-native')).toBe(false);
    expect(supportsRealScaffold('mobile', 'nextjs')).toBe(false);
  });
});

describe('resolveCcpBin', () => {
  const originalEnv = process.env.RAYGENT_CCP_PATH;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.RAYGENT_CCP_PATH;
    else process.env.RAYGENT_CCP_PATH = originalEnv;
  });

  it('honors RAYGENT_CCP_PATH when set', () => {
    process.env.RAYGENT_CCP_PATH = '/custom/path/to/create.mjs';
    expect(resolveCcpBin()).toBe('/custom/path/to/create.mjs');
  });

  it('defaults to the sibling raygent-scaffolds layout when unset', () => {
    delete process.env.RAYGENT_CCP_PATH;
    const result = resolveCcpBin();
    expect(result.endsWith(path.join('raygent-scaffolds', 'bin', 'create.mjs'))).toBe(true);
  });
});
