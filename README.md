# raygent

Personal CLI for managing Claude Code agent skills and scaffolding new projects
with AI-context docs.

## Install

```bash
npm install -g raygent
```

Requires Node.js >= 20.

## Commands

### Skills

Your own skills live in `~/.raygent/skills/<name>/`. raygent also ships one of its
own (see below). Installs go to `~/.claude/skills/` by default, where they work
from any directory; `--local` targets `./.claude/skills/` instead.

```bash
raygent skill list                  # grouped by what each skill is for
raygent skill list --category design  # one group
raygent skill list --installed      # only what is installed
raygent skill install               # every skill raygent ships -> ~/.claude/skills
raygent skill install <name>        # one skill, from any source (-f to overwrite)
raygent skill install <name> --local  # into this project instead
raygent skill remove <name>         # --local to remove the project copy
```

`list` groups by function — `product`, `design`, `motion`, `code`, `writing`,
`research`, `agent`, `other` — and shows where each one is installed plus a
condensed description and tags:

```
DESIGN (16)
  impeccable        global   Design, redesign, shape, or otherwise improve a
                             frontend interface. Covers websites, landing pages,
                             dashboards, and empty states.
                             tags: ui, ux, critique, frontend

AGENT (7)
  orchestration     global   Use Orca orchestration for structured multi-agent
                             coordination: threaded messages, blocking ask/reply
                             flows, task dispatch.
                             tags: multi-agent, coordination
```

Categories come from a curated table for skills raygent knows, then a prefix rule
for whole families (`firecrawl-*`, `remotion-*`), then keywords in the name and
description. Anything that matches none of those lands in `other` rather than
being guessed — a wrong category hides a skill in a group nobody opens.

Descriptions are condensed, not truncated: the `Use when the user wants to…`
lead-in is dropped, long trigger enumerations are collapsed, and whole sentences
are kept up to a budget, so a line never ends mid-thought.

### The raygent skill — `/raygent init`

raygent ships an agent skill of its own. Install it into a project and your
coding agent can run the whole setup as a conversation:

```bash
npx raygent skill install     # -> ~/.claude/skills/raygent/
# then, in your agent:
/raygent init
```

**Global by default**, because `/raygent init` is used *before* a project exists —
often in an empty directory. A project-local copy of the skill that creates
projects is unreachable exactly when you need it. `--local` installs into
`./.claude/skills/` instead, for a project that wants its own pinned copy.

`raygent init` on its own asks fourteen questions and accepts every answer. The
skill does what a fixed form cannot: it follows up on thin answers, argues with
the plan (riskiest assumption, whether the target user is really "everyone",
whether this is a feature rather than a product), helps cut scope into phases,
picks a stack and says why, then writes an init spec, shows it for approval, and
runs `raygent init --from` with it.

The critique posture is the one behind the optional AI review — except your own
agent does it, so it needs no API key and no config.

A skill of the same name in `~/.raygent/skills/` always wins, so the bundled copy
can never shadow one you wrote.

### Init

Scaffolds a new project, then offers a checklist of recommended skills to
install.

```bash
raygent init [project-name] [options]

Options:
  --platform <platform>    web | mobile | cli | desktop | agent-skills
  --framework <framework>  frontend framework valid for the chosen platform
  --target <target>        web only: frontend | backend | fullstack (default frontend)
  --backend <backend>      web only: express | hono | nestjs
  --monorepo               web fullstack only: use Turborepo
  --type <type>            product | client
  --kind <kind>            web only: app | landing (default app)
  --here                   generate into the current directory, not a new <name> folder
  --agents <list>          comma-separated: claude-code, opencode, antigravity
  --rules <list>           comma-separated docs/rules files (default: all applicable)
  --brand <name>           display name shown to users (default: project name, title-cased)
  --from <file>            read every answer from a JSON init spec — no prompts
  --template               print a fillable init spec to stdout and exit
  --fill-gaps              with --from: prompt for missing fields instead of failing
  -f, --force              overwrite existing docs files (stub-doc path only)
```

### Init specs — fill one file, generate with zero prompts

A full `raygent init` asks a lot: stack, agents, rules, names, then a 14-question
interview, then two checklists. Fine once, tedious by the fifth landing page. An
**init spec** is one JSON file holding every answer:

```bash
raygent init --template > rocsteer.json   # fillable, with comments
$EDITOR rocsteer.json
raygent init --from rocsteer.json              # asks nothing
```

It covers identity, stack, add-ons, agents, rules, the interview answers, and the
skill and MCP checklists — the checklists are prompts too, so leaving them out
would mean "zero prompts" still had two. Comments are stripped on read, so the
explanations in the template stay in your filled file.

**You never have to write the first one by hand.** Every init writes
`docs/raygent-init.json` recording exactly what it was given. Run init once
interactively, copy that file, change the two names, and `--from` reproduces the
setup.

