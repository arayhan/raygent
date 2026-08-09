# raygent — `skill` command (v1 design)

## Purpose

`raygent` is a personal CLI. Long-term it will also scaffold new projects (`raygent init <project-name> <framework>`) with an AI-docs folder (purpose, PRD, etc). That command is **out of scope** for this spec — it gets its own design later.

This spec covers only the first shippable piece: **`raygent skill`**, which installs personal Claude Code agent skills into a project's `.claude/skills/` folder.

## Goals

- Maintain one personal library of Claude Code skills, reusable across projects.
- Copy a skill from that library into any project with one command.
- List and remove installed skills.

## Non-goals (v1)

- Remote/registry skill sources (GitHub, npm) — local-only for now.
- Global (`~/.claude/skills`) install target — project-local only.
- Symlinking — copy only.
- `raygent init` and AI-docs scaffolding — separate future spec.

## Architecture

```
~/.raygent/skills/<skill-name>/SKILL.md, ...    <- personal skill library (source)
./.claude/skills/<skill-name>/                  <- project install target (destination)
```

- **Language/tooling:** TypeScript, compiled to Node.js. CLI framework: Commander.js.
- **Package/bin name:** `raygent` (npm name confirmed available, unscoped).
- **Distribution:** published to npm as a public package (`npm install -g raygent`). During development, run via `npm link`.
- **Skill source root:** `~/.raygent/skills/`, one subfolder per skill (matches Claude Code's own skill folder shape — a `SKILL.md` plus any supporting files). No config file in v1; the path is fixed. (A config-file override can be added later without breaking this default.)

## Commands

| Command | Behavior |
|---|---|
| `raygent skill add <name>` | Copies `~/.raygent/skills/<name>/` → `./.claude/skills/<name>/` in the current working directory. Fails with a clear error if the source skill doesn't exist, or if the destination already exists (no silent overwrite — require `--force` to overwrite). |
| `raygent skill list` | Lists skill names found in `~/.raygent/skills/`, and marks which ones are already installed in the current project (`./.claude/skills/`). |
| `raygent skill remove <name>` | Deletes `./.claude/skills/<name>/` from the current project. Only touches the project copy — never touches `~/.raygent/skills/`. |

### Error handling

- `add`: source folder missing → exit non-zero with "skill '<name>' not found in ~/.raygent/skills". Destination exists → exit non-zero unless `--force`.
- `remove`: destination missing → exit non-zero with "skill '<name>' not installed in this project".
- No `.claude/` folder yet in cwd → `add` creates `.claude/skills/` as needed (project may not have used Claude Code skills before).

## Data flow

1. User runs `raygent skill add my-skill` inside a project directory.
2. CLI resolves `~/.raygent/skills/my-skill` as source, `<cwd>/.claude/skills/my-skill` as destination.
3. Validates source exists, destination doesn't (or `--force` given).
4. Recursively copies the folder.
5. Prints confirmation with destination path.

## Testing

- Unit tests around the copy/list/remove logic using a temp directory standing in for both `~/.raygent/skills` and the project `.claude/skills` (inject both roots so tests don't touch the real home directory).
- No network calls in v1, so no mocking needed there.

## Future extension points (not built now, but shape should allow it)

- `--global` flag to install into `~/.claude/skills` instead of project-local.
- Remote sources (git URL, npm package) for `raygent skill add`.
- Config file at `~/.raygent/config.json` to override the skills-root path.
- `raygent init <project-name> <framework>` as a sibling command, sharing the same CLI binary and `commander` program instance.
