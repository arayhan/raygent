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

Scaffolds `./<project-name>/docs/` with a doc set matched to the project type,
then offers a checklist of recommended skills to install.

```bash
raygent init [project-name] [options]

Options:
  --platform <platform>    web | mobile | cli | desktop | agent-skills
  --framework <framework>  framework valid for the chosen platform
  --type <type>            product | client
  -f, --force              overwrite existing docs files
```

Any missing argument is prompted for interactively. Framework choices depend on
the platform:

| Platform     | Frameworks                  |
| ------------ | --------------------------- |
| web          | next, tanstack-start, remix |
| mobile       | react-native                |
| cli          | node, python, rust          |
| desktop      | electron                    |
| agent-skills | claude-code                 |

Doc sets:

- **product**: PRD.md, VISION.md, ARCHITECTURE.md, DESIGN.md, ANTISLOP.md,
  DATABASE.md, PROGRESS.md, product-roadmap.md, DESIGN.html
- **client**: PRD.md, scope.md, handoff.md, DESIGN.md, ANTISLOP.md,
  ARCHITECTURE.md, DATABASE.md, PROGRESS.md

## Development

```bash
npm install
npm run dev    # run from source (tsx)
npm run build  # compile to dist/
npm test       # vitest
```

## License

MIT