A spec may name a `"preset"` to inherit the stack half rather than repeating it.
Precedence is one rule: **explicit flag > spec > preset > prompt > default.**

**A bad spec fails before anything is written**, and reports every problem at
once rather than one per run:

```
rocsteer.json has 3 problems:
  project.name     "Rocsteer Landing Page" cannot be a folder name — use letters,
                   digits, ".", "_", "-" (the brand goes in project.brand)
  stack.framework  "nextjs14" is not valid (nextjs, vite-react, tanstack-start,
                   remix). Did you mean "nextjs"?
  rules[1]         "style" is not valid (...). Did you mean "code-style"?

Nothing was generated.
```

`--fill-gaps` prompts for fields the spec omits. It never downgrades an invalid
value to a question — a typo must fail, not become a prompt.

By default the project is created in a new `./<name>/` folder. `--here`

**Two names, on purpose.** The **brand name** is what a visitor reads — headings,
the browser tab, the logo, the OG card. The **project name** is what npm and the
filesystem need. Init asks for the brand first and derives the project name from
it (`Rocsteer Landing Page` → `rocsteer-landing-page`), offering that as an
editable default; nothing forces them to match. Given only a project name, the
brand is title-cased from it, so a preset or a scripted run never ships a
kebab-case page title. `--brand` overrides that for names title-casing gets wrong.

By default the project is created in a new `./<name>/` folder. `--here`
generates straight into the current directory instead — for the
`mkdir myapp && cd myapp && raygent init --here` flow, where the project name
then defaults to the folder you are already in. The target must be empty either
way; raygent will not write over existing files.

Any missing argument is prompted for interactively. Framework choices depend on
the platform:

| Platform     | Frameworks                              |
| ------------ | ---------------------------------------- |
| web          | nextjs, vite-react, tanstack-start, remix |
| mobile       | react-native                            |
| cli          | node, python, rust                      |
| desktop      | electron                                |
| agent-skills | claude-code                             |

**Real scaffolding vs stub docs:** `web` (`nextjs`/`vite-react`/`tanstack-start`,
plus `--kind landing`),
`mobile` (`react-native`, Expo-based) and `desktop` (`electron`) delegate to
[`create-client-project`](../raygent-scaffolds)
(a sibling tool) for a fully runnable project — real `package.json`, installed
dependencies, `.claude/` agents, templated docs, and (react-native/electron) a
deletable example feature module demonstrating the feature-driven layout. It
needs to be resolvable on disk; set `RAYGENT_CCP_PATH` to its `bin/create.mjs`
if your checkout layout differs from the default sibling-folder assumption.
Every other platform/framework combination (including `web` + `remix`, not yet
supported by that tool) falls back to raygent's own `./<project-name>/docs/`
stub set:

- **product**: PRD.md, VISION.md, ARCHITECTURE.md, DESIGN.md, ANTISLOP.md,
  DATABASE.md, PROGRESS.md, product-roadmap.md, DESIGN.html
- **client**: PRD.md, scope.md, handoff.md, DESIGN.md, ANTISLOP.md,
  ARCHITECTURE.md, DATABASE.md, PROGRESS.md

**Coding agents:** init asks which agent(s) will work in the project. `AGENTS.md`
is written for all of them — it is the cross-tool convention, and opencode and
Antigravity read it natively. Claude Code additionally gets a `CLAUDE.md` pointer
and the `.claude/` layer (5 subagents, 2 skills, 3 hooks, settings.json), because
it is the only one whose formats raygent can emit correctly rather than guess at.
For the others the same agent roster is described in prose inside `AGENTS.md`,
along with the first-run interview steps. Only `AGENTS.md` is ever edited, so the
instructions cannot drift into two versions.

**Coding rules (`docs/rules/`):** the rules themselves live in one file per
concern — `principles`, `code-style`, `testing`, `git-workflow`, `api-conventions`,
`sql-and-data`, `ui-styling`, `security`, `accessibility` — and `AGENTS.md` and
`docs/architecture.md` point at them rather than restating them. `architecture.md`
keeps the *reasoning* (why a boundary is shaped that way); `docs/rules/` keeps the
*rules*. They sit in `docs/` for every project, whichever coding agent it targets,
because a human reads them too. `--rules` picks the set; the default is every file
that applies to the chosen stack, so a bare API gets no `accessibility.md` and a
static SPA gets no `sql-and-data.md`.

**Agent-only tooling:** a generated project no longer ships an empty `scripts/`
folder, and `db/migrations/` appears only for stacks that can reach a database.
Tooling only the agent runs goes in `.claude/commands/<name>.md` (the slash-command
prompt) plus `.claude/scripts/` for any executable it calls — never in
`package.json`, where it would become a script every human developer scrolls past.
Root `scripts/` is left for real product tooling, and is created by you when there
is something to put in it.

