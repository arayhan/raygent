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
