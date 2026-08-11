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
  it('creates .mcp.json with the selected servers', async () => {
    const { needsEnv } = await writeMcpConfig(dir, ['filesystem', 'postgres']);

    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['filesystem', 'postgres']);
    expect(config.mcpServers.postgres.args).toContain('${DATABASE_URL}');
    expect(needsEnv).toEqual(['DATABASE_URL']);
  });

  it('merges into an existing .mcp.json without dropping unrelated servers', async () => {
    fs.writeFileSync(
      path.join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { custom: { command: 'foo', args: [] } } })
    );

    await writeMcpConfig(dir, ['github']);

    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers).sort()).toEqual(['custom', 'github']);
  });

  it('ignores unknown ids and dedupes required env vars', async () => {
    const { needsEnv } = await writeMcpConfig(dir, ['postgres', 'supabase', 'bogus']);
    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['postgres', 'supabase']);
    expect(needsEnv.sort()).toEqual(['DATABASE_URL', 'SUPABASE_ACCESS_TOKEN']);
  });

  it('tolerates a corrupt existing .mcp.json by starting fresh', async () => {
    fs.writeFileSync(path.join(dir, '.mcp.json'), '{not json');
    await writeMcpConfig(dir, ['filesystem']);
    const config = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['filesystem']);
  });
});
