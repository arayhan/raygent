# Interview and AI review

In guided mode, `raygent init` interviews you before it generates anything, and your answers pre-fill the product docs. An optional AI step then critiques the answers like a startup partner would.

Think of it as an intake form at a good clinic: the questions are fixed, but what you say ends up in your file, not in a drawer.

## Quick start

```bash
raygent init my-app --mode guided     # interview first
raygent brief > IDEA.md               # or write your answers in a template
```

## Modes

| Mode | What happens |
|---|---|
| `quick` | scaffold and stub docs only |
| `guided` | an interview first; answers fill the docs and are saved to `docs/interview.json` |

Every question can be skipped with Enter. A skipped question stays a visible `TODO(content)` in the docs, never an invented answer.

## Product or client

| `--type` | Questions |
|---|---|
| `product` | startup-application style: problem, vision, market, business model, riskiest assumption, success metrics and more |
| `client` | brief intake: requirements, scope, deliverables, decision-maker and more |

## Writing instead of talking: `raygent brief`

```bash
raygent brief > IDEA.md                 # product brief
raygent brief --type client --out BRIEF.md
```

| Flag | Does |
|---|---|
| `--type` | `product` (default) or `client` |
| `--out <file>` | write to a file instead of stdout |
| `-f, --force` | overwrite an existing `--out` file |

Each heading carries a hidden comment that names the interview field, so `/raygent init` adopts the brief exactly instead of guessing:

```markdown
## Who it is for
<!-- targetUsers -->
```

## Adopting docs you already have

Run `/raygent init` in a folder that holds your docs. It reads `PRD*`, `PRODUCT*`, `ROADMAP*`, `TASKS*`, `DECISIONS*`, `SPEC*`, `BRIEF*`, `NOTES*` (`.md`, `.txt`, `.pdf`) and shows what it took from where:

```
Adopted 9 of 14 from your docs:
  problem             Brokers quote in spreadsheets…     PRD.md
  roadmap             3 phases                           ROADMAP.md
Not found: market, businessModel, successMetrics
```

It cannot read `.docx`. Export to PDF, Markdown or plain text first.

## Optional AI review

```
answers ── AI endpoint ── docs/ai-review.md (critique)
                     └─── optional elaboration of the pre-filled docs
```

The AI steps only appear when an OpenAI-compatible endpoint is configured. Without it, no AI prompts show up at all.

```bash
raygent config set ai.baseUrl https://your-host/v1
raygent config set ai.apiKey sk-...
raygent config set ai.model your-model-id
```

Or set `RAYGENT_AI_BASE_URL`, `RAYGENT_AI_API_KEY` and `RAYGENT_AI_MODEL`. All three are required.

An AI failure never fails `init`: the project is complete either way. The `/raygent init` skill gives the same kind of critique through your own agent, with no API key.

## Files

| Path | Holds |
|---|---|
| `docs/interview.json` | the raw answers, for `/bootstrap-project` and other tools |
| `docs/ai-review.md` | the AI critique, when enabled |
| `~/.raygent/config.json` | the `ai` endpoint settings |

## Troubleshooting

- **No AI questions appear.** One of the three AI values is missing. Run `raygent config show` and `raygent doctor`.
- **`TODO(content)` markers remain.** That is intended. Run `/bootstrap-project` in the project to fill them.
