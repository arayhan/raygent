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
    id: 'context7',
    label: 'context7 (up-to-date library docs in context)',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
  },
];
