import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

// platform -> frameworks create-client-project can actually scaffold for real
// (its registry.mjs FRONTENDS keys). A validated framework outside these lists
// (e.g. web's 'remix') only gets raygent's own stub docs -- no real scaffold
// exists for it yet.
export const REAL_SCAFFOLD_FRAMEWORKS: Record<string, readonly string[]> = {
  web: ['nextjs', 'vite-react', 'tanstack-start', 'landing'],
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

// dist/scaffold-tools.js -> package root is one level up, so a sibling checkout
// sits two up. This is the DEV fallback only: it is how the repo works before the
// scaffolder is published, and it is exactly why `npm i -g raygent` cannot
// scaffold today -- a global install has no sibling checkout.
function siblingCcpBinPath(): string {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  return path.resolve(packageRoot, '..', 'raygent-scaffolds', 'bin', 'create.mjs');
}

/**
 * Where to find the scaffolder, most explicit first:
 *   1. RAYGENT_CCP_PATH        -- an operator pointing at a specific checkout
 *   2. the installed package   -- the real answer once it is published
 *   3. a sibling checkout      -- dev fallback
 * Ordering it this way means publishing is a one-command step later rather than
 * a code change: the moment the dependency resolves, step 2 wins on its own.
 */
export function resolveCcpBin(): string {
  return process.env.RAYGENT_CCP_PATH ?? installedCcpBinPath() ?? siblingCcpBinPath();
}

/** True when the scaffolder came from a sibling checkout rather than a real install. */
export function usingDevScaffolder(): boolean {
  return !process.env.RAYGENT_CCP_PATH && installedCcpBinPath() === null;
}

export interface RunClientProjectScaffoldOptions {
  projectName: string;
  targetDir: string;
  frontend: string | null;
  backend?: string | null;
  monorepo?: string | null;
  type: string;
  stack?: Record<string, unknown>;
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
