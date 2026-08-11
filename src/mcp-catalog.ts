export interface McpServerSpec {
  id: string;
  label: string;
  command: string;
  args: string[];
  /** env var names the server needs, written as ${VAR_NAME} so Claude Code
   * reads them from the shell -- raygent never writes secret values. */
  env?: string[];
}

export const MCP_CATALOG: McpServerSpec[] = [
  {
    id: 'filesystem',
    label: 'filesystem (read/write within this project)',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  },
  {
    id: 'postgres',
    label: 'postgres',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', '${DATABASE_URL}'],
    env: ['DATABASE_URL'],
  },
  {
    id: 'sqlite',
    label: 'sqlite',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './dev.db'],
  },
  {
    id: 'supabase',
    label: 'supabase',
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase', '--access-token', '${SUPABASE_ACCESS_TOKEN}'],
    env: ['SUPABASE_ACCESS_TOKEN'],
  },
  {
    id: 'github',
    label: 'github',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
  },
];
