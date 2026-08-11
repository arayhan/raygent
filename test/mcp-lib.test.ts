import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeMcpConfig } from '../src/mcp-lib.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-mcp-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('writeMcpConfig', () => {
  it('creates .mcp.json with the selected server', async () => {
    const { needsEnv } = await writeMcpConfig(dir, ['context7']);

    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['context7']);
    expect(config.mcpServers.context7).toEqual({ command: 'npx', args: ['-y', '@upstash/context7-mcp'] });
    expect(needsEnv).toEqual([]);
  });

  it('merges into an existing .mcp.json without dropping unrelated servers', async () => {
    fs.writeFileSync(
      path.join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { custom: { command: 'foo', args: [] } } })
    );

    await writeMcpConfig(dir, ['context7']);

    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers).sort()).toEqual(['context7', 'custom']);
  });

  it('ignores unknown ids', async () => {
    const { needsEnv } = await writeMcpConfig(dir, ['context7', 'bogus']);
    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['context7']);
    expect(needsEnv).toEqual([]);
  });

  it('tolerates a corrupt existing .mcp.json by starting fresh', async () => {
    fs.writeFileSync(path.join(dir, '.mcp.json'), '{not json');
    await writeMcpConfig(dir, ['context7']);
    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['context7']);
  });
});
