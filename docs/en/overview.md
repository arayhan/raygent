# Overview

raygent is a command-line tool that takes a raw idea to a runnable repo your coding agents already know how to work in. Around that core it also manages your agent skills, your AI accounts, and the memory and sessions you carry between laptops.

Think of it as a site foreman. It does not lay every brick, but it hands each crew (Claude Code, opencode, Antigravity) the plans, the rules and the first work order before they start.

## Install

```bash
npm install -g raygent
raygent doctor          # check the environment first
raygent skill install   # the raygent skill, once per machine
```

raygent needs Node.js 20 or newer. Then, in an empty folder, type `/raygent init` in your coding agent.

## The services

| Service | Command | What it is for |
|---|---|---|
| [Skills](skills.md) | `raygent skill` | Install, list and remove agent skills, including raygent's own `/raygent init` |
| [Init](init.md) | `raygent init` | Generate a project: scaffold, docs, coding rules, agent layer, Phase 0 tasks |
| [Interview and AI review](interview.md) | `raygent init --mode guided`, `raygent brief` | Turn your answers into pre-filled product docs, with optional AI critique |
| [Config and presets](config.md) | `raygent config` | Store defaults, presets and the AI endpoint |
| [MCP servers](mcp.md) | part of `raygent init` | Write MCP servers into the new project's `.mcp.json` |
| [Dashboard](dashboard.md) | `raygent dashboard`, `product`, `finance` | Watch events, signups and revenue for what you ship |
| [Accounts](accounts.md) | `raygent accounts`, `raygent claude`, `raygent gemini` | Decide which AI account each project may use, and skip rate-limited ones |
| [Sync](sync.md) | `raygent sync` | Carry memory, account policies and Claude Code sessions between laptops |
| [Doctor](doctor.md) | `raygent doctor` | Check that everything raygent needs is in place |
| [Orca plugin](orca.md) | raygent-orca | See and edit the account policy inside Orca |

## From idea to phase 1

```
 idea, or the docs you already have
   │
   ▼
 /raygent init ── interview, pushback, phase 1 cut, stack with reasons
   │
   ▼
 docs/raygent-init.json ── shown to you for approval
   │  approve
   ▼
 raygent init --from ── runnable repo + AGENTS.md + docs/ + rules + .claude/
   │
   ▼
 /bootstrap-project ── fills the TODO(content) gaps
   │
   ▼
 tasks ── build ── /verify ── code review
   │
   ▼
 raygent dashboard ── watch it once it is live
```

raygent stops at a built, verified phase 1. Deploying is yours.

## Where raygent keeps its files

| Path | Holds |
|---|---|
| `~/.raygent/config.json` | config and presets ([Config](config.md)) |
| `~/.raygent/skills/` | your own skills ([Skills](skills.md)) |
| `~/.raygent/accounts.json` | AI accounts and project policies ([Accounts](accounts.md)) |
| `~/.raygent/products.json`, `finance.jsonl`, `analytics/` | dashboard data ([Dashboard](dashboard.md)) |
| `~/.raygent/sync-state.json`, `sync.lock` | sync bookkeeping ([Sync](sync.md)) |
