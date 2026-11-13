# Init

`raygent init` generates a new project: a runnable scaffold, product docs, coding rules, an agent layer and a Phase 0 task plan. Every missing answer is asked; every answer can also come from flags, a preset or a JSON spec.

Think of it as a kit house delivery. The frame, the wiring plan and the first week's work orders arrive together, so the crew starts building instead of measuring.

## Quick start

```bash
raygent init my-app                          # asks everything
raygent init my-app --platform web --framework nextjs --type product
mkdir my-app && cd my-app && raygent init --here
```

Most people never run it by hand: `/raygent init` in your agent runs `raygent init --from` for you after the conversation. See [Skills](skills.md).

## Options

| Flag | Values |
|---|---|
| `--platform` | `web`, `mobile`, `cli`, `desktop`, `agent-skills` |
| `--framework` | a framework valid for the platform (table below) |
| `--kind` | web only: `app` (default) or `landing` |
| `--target` | web only: `frontend` (default), `backend`, `fullstack` |
| `--backend` | web only: `express`, `hono`, `nestjs` |
| `--monorepo` | web fullstack only: use Turborepo |
| `--type` | `product` or `client` |
| `--mode` | `guided` (interview) or `quick` (stub docs). See [Interview](interview.md) |
| `--agents` | comma list: `claude-code`, `opencode`, `antigravity` |
| `--rules` | comma list of `docs/rules` files (default: every one that applies) |
| `--comments` | `none`, `minimal`, `full` |
| `--build-focus` | `ui-first` or `end-to-end` |
| `--viewport` | `mobile-first` or `web-first` |
| `--brand` | display name (default: project name, title-cased) |
| `--here` | generate into the current folder |
| `--preset <name>` | apply a preset. See [Config](config.md) |
| `--from <file>` | read every answer from an init spec, no prompts |
| `--template` | print a fillable init spec and exit |
| `--fill-gaps` | with `--from`: ask for missing fields instead of failing |
| `-f, --force` | overwrite existing docs files |

| Platform | Frameworks |
|---|---|
| web | `nextjs`, `vite-react`, `tanstack-start`, `remix` |
| mobile | `react-native` |
| cli | `node`, `python`, `rust` |
| desktop | `electron` |
| agent-skills | `claude-code` |

## Init specs: zero prompts

An init spec is one JSON file that holds every answer: identity, stack, add-ons, agents, rules, interview answers, and the skill and MCP checklists.

```bash
raygent init --template > acme.json   # fillable, with comments
raygent init --from acme.json         # asks nothing
```

You never have to write the first one. Every init records its own answers in `docs/raygent-init.json`. Copy that file, change the names, and `--from` reproduces the setup.

**Precedence:** explicit flag > spec > preset > prompt > default.

A bad spec fails before anything is written, and lists every problem at once:

```
acme.json has 3 problems:
  project.name     "Acme Landing Page" cannot be a folder name ...
  stack.framework  "nextjs14" is not valid (...). Did you mean "nextjs"?
  rules[1]         "style" is not valid (...). Did you mean "code-style"?

Nothing was generated.
```

`--fill-gaps` asks for fields the spec leaves out. It never turns an invalid value into a question: a typo must fail.

## How it works

```
answers (flags > spec > preset > prompts)
   │
   ▼
validate everything ── fail here, nothing written
   │
   ▼
scaffold ── real scaffolder for supported stacks, stub docs otherwise
   │
   ▼
docs + rules + project preferences + AGENTS.md + .claude/
   │
   ▼
skill and MCP checklists ── product registered for the dashboard
```

**Real scaffolds.** `web` (`nextjs`, `vite-react`, `tanstack-start`, plus `--kind landing`), `mobile` (`react-native`, Expo) and `desktop` (`electron`) use the bundled scaffolder from [raygent-scaffolds](https://github.com/arayhan/raygent-scaffolds). You get a real `package.json`, installed dependencies and a feature-driven layout. Set `RAYGENT_CCP_PATH` to point at another copy of its `bin/create.mjs`.

**Stub docs.** Every other combination (including `web` + `remix`) gets raygent's own `docs/` stub set.

**Two names.** The brand is what a visitor reads. The project name is what npm and the filesystem need. Init asks for the brand and derives the project name (`Acme Landing Page` becomes `acme-landing-page`).

**Agents.** `AGENTS.md` is written for every agent. Claude Code also gets `CLAUDE.md` and a `.claude/` layer: subagents, skills, hooks and settings.

**Coding rules.** `docs/rules/` holds one file per concern (`principles`, `code-style`, `testing`, `git-workflow`, `api-conventions`, `sql-and-data`, `ui-styling`, `security`, `accessibility`), gated by your stack.

**Project preferences.** `docs/rules/project-preferences.md` records `--comments`, `--build-focus` and `--viewport`. `ui-first` also changes Phase 0: screens are built on mock data first and signed off at a review gate.

**Stack add-ons.** For `nextjs`, `vite-react` and `tanstack-start`: plain CSS or Tailwind, Zustand, Axios, TanStack Query, Table and Form, React Hook Form, Zod, nuqs, date-fns, design tokens, icon packs, and Storybook for Vite-based stacks.

## What lands

| Artifact | What |
|---|---|
| `AGENTS.md` | how to work in this repo, read by every agent |
| `docs/PRODUCT.md`, `docs/PRD.md` | pre-filled from your answers |
| `docs/architecture.md` | folder map, import rules, and why |
| `docs/rules/` | coding rules for your stack |
| `docs/tasks/` | Phase 0 step and gate tasks |
| `docs/STATE.md` | where the work stands, for `/start` and `/wrap` |
| `docs/raygent-init.json` | this run, replayable with `--from` |
| `.claude/` | agents, skills, hooks (Claude Code only) |

## Troubleshooting

- **"The target must be empty".** raygent never writes over existing files. Use a new folder.
- **Stub docs instead of a real scaffold.** The stack is not supported by the scaffolder, or `raygent doctor` shows the `scaffolder` check failing.
- **A spec typo.** Read the "Did you mean" hint; nothing was generated, so just fix and rerun.
