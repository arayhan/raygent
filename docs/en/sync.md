# Sync

`raygent sync` lets you move between laptops and find the same agent memory, the same resumable Claude Code sessions and the same account policies, even when your projects sit at different paths on each laptop.

Think of it as a shared locker with a label per project. Each laptop knows where its own copy of the project lives, and the locker only cares about the label.

## Quick start

```bash
raygent sync              # pull, merge, push everything
raygent sync status       # what syncs from this laptop, and how the last run went
raygent sync install-task # run it every 15 minutes in the background
```

## Commands

| Command | Does |
|---|---|
| `raygent sync` | run every phase: git in, accounts, git out, sessions |
| `raygent sync --dry-run` | show what would happen and change nothing |
| `raygent sync --quiet` | print problems only, always exit 0 (for hooks and the task) |
| `raygent sync --no-git` / `--no-accounts` / `--no-sessions` | skip one phase |
| `raygent sync status` | the repo and its remote, mapped projects, the sessions host and its size, folders left out, the last run |
| `raygent sync install-task` | Windows: a hidden Task Scheduler job every 15 minutes. Elsewhere: prints a crontab line |

## What travels, and how

| What | Where it goes |
|---|---|
| memory and agent instructions | a private git repo, the "brain" (`~/raygent-brain`, or `RAYGENT_BRAIN_DIR`) |
| account policies | `accounts.json` in the brain, keyed by project slug; config dirs stay per laptop |
| Claude Code sessions | rsync to a server you own, one folder per project slug |

Logins never move. Run `raygent accounts discover` on each laptop. See [Accounts](accounts.md).

## How a run works

```
1. git in     commit local changes, pull --rebase
2. accounts   merge ~/.raygent/accounts.json with the brain's copy
3. git out    commit, push
4. sessions   pull new transcripts from the server, push changed ones
```

Each phase reports on its own. If one fails, the others still run.

**Slugs.** The brain maps each project to a slug per laptop in `hosts/<COMPUTERNAME>.json`:

```json
{ "my-app": "D:\\work\\my-app", "notes": "C:\\Users\\me\\notes" }
```

The other laptop can keep `my-app` at a different path. Sessions are stored by slug on the server and pulled into the folder for this laptop's path, so `claude --resume` finds them.

**Sessions config.** `sync.json` in the brain:

```json
{ "sessions": { "host": "user@your-vps", "key": "~/.ssh/your_key", "dir": "raygent-sync/sessions", "keepDays": 30 } }
```

- Only sessions from the last `keepDays` come back down.
- Nothing is ever deleted on either side.
- A stalled transfer gives up after 60 s and is retried next run.
- On Windows, rsync runs from WSL (`wsl -e rsync`) with Windows OpenSSH as transport. Set `"rsync": "native"` to use an rsync on PATH instead.

**Conflicts.**

- A conflict in the synced accounts files resolves itself.
- A memory file edited on both laptops stops the git step until you fix it by hand. The other steps keep running.
- A session continued on both laptops between syncs: the newer file wins whole.

## A new laptop

1. Install raygent and run `raygent doctor`.
2. Clone your brain repo to `~/raygent-brain` and copy the SSH key named in `sync.json` to the same path.
3. Add this laptop's `hosts/<COMPUTERNAME>.json` with the paths of your projects.
4. Log in your agent accounts, then run `raygent accounts discover` and `raygent accounts install-hooks`.
5. Run `raygent sync` once by hand (the first pull can be large), then `raygent sync install-task`.

To sync at every session start and end too, add `raygent sync --quiet` as a `SessionStart` and `SessionEnd` hook with a timeout of about 120 s.

## Files

| Path | Holds |
|---|---|
| `~/raygent-brain/` | the brain repo: memory, instructions, `accounts.json`, `hosts/`, `sync.json` |
| `~/.raygent/sync-state.json` | last run, per-phase results, push marks |
| `~/.raygent/sync.lock` | stops two runs at once; stale after 10 minutes |
| `~/.claude/projects/<key>/` | local Claude Code transcripts that get synced |

## Troubleshooting

- **`status` lists unmapped folders.** Those projects have sessions but no slug. Add them to `hosts/<COMPUTERNAME>.json`.
- **"Connection reset" on a push.** The network dropped. The next run retries that folder.
- **Git step reports a conflict.** Resolve the named memory files in the brain repo, commit, and run `raygent sync` again.
- **A hook run feels slow.** Many live sessions mean many pushes. The 15-minute task finishes whatever a hook leaves.
