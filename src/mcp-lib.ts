import fs from 'node:fs/promises';
import path from 'node:path';
import { MCP_CATALOG, type McpServerSpec } from './mcp-catalog.js';

interface McpServerEntry {
  command: string;
  args: string[];
}

interface McpConfig {
  mcpServers: Record<string, McpServerEntry>;
}

function specToEntry(spec: McpServerSpec): McpServerEntry {
  return { command: spec.command, args: spec.args };
}

export async function writeMcpConfig(targetDir: string, selectedIds: string[]): Promise<{ needsEnv: string[] }> {
  const configPath = path.join(targetDir, '.mcp.json');

  let existing: McpConfig = { mcpServers: {} };
  let raw: string | null = null;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        (parsed as McpConfig).mcpServers !== null &&
        typeof (parsed as McpConfig).mcpServers === 'object'
      ) {
        existing = parsed as McpConfig;
      }
    } catch {
      // corrupt .mcp.json: start fresh rather than fail init
    }
  }

  const needsEnv = new Set<string>();
  for (const id of selectedIds) {
    const spec = MCP_CATALOG.find((s) => s.id === id);
    if (!spec) continue;
    existing.mcpServers[spec.id] = specToEntry(spec);
    for (const envVar of spec.env ?? []) needsEnv.add(envVar);
  }

  await fs.writeFile(configPath, JSON.stringify(existing, null, 2) + '\n');
  return { needsEnv: [...needsEnv] };
}
