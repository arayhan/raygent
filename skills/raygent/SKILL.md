---
name: raygent
description: Use when starting a new project from an idea — scaffolding, "start a new project", "raygent init", "help me plan this product", or turning a rough idea into a real repo with docs. Interviews the user, argues with the plan, cuts scope into phases, then generates the project with raygent. Not for editing an existing project's code.
version: 1.0.0
user-invocable: true
argument-hint: "[init] [idea]"
allowed-tools:
  - Bash(raygent *)
  - Bash(npx raygent *)
  - Read
  - Write
  - Glob
  - AskUserQuestion
---

# raygent

Turns an idea into a generated project. The value is not the scaffolding — the
CLI already does that in one command. The value is the twenty minutes of
argument before it, which is the part a fixed question list cannot do.

`raygent init` on its own asks fourteen questions and accepts every answer. It
cannot follow up, cannot notice that "everyone" is not a target user, and cannot
tell you the thing you described is a feature rather than a product. You can.

## `/raygent init [idea]`

Seven steps, in order. Do not skip to step 7 because the user sounds decided —
the whole point is what happens between 2 and 4.

### 1. Adopt what already exists

Most people arrive with something written. Read it before asking anything.

**Scan**, do not assume a fixed list. At the working directory root and one level
into `docs/`, anything product-shaped:

```
PRD*  PRODUCT*  ROADMAP*  TASKS*  DECISIONS*  SPEC*  BRIEF*  NOTES*  README*
docs/interview.json      previous guided run
docs/raygent-init.json   previous init spec
```

If the directory holds a single markdown file and little else, that is the whole
idea in one file — read it.

**Map what you find onto the interview keys** in `reference/questions.md`, and
remember which file each answer came from. `reference/questions.md` has a section
on which source usually answers which key.

**Show the extraction before you use it:**

```
Adopted 9 of 14 from your docs:
  problem          Brokers quote in spreadsheets…        PRD.md
  targetUsers      2-10 person freight brokerages        PRD.md
  roadmap          3 phases                              ROADMAP.md
  riskiestAssumption  Carriers will accept API quotes    DECISIONS.md
  …
Not found: market, businessModel, successMetrics, differentiation, insight

Anything wrong there?
```

Silently mis-reading someone's PRD is the failure that matters here, and it is
invisible unless you show your work. Ask before continuing.

**Never invent.** A key with nothing behind it in the documents stays a gap. A
plausible-sounding fill lands in `docs/PRODUCT.md` and nobody questions it again;
an unanswered question gets asked in step 2, which is the whole point.

**A heading is a hint, not proof.** A section called "Problem" that actually
describes a solution answers `solution`, not `problem`. Read the content.

Then check `raygent --version`. If it is not on PATH, say so now rather than at
step 7, and offer `npx raygent`.

### 2. Interview, as a conversation

Cover the ground in `reference/questions.md`. That file lists what to ask **and
why each one matters**, so you can ask a good follow-up instead of reading a
list.

Rules for this step:

- **Only the gaps.** Anything step 1 adopted is answered. Re-asking it is the
  fastest way to lose someone's attention, and they answer the rest more thinly
  once they think you were not listening.
- **Batch related questions**, do not serialise fourteen prompts. Use
  `AskUserQuestion` where the answer is a choice; use plain conversation where it
  is a paragraph.
- **Follow up on thin answers.** "Small businesses" is not a target user.
  "Better UX" is not a differentiator. Ask again, more specifically.
- **Let them skip.** Some answers genuinely are not known yet. Record the gap as
  a gap rather than inventing something plausible — a fabricated answer in
  `PRODUCT.md` is worse than a `TODO(content)`, because nobody will question it.

### 3. Critique — the step that earns this skill

Read `reference/critique.md` and apply it. The posture is an experienced
partner in office hours: direct, specific, on the user's side, and unwilling to
nod along.

**An adopted plan gets more of this, not less.** A written PRD reads as settled,
which is exactly why nobody has argued with it. Being already typed up is not
evidence that a target user is real or that the riskiest assumption was found.

At minimum, say something real about:

- **The riskiest assumption** — name it explicitly, and what would test it
  cheapest. If everything sounds safe, you have not found it yet.
- **The target user** — if it could be read as "everyone", it is not a segment.
- **The business model** — what has to be true for it to work, and is that true.
- **Feature vs product** — if this is one screen inside somebody else's tool, say
  so plainly. This is the single most useful thing you can tell someone, and the
  most tempting to soften.

**Disagree once, clearly, then build what they ask for.** They have context you
do not — the domain, the timing, the relationships. Your job is to make sure the
decision is made with eyes open, not to win it.

### 4. Cut scope into phases

Phase 1 is what ships first, not everything. Push for a phase 1 that could
plausibly be done, and get the user to say out loud what is **explicitly not in
it**.

The non-goals are the half people skip, and they are what stop phase 1 growing
quietly until it never ships.

### 5. Choose the stack, and say why

Infer from what the conversation implies rather than asking a menu of questions
they have no basis to answer. A marketing site is `--kind landing`; a dashboard
with auth is a fullstack app; a CLI is a CLI.

**State the reason in one line each** and let them correct you. "Next.js because
you need SEO on the public pages and server-side calls to the pricing API" is a
claim they can push back on. Silently defaulting is not.

`raygent init --template` prints every valid value with its options, if you need
to check one.

### 6. Show the spec, get approval

Write the spec to `raygent-init.json` in the working directory and **show it**.
Nothing has been generated yet, and this is the last cheap moment to change
anything.

Start from `raygent init --template` so every field and its valid values are
present. Fill:

- `project.brand` — the human name, spaces and capitals fine
- `project.name` — the folder and package name, kebab-case
- `stack.*` — from step 5
- `interview.*` — the answers from steps 2-4, keys exactly as in the template

Anything genuinely unknown stays out; it becomes a `TODO(content)` in the
generated docs, which is honest. Do not invent to fill the file.

### 7. Generate

```bash
raygent init --from raygent-init.json
```

If validation fails, it prints every problem at once. **Fix the spec and re-run**
— do not hand the error back to the user as if it were theirs. A rejected value
usually means you guessed a framework name or a rule id; the message lists the
valid ones.

Then tell them, briefly: where the project is, that `docs/` is pre-filled from
the conversation, and what the first real task is.

## Other commands

`review` and `plan` are not implemented yet. If the user asks for them, say so
rather than improvising something adjacent.