**Landing pages (`platform web` only):** a landing page is a *kind*, not a
framework — it is Next.js with a marketing starter (hero, features, CTA, email
capture, `/api/subscribe`). `--kind landing` skips the target and framework
questions and offers a reduced stack: styling, icon pack, form library, plus Zod
and date-fns. `--kind` stays independent of `--type`, so a landing page can be
built for a client or for your own product.

**Backend and fullstack (`platform web` only):** init first asks what you're
building — frontend only, backend only (`express`/`hono`/`nestjs`), or
fullstack. Fullstack additionally asks whether to use a Turborepo monorepo
(`apps/web` + `apps/api` + `packages/domain`) or two sibling folders.

**Tech stack add-ons:** for `nextjs`/`vite-react`/`tanstack-start`, init also
prompts for styling (plain CSS or Tailwind), a checklist of add-ons (Zustand,
Axios, TanStack Query, date-fns, Zod, TanStack Table, nuqs, design tokens,
plus Storybook for `vite-react`/`tanstack-start`), a form library (React Hook
Form by default, or TanStack Form), and an icon pack. A bare backend root
(`express`/`hono`/`nestjs` with no frontend) only gets the framework-agnostic
add-ons — Zod and date-fns. See `raygent-scaffolds`' `templates/addons/` for
what each add-on actually scaffolds.

### Guided setup & AI feedback

`raygent init` asks for a **setup mode** (or pass `--mode guided|quick`):

- **quick** — scaffold/stub docs only (previous behavior).
- **guided** — a deep interview first: YC-application-style questions for
  `product` (problem, vision, market, business model, riskiest assumption, …)
  or a brief-intake for `client` (requirements, scope, deliverables,
  decision-maker, …). Every question is skippable with Enter. Answers pre-fill
  the generated docs and are saved raw to `docs/interview.json` for
  `/bootstrap-project` and other tooling to build on.

**Optional AI review** (guided mode only): configure an OpenAI-compatible
endpoint and raygent offers YC-partner-style feedback on your answers (saved
to `docs/ai-review.md`) and, optionally, AI elaboration of the pre-filled
docs. Without config, no AI prompts appear at all.

```jsonc
// ~/.raygent/config.json
{
  "ai": {
    "baseUrl": "https://your-omniroute-host/v1",
    "apiKey": "sk-...",
    "model": "your-model-id"
  }
}
```

Env overrides: `RAYGENT_AI_BASE_URL`, `RAYGENT_AI_API_KEY`, `RAYGENT_AI_MODEL`.
All three values are required for the AI steps to activate. AI failures never
fail `init` — the project is complete either way.

### Presets

Save your usual answers once and init in one command:

```bash
raygent config set presets.saas.platform web
raygent config set presets.saas.framework nextjs
raygent config set presets.saas.type product
raygent config set presets.saas.mode guided
raygent config set presets.saas.skills '["impeccable", "ui-ux-pro-max"]'
raygent config set presets.saas.target fullstack
raygent config set presets.saas.backend express
raygent config set presets.saas.monorepo true
raygent config set presets.saas.stack '{"styling":"tailwind","dataFetching":true,"forms":"react-hook-form"}'

raygent init myapp --preset saas   # flags still override preset values
```

A preset with `skills` installs them automatically and skips the checklist. A
preset with `stack` set skips the tech-stack prompts entirely and uses those
values as-is (same shape as the `stack` object above — see `raygent-scaffolds`'
`registry.mjs` for every key).

### MCP servers

After the skill checklist, `raygent init` offers a second checklist for MCP
servers (currently just `context7`) — picks are written to `.mcp.json` in the
new project (merged, existing entries untouched). Servers that need a secret
only get `${VAR_NAME}` placeholders — raygent never writes API keys or
tokens.

### Dashboard

Local monitoring for every product you ship — events, signups, DAU, revenue:

```bash
raygent dashboard             # http://localhost:4321 (--port to change)
```

- Products auto-register on `raygent init` (`raygent product add/list` for
  older ones).
- Products send events to `http://localhost:4321/api/ingest` — the landing
  template's `track()` does this once `NEXT_PUBLIC_ANALYTICS_URL` points at
  the ingest URL (`NEXT_PUBLIC_PRODUCT_ID` overrides the product name).
- Revenue is manual for now: `raygent finance add <product> <amount> [note]`,
  `raygent finance summary`. Data lives in `~/.raygent/` (products.json,
  finance.jsonl, analytics/events.jsonl).

### Config & doctor

```bash
raygent config show          # print config (API key masked)
raygent config get ai.model
raygent config set ai.baseUrl https://your-host/v1
raygent doctor               # check node, pnpm, git, scaffolder, skills, AI endpoint
```

## Development

```bash
npm install
npm run dev    # run from source (tsx)
npm run build  # compile to dist/
npm test       # vitest
```

## License

MIT
