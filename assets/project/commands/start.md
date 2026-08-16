---
description: Session orientation — check repo state, run verification, and output the next task
allowed-tools: Bash, Read, Grep, Glob
---

Orientation only. Do NOT write code during this step.

1. **Read `docs/STATE.md`** — only this file. Do not read `docs/PROGRESS.md` (it grows indefinitely; read only the last ~20 lines if historical context is explicitly needed).
2. **Check git status**: Run `git log --oneline -5` and `git status --short`. If the working tree is dirty, report it — do not clean or discard changes yourself.
3. **Run verification**: Execute the checks defined in `.claude/commands/verify.md`. Do not duplicate the command list here (refer directly to `.claude/commands/verify.md`). If any check fails (red), resolving that failure becomes the immediate first task of this session, overriding what is in `docs/STATE.md`.
4. **Read next work order**: Read the work order referenced under `Next up:` in `docs/tasks/`. If the file does not exist, report that it is missing — do not guess its contents.
5. **Stop, wait, and output exactly**:

```
Next: <task id> — <title>
Done when: <acceptance criteria, quoted verbatim from work order>
Touching: <files to touch>
NOT touching: <adjacent files explicitly out of scope>
```
