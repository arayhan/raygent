import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Frameworks create-client-project can actually scaffold for real (its
// registry.mjs FRONTENDS keys). Any web framework outside this list (e.g.
// 'remix') still validates against FRAMEWORKS_BY_PLATFORM but only gets
// raygent's own stub docs -- no real scaffold exists for it yet.
export const REAL_SCAFFOLD_FRAMEWORKS = ['nextjs', 'vite-react', 'tanstack-start'];

export function supportsRealScaffold(platform: string, framework: string): boolean {
  return platform === 'web' && REAL_SCAFFOLD_FRAMEWORKS.includes(framework);
}

// dist/scaffold-tools.js -> package root is one level up. create-client-project
// is a sibling repo, not an npm dependency, until it's published -- override
// with RAYGENT_CCP_PATH (pointing directly at its bin/create.mjs) if your
// checkout layout differs.
function defaultCcpBinPath(): string {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  return path.resolve(packageRoot, '..', 'raygent-scaffolds', 'bin', 'create.mjs');
}

export function resolveCcpBin(): string {
  return process.env.RAYGENT_CCP_PATH ?? defaultCcpBinPath();
}

export interface RunClientProjectScaffoldOptions {
  projectName: string;
  targetDir: string;
  frontend: string;
  type: string;
}

export async function runClientProjectScaffold(opts: RunClientProjectScaffoldOptions): Promise<void> {
  const ccpBin = resolveCcpBin();

  const ccpBinExists = await fs
    .access(ccpBin)
    .then(() => true)
    .catch(() => false);
  if (!ccpBinExists) {
    throw new Error(
      `create-client-project not found at ${ccpBin} -- set RAYGENT_CCP_PATH to its bin/create.mjs path`
    );
  }

  const answers = {
    projectName: opts.projectName,
    targetDir: opts.targetDir,
    frontend: opts.frontend,
    backend: null,
    monorepo: null,
    engagementType: opts.type,
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
