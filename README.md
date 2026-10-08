# raygent

**From a raw idea to a runnable repo your coding agents already know how to work
in — through a conversation that argues with your plan first.**

raygent interviews you, pushes back on the weak parts, cuts phase 1, picks a stack
and says why, then generates a real project: runnable code, product docs, coding
rules, and a task plan your agent picks up on its first session.

[Install](#install) · [Flagship](#flagship-raygent-init) · [Features](#features) ·
[How it compares](#how-it-compares) · [Tutorial](#tutorial-from-scratch-to-product-ready) ·
[Commands](#commands)

## Why raygent

- **Agents start every repo cold.** A fresh scaffold tells Claude Code, opencode
  or Antigravity nothing about the product, the boundaries or what to build first.
  raygent ships `AGENTS.md`, `docs/rules/` and a Phase 0 task plan, so the first
  session starts working instead of guessing.
- **Scaffolders give you code without a plan; spec tools give you a plan without
  code.** raygent produces both from one conversation, and the plan is written
  into the repo the code lives in.
- **A form accepts every answer.** The `/raygent init` skill does not. It names
  the riskiest assumption, refuses "everyone" as a target user, and says so when
  the idea is a feature inside somebody else's product — once, clearly, then it
  builds what you asked for.
- **Rules are enforced, not just written.** ESLint `no-restricted-imports` zones
  fail the build on a crossed module boundary, `/verify` quotes lint, test and
  build output, and the code reviewer is read-only so it keeps reporting.

## Flagship: `/raygent init`

One conversation in your coding agent, from idea to a verified phase 1:

```
 idea, or the docs you already have (PRD, ROADMAP, PDF ...)
   │
   ▼
 interview ── pushback: riskiest assumption, first user, feature-vs-product
   │
   ▼
 phase 1 cut + non-goals said out loud ── stack picked, one reason per choice
   │
   ▼
 raygent-init.json ── shown to you; nothing exists yet, last cheap change
   │  approve
   ▼
 raygent init --from ── runnable repo + AGENTS.md + docs/ + rules + .claude/
   │
   ▼
 /bootstrap-project ── fills the TODO(content) gaps the interview left
   │
   ▼
 step / gate tasks ── build ── /verify ── code-reviewer: APPROVE | FIX-FIRST
```

Existing docs are adopted with provenance — each answer shows the file it came
from — and nothing is invented: an unanswered question stays a visible
`TODO(content)`. What lands in the repo is listed in
[tutorial step 6](#6-approve-the-spec-then-generate).

## Features

| Feature | What you get |
|---|---|
| **Conversational init** | `/raygent init` skill: interview, critique, phase cut, stack with reasons, approved spec, generation |
| **Adopt existing docs** | Reads `PRD*`, `ROADMAP*`, `SPEC*`, `BRIEF*`… (`.md`, `.txt`, `.pdf`) and shows what it took from where |
| **Real scaffolds** | Next.js, Vite React, TanStack Start, landing pages, Express / Hono / NestJS backends, fullstack with optional Turborepo, React Native (Expo), Electron |
| **Stack add-ons** | Tailwind, Zustand, TanStack Query / Table / Form, React Hook Form, Zod, nuqs, date-fns, Storybook, icon packs, design tokens |
| **Agent layer** | `AGENTS.md` for Claude Code, opencode and Antigravity; Claude Code also gets subagents, skills, hooks and settings |
| **Coding rules** | `docs/rules/` — principles, code-style, testing, git-workflow, API, SQL, UI styling, security, accessibility — gated by stack |
| **Project preferences** | Comment density (none / minimal / full), build order (UI-first with a review gate / end-to-end), layout (mobile-first / web-first) |
| **Phase 0 walking skeleton** | Step and gate task files, `docs/STATE.md`, `/start` and `/wrap` session commands |
| **Init specs & presets** | One JSON file replays a whole setup with zero prompts, validated before any write; every run records its own |
| **Skill manager** | Categorised `skill list`; installs to `~/.claude`, `~/.agents` and `~/.gemini` skill dirs at once |
| **MCP setup** | Checklist written to `.mcp.json`; secrets stay `${VAR}` placeholders, never written |
| **Optional AI review** | YC-partner-style feedback and doc elaboration through any OpenAI-compatible endpoint |
| **Dashboard** | Local events, signups, DAU and revenue for every product you ship |
| **`doctor`** | Checks node, pnpm, git, the scaffolder, skills and the AI endpoint before anything runs |

## How it compares

✅ yes · ◐ partly · — no

| | Interview that pushes back | Product docs (PRD, roadmap) | Runnable stack scaffold | Agent rules in the repo | Phase / gate task plan | Replayable setup spec |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **raygent** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GitHub Spec Kit | ◐ | ✅ | — | ✅ | ◐ | — |
| BMAD Method | ✅ | ✅ | — | ✅ | ◐ | — |
| Agent OS | ◐ | ✅ | — | ✅ | ◐ | — |
| superpowers (skills) | ◐ | ◐ | — | — | ◐ | — |
| gstack (skills) | ✅ | ◐ | — | — | ◐ | — |
| create-next-app / create-t3-app | — | — | ✅ | — | — | ◐ |
| Claude Code `/init` | — | — | — | ◐ | — | — |
| Lovable / Bolt / v0 | ◐ | — | ✅ | — | — | — |

**Where raygent fits.** Spec frameworks such as Spec Kit, BMAD and Agent OS give
you the planning discipline but leave you to bring the codebase. Scaffolders give
you the codebase with no product context. `/init` documents a repo that already
exists. raygent is for the moment *before* the repo exists, and hands you both
halves at once.

Process skills such as superpowers and gstack are complements, not rivals: they
shape how work happens inside a repo, and raygent's init offers a skill checklist
to install exactly those into the new project.

**What raygent does not do.** It does not deploy — it stops at a built, verified
phase 1. And for a throwaway prototype you want to click today, a hosted builder
is faster.

<sub>Compared against each project's public documentation as of October 2026.
Corrections are welcome as issues.</sub>

## Install

```bash
npm install -g raygent
raygent skill install        # the raygent skill, once per machine
```

Requires Node.js >= 20. Then, in an empty folder, run **`/raygent init`** in your
coding agent.

## Tutorial: from scratch to product-ready

An idea and an empty folder, through to a built phase 1 you can watch in a
dashboard. Every step names what it produces, so you can tell it worked without
waiting for an error.

### 1. Install and check the environment

```bash
npm install -g raygent
raygent doctor          # node, pnpm, git, scaffolder, skills, AI endpoint
```

`doctor` failing here is cheaper than `init` failing at step 6.

### 2. Install the raygent skill, once per machine

```bash
raygent skill install   # -> ~/.claude/skills/raygent/
```

Global on purpose: you use it *before* a project exists, so a project-local copy
would be unreachable exactly when you need it.

### 3. Start the conversation

```bash
mkdir my-idea && cd my-idea
```

Then in your agent: **`/raygent init`**

**3b — if you already have docs.** Run it in the folder that holds them instead.
It scans for `PRD*`, `PRODUCT*`, `ROADMAP*`, `TASKS*`, `DECISIONS*`, `SPEC*`,
`BRIEF*`, `NOTES*` or a lone markdown file, maps them onto the interview
questions, and **shows you what it took and from where** before using any of it:

```
Adopted 9 of 14 from your docs:
  problem             Brokers quote in spreadsheets…     PRD.md
  roadmap             3 phases                           ROADMAP.md
  riskiestAssumption  Carriers will accept API quotes    DECISIONS.md
Not found: market, businessModel, successMetrics, differentiation, insight
```

Correct anything wrong. It does not invent: a question your docs do not answer
stays a gap and gets asked in step 4.

**Formats it can read:** `.md`, `.txt`, `.pdf`. **`.docx` it cannot** — export to
PDF, Markdown or plain text first (Word: *Save As*; Google Docs: *Download →
Markdown*). It says so rather than failing quietly.

**3c — if you would rather write than talk.** Get a template and fill it in:

```bash
raygent brief > IDEA.md          # --type client for client work
$EDITOR IDEA.md
```

Then `/raygent init` in that folder. The brief has a hidden comment under each
heading naming the interview field, so adoption is exact rather than inferred —
and a section you leave blank is unambiguously a gap:

```markdown
## Who it is for
<!-- targetUsers -->

_The *first* user, specific enough to find ten of them this week._

> Example: Two-to-ten person freight brokerages that still quote in spreadsheets.
```

**Do you ever have to write JSON?** No, not on this path. `docs/raygent-init.json`
is written *for* you and shown for approval at step 6. Hand-writing a spec is only
for the no-agent route — CI, a script, or the fifth identical landing page — where
`raygent init --template` gives you the JSON and `--from` runs it with zero
prompts and no conversation.

### 4. Answer the questions, and expect an argument

It asks what it does not already know — problem, users, market, model, metrics —
then pushes back. Name the riskiest assumption. Say who the *first* user is, by a
description specific enough to find ten of them this week. Hear it out if it says
the thing you described is a feature inside somebody else's product.

It disagrees once, clearly, then builds what you asked for.

### 5. Cut phase 1, pick the stack

Phase 1 is what ships first, not everything, and the **non-goals** get said out
loud — that is the half people skip, and it is what stops phase 1 growing until
it never ships.

The stack is inferred from the conversation with a reason stated per choice, so
you can push back on it.

### 6. Approve the spec, then generate

It writes `raygent-init.json` and shows it. Nothing exists yet; this is the last
cheap moment to change anything. On approval it runs:

```bash
raygent init --from raygent-init.json     # zero prompts
```

What lands:

| Artifact | What |
|---|---|
| `AGENTS.md` | How to work in this repo — the file every agent reads |
| `docs/PRODUCT.md`, `docs/PRD.md` | Pre-filled from the conversation |
| `docs/architecture.md` | Folder map, import rules, and why they are shaped that way |
| `docs/rules/` | Coding rules, gated by your stack |
| `docs/tasks/` | Where the work breakdown goes, with its conventions |
| `docs/raygent-init.json` | This exact run, replayable with `--from` |
| `.claude/` | Agents, skills, hooks (Claude Code only) |

### 7. Fill what the conversation could not answer

```
/bootstrap-project
```

It interviews for exactly the remaining `TODO(content)` markers and refuses to
re-run over a finished project. Done when `rg "TODO\(content\)"` comes back empty.

`/raygent bootstrap` is the same step routed through the global skill — it finds
the project's own copy and follows it, so both spellings do one thing.

### 8. Break the phase into work orders

Hand phase 1 to **`engineering-lead`**. It writes `docs/tasks/`, one file per unit
of work, distinguishing a **step** (an agent does it) from a **gate** (you
decide). Read `docs/tasks/README.md` for the naming convention.

### 9. Build it

**`software-engineer`** builds, bound by `docs/rules/` and by ESLint
`no-restricted-imports` zones that fail the build on a crossed module boundary —
the architecture is enforced, not just written down. **`ui-designer`** owns
`docs/DESIGN.md`, the tokens and the visual verdict.

```bash
pnpm install && pnpm dev
```

### 10. Verify, then review

```
/verify              # lint, test, build — quotes the decisive line of each
```

Then **`code-reviewer`** for an APPROVE or FIX-FIRST verdict. It is read-only by
design: a reviewer that fixes what it finds stops reporting.

### 11. Ship it, then watch it

**Deploying is yours.** raygent has no ship or deploy command — it takes you to a
built, verified phase 1 and stops there.

Once it is live:

```bash
raygent product add my-idea               # only if init did not register it
raygent dashboard                         # http://localhost:4321
raygent finance add my-idea 49 "first sale"
raygent finance summary
```

Point the project's `NEXT_PUBLIC_ANALYTICS_URL` at the dashboard's `/api/ingest`
and its `track()` calls start showing up.

### What is not automatic

The interview is a conversation you have to actually have — the output is only as
good as what you put in. Adoption in step 3b is a proposal to correct, not a
conversion. Unanswered questions stay `TODO(content)` on purpose: that marker is a
prompt for a real answer, and an invented one would never be questioned again.
And nothing here deploys.

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

`/raygent bootstrap` routes to a generated project's own `/bootstrap-project`
skill — the project copy stays authoritative, so an old project is bootstrapped
by the flow its generation shipped, not by whatever newer skill is installed.

The critique posture is the one behind the optional AI review — except your own
agent does it, so it needs no API key and no config.

A skill of the same name in `~/.raygent/skills/` always wins, so the bundled copy
can never shadow one you wrote. After that the bundled copy beats any copy in the
shared agent dirs (`./.agent`, `~/.agents`, `~/.gemini`): those are also install
targets, so an old install there must not block `skill install -f` from
refreshing it.

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
  --comments <density>     code comments: none | minimal | full
  --build-focus <focus>    UI projects with data: ui-first | end-to-end
  --viewport <priority>    web frontends: mobile-first | web-first
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
raygent init --template > acme.json   # fillable, with comments
$EDITOR acme.json
raygent init --from acme.json         # asks nothing
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
acme.json has 3 problems:
  project.name     "Acme Landing Page" cannot be a folder name — use letters,
                   digits, ".", "_", "-" (the brand goes in project.brand)
  stack.framework  "nextjs14" is not valid (nextjs, vite-react, tanstack-start,
                   remix). Did you mean "nextjs"?
  rules[1]         "style" is not valid (...). Did you mean "code-style"?

Nothing was generated.
```

`--fill-gaps` prompts for fields the spec omits. It never downgrades an invalid
value to a question — a typo must fail, not become a prompt.

**Two names, on purpose.** The **brand name** is what a visitor reads — headings,
the browser tab, the logo, the OG card. The **project name** is what npm and the
filesystem need. Init asks for the brand first and derives the project name from
it (`Acme Landing Page` → `acme-landing-page`), offering that as an
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

**Project preferences (`docs/rules/project-preferences.md`):** how the agent
works, chosen at init and written by raygent after the scaffold:

| Preference | Values | Asked when |
|---|---|---|
| `--comments` | `none` · `minimal` (only the non-obvious why) · `full` (doc comment on every export) | always |
| `--build-focus` | `ui-first` · `end-to-end` | the project has screens and a data layer |
| `--viewport` | `mobile-first` · `web-first` | web platform with a frontend |

The file overrides `code-style.md` on comments, and `AGENTS.md` gets a hard rule
pointing at it. `ui-first` also changes Phase 0: every PRD screen is built on mock
data (`0-step-03-ui-shell`), the user signs it off at `0-gate-ui-review`, and the
data round-trip moves to `1-step-01-data-round-trip`. A preference that was never
answered (a spec without it, for example) writes nothing.

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
raygent config set presets.saas.preferences '{"comments":"minimal","buildFocus":"ui-first","viewport":"mobile-first"}'

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
