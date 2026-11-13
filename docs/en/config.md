# Config and presets

`raygent config` reads and writes `~/.raygent/config.json`. It holds the AI endpoint and your presets: saved init answers you reuse by name.

Think of a preset as a saved order at your usual coffee shop. You say "the usual" and every detail comes with it, but you can still ask for one change.

## Quick start

```bash
raygent config show
raygent config set presets.saas.platform web
raygent init my-app --preset saas
```

## Commands

| Command | Does |
|---|---|
| `raygent config show` | print the whole config, API key masked |
| `raygent config get <key>` | read a value by dot path, for example `ai.model` |
| `raygent config set <key> <value>` | set a value by dot path; JSON values are parsed |

## Presets

```bash
raygent config set presets.saas.platform web
raygent config set presets.saas.framework nextjs
raygent config set presets.saas.type product
raygent config set presets.saas.mode guided
raygent config set presets.saas.target fullstack
raygent config set presets.saas.backend express
raygent config set presets.saas.monorepo true
raygent config set presets.saas.skills '["impeccable", "ui-ux-pro-max"]'
raygent config set presets.saas.stack '{"styling":"tailwind","forms":"react-hook-form"}'
raygent config set presets.saas.preferences '{"comments":"minimal","buildFocus":"ui-first","viewport":"mobile-first"}'

raygent init my-app --preset saas      # flags still override preset values
```

- A preset with `skills` installs them and skips the skill checklist.
- A preset with `stack` skips the tech-stack prompts and uses those values as they are.
- An init spec can name a `"preset"` too. See [Init](init.md).

**Precedence:** explicit flag > spec > preset > prompt > default.

## AI endpoint

| Key | Env override |
|---|---|
| `ai.baseUrl` | `RAYGENT_AI_BASE_URL` |
| `ai.apiKey` | `RAYGENT_AI_API_KEY` |
| `ai.model` | `RAYGENT_AI_MODEL` |

All three are needed for the AI steps. See [Interview and AI review](interview.md).

## Files

| Path | Holds |
|---|---|
| `~/.raygent/config.json` | `ai` and `presets` |

## Troubleshooting

- **A JSON value is stored as a string.** Quote the whole value in single quotes so the shell keeps the JSON intact.
- **A preset value is ignored.** A flag on the command line wins over the preset. Check the command.
