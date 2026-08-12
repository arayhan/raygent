import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // vendor/ holds the bundled scaffolder, whose templates ship their own
    // *.test.ts files. Those are meant to run inside a GENERATED project, where
    // their imports resolve; collecting them here fails and says nothing about
    // raygent. The scaffolder's own suite is its repo's `test:matrix`.
    exclude: ['**/node_modules/**', '**/dist/**', 'vendor/**'],
  },
});
