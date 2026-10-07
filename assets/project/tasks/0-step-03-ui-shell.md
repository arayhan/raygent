# 0-step-03-ui-shell

Build every screen on mock data so the user can see the product before any backend work starts.

## Goal

Every screen named in docs/PRD.md exists, is reachable through the app's real navigation, and renders from mock data shaped exactly like the API responses will be. Layout follows the priority in docs/rules/project-preferences.md (mobile-first or web-first) when one was chosen. No backend, database or real API calls yet.

## Deliverables

- One route or screen per PRD screen, reachable from the app's navigation
- Mock data in one place (for example `src/mocks/`), typed with the same types the real API layer will return
- Empty, loading, error and filled states for every screen that shows data
- A running dev server URL, or screenshots of every screen and state, ready to show the user

## Acceptance Criteria

```bash
pnpm dev
pnpm lint
pnpm typecheck
```

- Every PRD screen opens from the navigation with no console errors.
- `rg "fetch\(|axios" src` finds no calls to a real endpoint yet.

**Depends:** 0-step-02-verify-loop · **Blocks:** 0-gate-ui-review · **handoff:** software-engineer
