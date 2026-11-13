# Doctor

`raygent doctor` checks that everything raygent needs is in place and prints one line per check. Run it first on a new machine, and whenever something fails in a way you do not understand.

Think of it as the pre-flight checklist: a failed line on the ground is cheaper than a failure in the air.

## Quick start

```bash
raygent doctor
```

```
ok   node             v24.1.0
ok   pnpm             10.12.1
ok   git              git version 2.45.0
ok   scaffolder       .../vendor/scaffolder/bin/create.mjs
ok   personal skills  ~/.raygent/skills
ok   global skills    ~/.agents/skills
ok   ai               not configured (AI steps stay off) -- raygent config set ai.baseUrl ...
ok   accounts         3 accounts, policies for 2 projects
ok   sync             last run 11/13/2026, 11:00 PM ok
```

## The checks

| Check | Passes when | If it fails |
|---|---|---|
| `node` | Node.js is 20 or newer | upgrade Node |
| `pnpm` | `pnpm` is on PATH | install pnpm; generated web projects use it |
| `git` | `git` is on PATH | install git |
| `scaffolder` | the scaffolder script exists | reinstall raygent, or set `RAYGENT_CCP_PATH`; without it you only get stub docs |
| `personal skills` | always (informational): shows `~/.raygent/skills` or "not created yet" | create it to add your own skills |
| `global skills` | always (informational): shows the global agent skills dir or "not found" | nothing to fix |
| `ai` | not configured, or `<baseUrl>/models` answers within 5 s | fix `ai.baseUrl`, `ai.apiKey`, `ai.model`. See [Config](config.md) |
| `accounts` | informational: how many accounts and policies | see [Accounts](accounts.md) |
| `sync` | informational: whether sync is set up and how the last run went | see [Sync](sync.md) |
| `hub` | not configured, or the hub's `/api/health` answers within 5 s | see [Agent Hub](hub.md); sessions report nowhere while it is down |

"Not configured" is a pass for `ai`: the AI steps simply stay off.

## Troubleshooting

- **`scaffolder … missing`.** Point `RAYGENT_CCP_PATH` at a `bin/create.mjs` from raygent-scaffolds, or reinstall raygent.
- **`ai` fails with a network error.** The endpoint is down or the URL is wrong. `raygent init` still works; only the AI steps are skipped.
