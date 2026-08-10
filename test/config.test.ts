import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { defaultConfigPath, loadAiConfig } from '../src/config.js';

describe('loadAiConfig', () => {
  const tempDirs: string[] = [];

  function makeTempDir(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'raygent-config-test-'));
    tempDirs.push(dir);
    return dir;
  }

  function writeConfig(contents: string): string {
    const configPath = path.join(makeTempDir(), 'config.json');
    writeFileSync(configPath, contents, 'utf8');
    return configPath;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()!;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null when the config file is missing and env is empty', async () => {
    const missingPath = path.join(makeTempDir(), 'config.json');
    const result = await loadAiConfig({}, missingPath);
    expect(result).toBeNull();
  });

  it('returns the config from a complete file', async () => {
    const configPath = writeConfig(
      JSON.stringify({
        ai: {
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'sk-file-key',
          model: 'file-model',
        },
      })
    );
    const result = await loadAiConfig({}, configPath);
    expect(result).toEqual({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-file-key',
      model: 'file-model',
    });
  });

  it('returns null for a partial file (only baseUrl) with empty env', async () => {
    const configPath = writeConfig(
      JSON.stringify({ ai: { baseUrl: 'https://api.example.com/v1' } })
    );
    const result = await loadAiConfig({}, configPath);
    expect(result).toBeNull();
  });

  it('returns the config from env vars alone when no file exists', async () => {
    const missingPath = path.join(makeTempDir(), 'config.json');
    const result = await loadAiConfig(
      {
        RAYGENT_AI_BASE_URL: 'https://env.example.com',
        RAYGENT_AI_API_KEY: 'sk-env-key',
        RAYGENT_AI_MODEL: 'env-model',
      },
      missingPath
    );
    expect(result).toEqual({
      baseUrl: 'https://env.example.com',
      apiKey: 'sk-env-key',
      model: 'env-model',
    });
  });

  it('lets env override the file per-field (env overrides only model)', async () => {
    const configPath = writeConfig(
      JSON.stringify({
        ai: {
          baseUrl: 'https://file.example.com',
          apiKey: 'sk-file-key',
          model: 'file-model',
        },
      })
    );
    const result = await loadAiConfig({ RAYGENT_AI_MODEL: 'env-model' }, configPath);
    expect(result).toEqual({
      baseUrl: 'https://file.example.com',
      apiKey: 'sk-file-key',
      model: 'env-model',
    });
  });

  it('does not throw on malformed JSON and falls back to env', async () => {
    const configPath = writeConfig('{ not valid json !!!');
    const result = await loadAiConfig(
      {
        RAYGENT_AI_BASE_URL: 'https://env.example.com',
        RAYGENT_AI_API_KEY: 'sk-env-key',
        RAYGENT_AI_MODEL: 'env-model',
      },
      configPath
    );
    expect(result).toEqual({
      baseUrl: 'https://env.example.com',
      apiKey: 'sk-env-key',
      model: 'env-model',
    });
  });

  it('strips trailing slashes from baseUrl', async () => {
    const configPath = writeConfig(
      JSON.stringify({
        ai: {
          baseUrl: 'https://x.example/v1/',
          apiKey: 'sk-key',
          model: 'a-model',
        },
      })
    );
    const result = await loadAiConfig({}, configPath);
    expect(result).toEqual({
      baseUrl: 'https://x.example/v1',
      apiKey: 'sk-key',
      model: 'a-model',
    });
  });

  it('defaultConfigPath resolves to ~/.raygent/config.json', () => {
    expect(defaultConfigPath()).toBe(path.join(os.homedir(), '.raygent', 'config.json'));
  });
});
