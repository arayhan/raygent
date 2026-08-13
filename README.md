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

Skills live in `~/.raygent/skills/<name>/` and are installed per-project into
`./.claude/skills/<name>/`.

```bash
raygent skill add <name>      # copy a skill into the current project (-f to overwrite)
raygent skill list            # list available skills and their install status
raygent skill remove <name>   # remove an installed skill from the current project
```

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
  -f, --force              overwrite existing docs files (stub-doc path only)
```

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
concern — `code-style`, `testing`, `git-workflow`, `api-conventions`,
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
