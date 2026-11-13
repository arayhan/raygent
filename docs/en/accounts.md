# Accounts

`raygent accounts` registers your AI accounts and sets, per project, which of them it may use and in what fallback order. `raygent claude` and `raygent gemini` then launch the agent under the first allowed account that is not rate-limited.

Think of it as a key cabinet with a rule card on each door: the office key only opens office projects, and when one key is worn out for the day, you take the next one on the card.

No token is ever stored. A Claude account is a `CLAUDE_CONFIG_DIR` folder that is already logged in. A Gemini account is the name of an env var.

## Quick start

```bash
raygent accounts discover            # register every logged-in Claude Code
raygent accounts allow personal work # in a project: personal first, work as backup
raygent claude                       # runs as the first allowed, non-limited account
```

## Commands

| Command | Does |
|---|---|
| `raygent accounts discover` | register every logged-in Claude Code config dir (Orca profiles and `~/.claude`) |
| `raygent accounts add <id>` | register one by hand: `--provider claude\|gemini`, `--config-dir <dir>`, `--env KEY=$VAR` |
| `raygent accounts remove <id>` | forget an account and drop it from every policy |
| `raygent accounts list` | list registered accounts |
| `raygent accounts allow <id...>` | set the accounts this project may use, in fallback order (`--project <path>`) |
| `raygent accounts policy` | show the policy for this project (`--project <path>`) |
| `raygent accounts limit <id>` | mark an account rate-limited, 5 hours by default (`--until 7:30pm` or ISO time, `--clear`) |
| `raygent accounts check` | report whether this session's account is allowed (`--hook` for a short warning) |
| `raygent accounts observe` | hook target: records a usage limit seen in the transcript |
| `raygent accounts install-hooks` | add the `check` and `observe` hooks to every registered Claude account |
| `raygent claude [args]` | run `claude` under the picked account (`--account <id>` to force one) |
| `raygent gemini [args]` | run `gemini` the same way |

`--env` values that start with `$` are read from your environment at launch, never stored.

## How an account is picked

```
raygent claude in a project
   │
   ▼
policy for this project? ── no ── every registered account may run
   │ yes
   ▼
walk the allowed list in order
   │
   ▼
skip accounts marked limited (until their reset time)
   │
   ▼
first one left ── launch with its CLAUDE_CONFIG_DIR
(all limited ── launch on the first; Claude shows its own limit message)
```

**Limits mark themselves.** When Claude Code prints `Usage limit reached`, the `observe` hook marks the account until its reset time, and the next launch skips it.

**Warnings, not blocks.** The `check` hook warns at session start when a session runs under an account the project does not allow. It never stops the session.

**Forcing one.** `raygent claude --account work` runs that account even when the policy excludes it, and warns.

## Files

| Path | Holds |
|---|---|
| `~/.raygent/accounts.json` | accounts, limits and policies keyed by project path |
| `<config dir>/settings.json` | the hooks `install-hooks` adds |

On several laptops, [Sync](sync.md) shares the policies by project slug, and the [Orca plugin](orca.md) shows and edits them.

## Troubleshooting

- **"no gemini account allowed for …".** The project policy lists no Gemini account. Add one to `raygent accounts allow`.
- **An account is skipped though it works again.** Run `raygent accounts limit <id> --clear`.
- **A new Orca profile is missing.** Log it in, then run `raygent accounts discover` again.
- **An open session keeps its account.** Switching means a new session; `--continue` only finds sessions inside the same account folder.
