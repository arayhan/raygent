import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { defaultRoots } from './paths.js';
import { resolveCcpBin } from './scaffold-tools.js';
import { loadAiConfig } from './config.js';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function commandVersion(command: string): string | null {
  // Single command string under shell mode -- passing an args array alongside
  // shell:true triggers DEP0190 and does no escaping anyway.
  const result =
    process.platform === 'win32'
      ? spawnSync(`${command} --version`, { encoding: 'utf8', shell: true })
      : spawnSync(command, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim().split('\n')[0];
}

export async function runDoctorChecks(fetchImpl: typeof fetch = globalThis.fetch): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({
    name: 'node',
    ok: nodeMajor >= 20,
    detail: nodeMajor >= 20 ? `v${process.versions.node}` : `v${process.versions.node} (raygent needs >= 20)`,
  });

  for (const tool of ['pnpm', 'git']) {
    const version = commandVersion(tool);
    checks.push({
      name: tool,
      ok: version !== null,
      detail: version ?? 'not found on PATH',
    });
  }

  const ccpBin = resolveCcpBin();
  const ccpOk = await exists(ccpBin);
  checks.push({
    name: 'scaffolder',
    ok: ccpOk,
    detail: ccpOk ? ccpBin : `${ccpBin} missing -- set RAYGENT_CCP_PATH (real scaffolds unavailable without it)`,
  });

  const roots = defaultRoots();
  const skillsRootOk = await exists(roots.skillsRoot);
  checks.push({
    name: 'personal skills',
    ok: true, // informational -- an empty registry is fine
    detail: skillsRootOk ? roots.skillsRoot : `${roots.skillsRoot} not created yet (skill add sources will be limited)`,
  });
  const globalOk = await exists(roots.globalAgentSkillsDir);
  checks.push({
    name: 'global skills',
    ok: true, // informational
    detail: globalOk ? roots.globalAgentSkillsDir : `${roots.globalAgentSkillsDir} not found`,
  });

  const ai = await loadAiConfig();
  if (!ai) {
    checks.push({ name: 'ai', ok: true, detail: 'not configured (AI steps stay off) -- raygent config set ai.baseUrl ...' });
  } else {
    let reach: string;
    let reachOk = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetchImpl(`${ai.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${ai.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      reachOk = res.ok;
      reach = res.ok ? `${ai.baseUrl} reachable (model: ${ai.model})` : `${ai.baseUrl} responded ${res.status}`;
    } catch (err) {
      reachOk = false;
      reach = `${ai.baseUrl} unreachable (${(err as Error).name === 'AbortError' ? 'timeout' : (err as Error).message})`;
    }
    checks.push({ name: 'ai', ok: reachOk, detail: reach });
  }

  return checks;
}
