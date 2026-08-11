# raygent

Personal CLI: Claude Code skill management, project scaffolding (delegates web/
mobile/desktop to the sibling `raygent-scaffolds` repo), guided product/client
interviews with optional AI review, and a local monitoring dashboard.

## Commit conventions

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`), subject + body only.
- **No attribution trailers of any kind** — no `Co-Authored-By`, no
  `Generated with ...`, no AI/agent footers. This is a hard rule.

## Layout

- `src/` TypeScript ESM (NodeNext — relative imports need `.js`), built to
  `dist/` via `tsc`. Tests in `test/` (Vitest, temp-dir isolation).
- Core modules: `cli.ts` (Commander wiring, untested by convention),
  `skill-lib.ts`, `init-lib.ts`, `scaffold-tools.ts` (CCP_ANSWERS shell-out),
  `interview.ts`, `doc-fill.ts` (heading-surgical pre-fill), `ai-client.ts`,
  `config.ts` (also presets), `products.ts` / `finance.ts` / `dashboard.ts`
  (monitoring), `doctor.ts`.
- `npm run build` + `npm test` must pass before committing.
