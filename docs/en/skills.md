# Skills

`raygent skill` installs, lists and removes agent skills. A skill is a folder with a `SKILL.md` that teaches your coding agent one job. raygent ships one of its own, `/raygent init`.

Think of it as a toolbelt manager: it knows every tool you own, which pocket each one is in, and puts new ones where every agent can reach them.

## Quick start

```bash
raygent skill install           # every skill raygent ships -> ~/.claude/skills
raygent skill list --installed  # what is installed, grouped by purpose
```

## Commands

| Command | Does |
|---|---|
| `raygent skill list` | List every skill, grouped by what it is for, with where it is installed |
| `raygent skill list --category <c>` | One group: `product`, `design`, `motion`, `code`, `writing`, `research`, `agent`, `other` |
| `raygent skill list --source <s>` | One source: `personal`, `project`, `global`, `bundled` |
| `raygent skill list --installed` | Only skills installed somewhere |
| `raygent skill install` | Install every skill raygent ships into `~/.claude/skills` |
| `raygent skill install <name>` | Install one skill from any source |
| `raygent skill install <name> --local` | Install into `./.claude/skills` for this project only |
| `raygent skill install <name> -f` | Overwrite an existing install |
| `raygent skill remove <name>` | Remove from `~/.claude/skills` (`--local`: from this project) |

## The raygent skill: `/raygent init`

```bash
raygent skill install     # -> ~/.claude/skills/raygent/
```

Then, in your agent, type `/raygent init`.

It installs **globally on purpose**. You use it before a project exists, often in an empty folder, so a project-local copy would be unreachable exactly when you need it.

What the skill does that a fixed form cannot:

1. It follows up on thin answers.
2. It argues with the plan: the riskiest assumption, whether the target user is really "everyone", whether this is a feature inside somebody else's product.
3. It cuts scope into phases and says the non-goals out loud.
4. It picks a stack and gives one reason per choice.
5. It writes an init spec, shows it for approval, then runs `raygent init --from` with it.

`/raygent bootstrap` routes to a generated project's own `/bootstrap-project` skill, so an old project is finished by the flow its generation shipped with.

## How sources are resolved

```
~/.raygent/skills/<name>   your own skills: always win
        │
        ▼
bundled with raygent       beats copies in shared agent dirs
        │
        ▼
./.agent, ~/.agents, ~/.gemini, ~/.claude
```

Your own skill always wins, so the bundled copy can never shadow one you wrote. The bundled copy beats old installs in shared agent dirs, so `skill install -f` can always refresh them.

## How categories are picked

1. A curated table for skills raygent knows.
2. A prefix rule for whole families (`firecrawl-*`, `remotion-*`).
3. Keywords in the name and description.
4. Anything else lands in `other`. A wrong guess would hide a skill in a group nobody opens.

Descriptions in `list` are condensed, not cut: lead-ins like "Use when the user wants to…" are dropped and whole sentences are kept, so a line never ends mid-thought.

## Files

| Path | Role |
|---|---|
| `~/.raygent/skills/<name>/` | your own skills (source) |
| `~/.claude/skills/<name>/` | default install target |
| `./.claude/skills/<name>/` | `--local` install target |

## Troubleshooting

- **A skill shows as `other`.** No rule matched. It still works; only its group is generic.
- **An old version keeps loading.** Run `raygent skill install <name> -f`.
- **`/raygent init` is not found in a new folder.** You installed it with `--local` somewhere else. Install it globally.
