import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

// platform -> frameworks create-client-project can actually scaffold for real
// (its registry.mjs FRONTENDS keys). A validated framework outside these lists
// (e.g. web's 'remix') only gets raygent's own stub docs -- no real scaffold
// exists for it yet.
// 'landing' is absent on purpose: it is reached through `--kind landing`, not by
// picking it as a framework. The CLI maps that kind to frontend: 'landing' when
// it builds CCP_ANSWERS, so the scaffolder still receives the same template key.
export const REAL_SCAFFOLD_FRAMEWORKS: Record<string, readonly string[]> = {
  web: ['nextjs', 'vite-react', 'tanstack-start'],
  mobile: ['react-native'],
  desktop: ['electron'],
};

export function supportsRealScaffold(platform: string, framework: string): boolean {
  return (REAL_SCAFFOLD_FRAMEWORKS[platform] ?? []).includes(framework);
}

// web-only: backends create-client-project can actually scaffold for real
// (its registry.mjs BACKENDS keys).
export const REAL_SCAFFOLD_BACKENDS: readonly string[] = ['express', 'hono', 'nestjs'];

export function supportsRealScaffoldBackend(backend: string): boolean {
  return REAL_SCAFFOLD_BACKENDS.includes(backend);
}

/** The scaffolder's published package name, once it is on npm. */
export const CCP_PACKAGE = '@raygent/create-project';

/**
 * Resolve the scaffolder as a real npm dependency. Returns null when it is not
 * installed, which is the normal case in this repo's own dev checkout.
 */
function installedCcpBinPath(): string | null {
  try {
    const require = createRequire(import.meta.url);
    return require.resolve(`${CCP_PACKAGE}/bin/create.mjs`);
  } catch {
    return null;
  }
}

/**
 * The copy shipped inside this package by scripts/bundle-scaffolder.mjs. This is
 * the normal answer for an installed raygent: one package, nothing to resolve.
 * dist/scaffold-tools.js -> package root is one level up.
 */
function bundledCcpBinPath(): string {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  return path.join(packageRoot, 'vendor', 'scaffolder', 'bin', 'create.mjs');
}

// A sibling checkout, two levels up from dist/. Only reachable in this repo's own
// dev tree; a published install has no sibling, which is the bug bundling fixes.
function siblingCcpBinPath(): string {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  return path.resolve(packageRoot, '..', 'raygent-scaffolds', 'bin', 'create.mjs');
}

function fileExists(p: string): boolean {
  return existsSync(p);
}

/**
 * Where to find the scaffolder, most explicit first:
 *   1. RAYGENT_CCP_PATH   -- an operator pointing at a specific checkout
 *   2. the bundled copy   -- what a published raygent ships with
 *   3. the installed pkg  -- if @raygent/create-project is ever depended on
 *   4. a sibling checkout -- dev fallback, and the reason this used to break
 * Steps 2-4 are existence-checked so a stale or partial bundle falls through to
 * something that works rather than dead-ending.
 */
export function resolveCcpBin(): string {
  if (process.env.RAYGENT_CCP_PATH) return process.env.RAYGENT_CCP_PATH;

  const bundled = bundledCcpBinPath();
  if (fileExists(bundled)) return bundled;

  const installed = installedCcpBinPath();
  if (installed) return installed;

  return siblingCcpBinPath();
}

/** True when the scaffolder came from a sibling checkout rather than a shipped copy. */
export function usingDevScaffolder(): boolean {
  return (
    !process.env.RAYGENT_CCP_PATH && !fileExists(bundledCcpBinPath()) && installedCcpBinPath() === null
  );
}

export interface RunClientProjectScaffoldOptions {
  projectName: string;
  targetDir: string;
  frontend: string | null;
  backend?: string | null;
  monorepo?: string | null;
  type: string;
  stack?: Record<string, unknown>;
  agentTools?: string[];
  ruleFiles?: string[];
}

export async function runClientProjectScaffold(opts: RunClientProjectScaffoldOptions): Promise<void> {
  const ccpBin = resolveCcpBin();

  const ccpBinExists = await fs
    .access(ccpBin)
    .then(() => true)
    .catch(() => false);
  if (!ccpBinExists) {
    // The overwhelmingly likely cause is a published install of raygent whose
    // scaffolder dependency is missing, so say that first rather than printing a
    // path the user has no reason to recognise.
    throw new Error(
      [
        `The project scaffolder was not found, so there is nothing to generate the project with.`,
        ``,
        `Looked for: ${ccpBin}`,
        ``,
        usingDevScaffolder()
          ? `raygent fell back to a sibling checkout, which means ${CCP_PACKAGE} is not installed.` +
            ` Either clone raygent-scaffolds next to raygent, or point RAYGENT_CCP_PATH at its bin/create.mjs.`
          : `Reinstall raygent so ${CCP_PACKAGE} is present, or point RAYGENT_CCP_PATH at a bin/create.mjs you have.`,
      ].join('\n')
    );
  }

  const answers = {
    projectName: opts.projectName,
    targetDir: opts.targetDir,
    frontend: opts.frontend,
    backend: opts.backend ?? null,
    monorepo: opts.monorepo ?? null,
    engagementType: opts.type,
    stack: opts.stack ?? {},
    agentTools: opts.agentTools ?? [],
    // Empty means "every rule that applies to this stack" on the scaffolder side,
    // which is why no default is filled in here.
    ruleFiles: opts.ruleFiles ?? [],
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [ccpBin], {
      env: { ...process.env, CCP_ANSWERS: JSON.stringify(answers) },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`create-client-project exited with code ${code}`));
    });
  });
}
