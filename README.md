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
  --framework <framework>  framework valid for the chosen platform
  --type <type>            product | client
  -f, --force              overwrite existing docs files (stub-doc path only)
```

Any missing argument is prompted for interactively. Framework choices depend on
the platform:

| Platform     | Frameworks                              |
| ------------ | ---------------------------------------- |
| web          | nextjs, vite-react, tanstack-start, remix |
| mobile       | react-native                            |
| cli          | node, python, rust                      |
| desktop      | electron                                |
| agent-skills | claude-code                             |

**Real scaffolding vs stub docs:** `web` (`nextjs`/`vite-react`/`tanstack-start`),
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

## Development

```bash
npm install
npm run dev    # run from source (tsx)
npm run build  # compile to dist/
npm test       # vitest
```

## License

MIT
