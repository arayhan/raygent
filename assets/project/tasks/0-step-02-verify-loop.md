# 0-step-02-verify-loop

Establish a genuine automated verification loop with real test assertions.

## Goal

Ensure the project has a working test suite with at least one substantive automated test asserting real behavior, and that the verification command passes completely.

## Deliverables

- At least one passing automated test asserting real application behavior
- `/verify` (or `.claude/commands/verify.md`) runs all checks green

## Acceptance Criteria

```bash
pnpm test
/verify
```

**Depends:** 0-step-01-scaffold · **Blocks:** 0-step-03-data-round-trip, 0-gate-deploy · **handoff:** software-engineer
