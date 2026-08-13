import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function defaultConfigPath(): string {
  return path.join(os.homedir(), '.raygent', 'config.json');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function readConfigObject(configPath: string): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch {
    // Missing or unreadable config file means "unconfigured" — never throw.
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed JSON is treated the same as an absent config.
  }
  return {};
}

export async function loadAiConfig(
  env: NodeJS.ProcessEnv = process.env,
  configPath: string = defaultConfigPath()
): Promise<AiConfig | null> {
  const parsed = await readConfigObject(configPath);
  const ai =
    parsed.ai !== null && typeof parsed.ai === 'object' && !Array.isArray(parsed.ai)
      ? (parsed.ai as Record<string, unknown>)
      : {};

  const pick = (envValue: string | undefined, fileValue: unknown): string => {
    const fromEnv = (envValue ?? '').trim();
    return fromEnv !== '' ? fromEnv : asString(fileValue).trim();
  };

  const baseUrl = pick(env.RAYGENT_AI_BASE_URL, ai.baseUrl).replace(/\/+$/, '');
  const apiKey = pick(env.RAYGENT_AI_API_KEY, ai.apiKey);
  const model = pick(env.RAYGENT_AI_MODEL, ai.model);

  if (!baseUrl || !apiKey || !model) {
    return null;
  }
  return { baseUrl, apiKey, model };
}

export interface Preset {
  platform?: string;
  framework?: string;
  type?: string;
  mode?: string;
  skills?: string[];
  kind?: string;
  agents?: string[];
  rules?: string[];
  target?: string;
  backend?: string;
  monorepo?: boolean;
  stack?: Record<string, unknown>;
}

export async function loadConfig(configPath: string = defaultConfigPath()): Promise<Record<string, unknown>> {
  return readConfigObject(configPath);
}

export async function loadPreset(name: string, configPath: string = defaultConfigPath()): Promise<Preset | null> {
  const parsed = await readConfigObject(configPath);
  const presets =
    parsed.presets !== null && typeof parsed.presets === 'object' && !Array.isArray(parsed.presets)
      ? (parsed.presets as Record<string, unknown>)
      : {};
  const raw = presets[name];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  const stack =
    p.stack !== null && typeof p.stack === 'object' && !Array.isArray(p.stack)
      ? (p.stack as Record<string, unknown>)
      : undefined;
  return {
    platform: typeof p.platform === 'string' ? p.platform : undefined,
    framework: typeof p.framework === 'string' ? p.framework : undefined,
    type: typeof p.type === 'string' ? p.type : undefined,
    mode: typeof p.mode === 'string' ? p.mode : undefined,
    skills: Array.isArray(p.skills) ? p.skills.filter((s): s is string => typeof s === 'string') : undefined,
    kind: typeof p.kind === 'string' ? p.kind : undefined,
    agents: Array.isArray(p.agents) ? p.agents.filter((a): a is string => typeof a === 'string') : undefined,
    rules: Array.isArray(p.rules) ? p.rules.filter((r): r is string => typeof r === 'string') : undefined,
    target: typeof p.target === 'string' ? p.target : undefined,
    backend: typeof p.backend === 'string' ? p.backend : undefined,
    monorepo: typeof p.monorepo === 'boolean' ? p.monorepo : undefined,
    stack,
  };
}

/** Set a dot-path (e.g. 'ai.baseUrl' or 'presets.saas.platform') on a plain object. */
export function setConfigValue(config: Record<string, unknown>, keyPath: string, value: unknown): void {
  const keys = keyPath.split('.').filter((k) => k !== '');
  if (keys.length === 0) throw new Error(`invalid config key '${keyPath}'`);
  let node = config;
  for (const key of keys.slice(0, -1)) {
    const next = node[key];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      node[key] = {};
    }
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/** Get a dot-path from a plain object; undefined when any segment is missing. */
export function getConfigValue(config: Record<string, unknown>, keyPath: string): unknown {
  const keys = keyPath.split('.').filter((k) => k !== '');
  let node: unknown = config;
  for (const key of keys) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

export async function saveConfig(
  config: Record<string, unknown>,
  configPath: string = defaultConfigPath()
): Promise<void> {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}
