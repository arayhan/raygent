# MCP servers

During `raygent init`, after the skill checklist, a second checklist offers MCP servers for the new project. Your picks go into the project's `.mcp.json`.

Think of it as plugging accessories into a new workbench before the first job: the agent finds them already connected.

## Quick start

Run `raygent init` and tick the servers you want when the MCP checklist appears. In an init spec, list them in the MCP section so no checklist is shown. See [Init](init.md).

## Available servers

| Id | What it gives the agent |
|---|---|
| `context7` | up-to-date library docs in context (`npx -y @upstash/context7-mcp`) |

## How it works

```
checklist picks
   │
   ▼
read existing .mcp.json (if any)
   │
   ▼
merge: add new servers, leave existing entries untouched
   │
   ▼
write .mcp.json
```

**Secrets are never written.** A server that needs a key gets a `${VAR_NAME}` placeholder, and Claude Code reads the value from your shell when it starts.

## Files

| Path | Holds |
|---|---|
| `<project>/.mcp.json` | the MCP servers for that project |

## Troubleshooting

- **A server fails to start.** Check that the env var named in its `${VAR_NAME}` placeholder is set in your shell.
- **An entry you wrote by hand changed.** It should not: existing entries are never touched. Report it as a bug.
