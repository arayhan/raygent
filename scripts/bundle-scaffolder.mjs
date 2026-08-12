#!/usr/bin/env node
// Copies the project scaffolder into vendor/scaffolder/ so a published raygent
// carries it. Without this, `raygent init` can only scaffold when a
// raygent-scaffolds checkout happens to sit next to the install -- true in this
// dev repo, false on every other machine.
//
// A plain copy is enough because the scaffolder resolves its own templates
// relative to its source file (template-engine.mjs: import.meta.dirname/../templates),
// so bin + src + templates moved together keep working anywhere. Its only external
// imports are @clack/prompts and handlebars, which raygent declares as its own
// dependencies for exactly this reason.
import { cp, rm, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const source = path.resolve(repoRoot, "..", "raygent-scaffolds");
const dest = path.join(repoRoot, "vendor", "scaffolder");
const PARTS = ["bin", "src", "templates"];

async function main() {
  for (const part of PARTS) {
    const from = path.join(source, part);
    try {
      await access(from);
    } catch {
      // Fail loudly and name the path. A silently-empty bundle would publish a
      // raygent that cannot scaffold, which is the exact bug this script exists
      // to prevent.
      throw new Error(
        `Cannot bundle the scaffolder: ${from} does not exist.\n` +
          `Expected a raygent-scaffolds checkout beside this repo at ${source}.`
      );
    }
  }

  await rm(dest, { recursive: true, force: true });
  for (const part of PARTS) {
    await cp(path.join(source, part), path.join(dest, part), {
      recursive: true,
      filter: (src) => !src.split(path.sep).includes("node_modules"),
    });
  }
  console.log(`Bundled scaffolder -> ${path.relative(repoRoot, dest)} (${PARTS.join(", ")})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
