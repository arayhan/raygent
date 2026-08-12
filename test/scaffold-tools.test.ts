import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { supportsRealScaffold, resolveCcpBin, usingDevScaffolder } from '../src/scaffold-tools.js';

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

  it('resolves to a create.mjs that exists when RAYGENT_CCP_PATH is unset', () => {
    delete process.env.RAYGENT_CCP_PATH;
    const result = resolveCcpBin();
    expect(result.endsWith(path.join('bin', 'create.mjs'))).toBe(true);
    // The point of the fallback chain is that it lands on something real. Which
    // source wins depends on whether this checkout has been built (bundled copy)
    // or not (sibling checkout), so assert existence rather than a fixed path --
    // pinning one source is what made this test assert the pre-bundling bug.
    expect(existsSync(result)).toBe(true);
  });

  it('prefers the bundled copy over the sibling checkout once it has been built', () => {
    delete process.env.RAYGENT_CCP_PATH;
    const bundled = path.join(
      fileURLToPath(new URL('..', import.meta.url)),
      'vendor',
      'scaffolder',
      'bin',
      'create.mjs'
    );
    if (!existsSync(bundled)) return; // not built yet in this checkout
    expect(resolveCcpBin()).toBe(bundled);
    expect(usingDevScaffolder()).toBe(false);
  });
});
