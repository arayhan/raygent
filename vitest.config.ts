import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // vendor/ holds the bundled scaffolder, whose templates ship their own
    // *.test.ts files. Those are meant to run inside a GENERATED project, where
    // their imports resolve; collecting them here fails and says nothing about
    // raygent. The scaffolder's own suite is its repo's `test:matrix`.
    // .claude/worktrees/ holds `claude --worktree` checkouts of this same repo.
    // Without this, `npm test` collects another session's copy of every test file
    // and reports its failures as this checkout's -- which cost a real debugging
    // detour once already.
    exclude: ['**/node_modules/**', '**/dist/**', 'vendor/**', '.claude/worktrees/**'],
  },
});
