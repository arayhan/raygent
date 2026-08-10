import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { resolveCcpBin } from '../src/scaffold-tools.js';
import { applyInterviewToScaffoldDocs } from '../src/doc-fill.js';
import { CLIENT_QUESTIONS } from '../src/interview.js';

// Drift tripwire between raygent's SCAFFOLD_DOC_MAP and the sibling
// client-project-scaffold's actual rendered doc headings. Skipped when the
// sibling checkout is absent (e.g. CI without it).
const ccpBin = resolveCcpBin();
const ccpAvailable = fs.existsSync(ccpBin);

describe.skipIf(!ccpAvailable)('scaffold doc headings match SCAFFOLD_DOC_MAP', () => {
  let scratch: string;
  let targetDir: string;

  beforeAll(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-integration-'));
    targetDir = path.join(scratch, 'itest-project');
    const result = spawnSync(
      process.execPath,
      [ccpBin, '--dry-run'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CCP_ANSWERS: JSON.stringify({
            projectName: 'itest-project',
            targetDir,
            frontend: 'nextjs',
            backend: null,
            monorepo: null,
            engagementType: 'client',
          }),
        },
        timeout: 120_000,
      }
    );
    // dry-run writes nothing; re-run for real docs only by running without
    // --dry-run but we cannot afford a pnpm install here. Instead: the
    // scaffold writes all docs BEFORE installing dependencies, and install
    // failure exits non-zero after docs exist — so run for real and accept
    // either outcome as long as the docs landed.
    void result;
    const real = spawnSync(process.execPath, [ccpBin], {
      encoding: 'utf8',
      env: {
        ...process.env,
        // force pnpm install to fail fast instead of downloading packages
        npm_config_registry: 'http://127.0.0.1:9',
        CCP_ANSWERS: JSON.stringify({
          projectName: 'itest-project',
          targetDir,
          frontend: 'nextjs',
          backend: null,
          monorepo: null,
          engagementType: 'client',
        }),
      },
      timeout: 300_000,
    });
    void real;
  }, 320_000);

  afterAll(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('applyInterviewToScaffoldDocs misses nothing with full client answers', async () => {
    expect(fs.existsSync(path.join(targetDir, 'docs', 'PRODUCT.md'))).toBe(true);

    const answers: Record<string, string> = {};
    for (const q of CLIENT_QUESTIONS) answers[q.key] = `answer for ${q.key}`;

    const { missed } = await applyInterviewToScaffoldDocs(targetDir, 'client', answers);
    expect(missed).toEqual([]);
  });
});
