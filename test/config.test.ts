import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import {
  defaultConfigPath,
  loadAiConfig,
  loadPreset,
  loadConfig,
  saveConfig,
  setConfigValue,
  getConfigValue,
} from '../src/config.js';

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

describe('config value helpers', () => {
  it('setConfigValue creates nested paths and getConfigValue reads them back', () => {
    const cfg: Record<string, unknown> = {};
    setConfigValue(cfg, 'ai.baseUrl', 'https://x/v1');
    setConfigValue(cfg, 'presets.saas.skills', ['impeccable']);
    expect(getConfigValue(cfg, 'ai.baseUrl')).toBe('https://x/v1');
    expect(getConfigValue(cfg, 'presets.saas.skills')).toEqual(['impeccable']);
  });

  it('setConfigValue replaces a non-object intermediate with an object', () => {
    const cfg: Record<string, unknown> = { ai: 'oops' };
    setConfigValue(cfg, 'ai.model', 'm1');
    expect(getConfigValue(cfg, 'ai.model')).toBe('m1');
  });

  it('getConfigValue returns undefined for missing paths', () => {
    expect(getConfigValue({}, 'nope.deep')).toBeUndefined();
  });

  it('setConfigValue throws on an empty key path', () => {
    expect(() => setConfigValue({}, '', 1)).toThrow(/invalid config key/);
  });
});

describe('presets', () => {
  const tempDirs: string[] = [];

  function makeTempDir(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'raygent-preset-test-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it('round-trips a preset through saveConfig/loadConfig/loadPreset', async () => {
    const configPath = path.join(makeTempDir(), 'config.json');
    const cfg: Record<string, unknown> = {};
    setConfigValue(cfg, 'presets.saas', {
      platform: 'web',
      framework: 'nextjs',
      type: 'product',
      mode: 'guided',
      skills: ['impeccable', 'ui-ux-pro-max'],
    });
    await saveConfig(cfg, configPath);

    expect(await loadConfig(configPath)).toEqual(cfg);
    const preset = await loadPreset('saas', configPath);
    expect(preset).toEqual({
      platform: 'web',
      framework: 'nextjs',
      type: 'product',
      mode: 'guided',
      skills: ['impeccable', 'ui-ux-pro-max'],
    });
  });

  it('loadPreset returns null for an unknown name', async () => {
    const configPath = path.join(makeTempDir(), 'config.json');
    await saveConfig({ presets: {} }, configPath);
    expect(await loadPreset('nope', configPath)).toBeNull();
  });

  it('loadPreset filters non-string skills entries', async () => {
    const configPath = path.join(makeTempDir(), 'config.json');
    await saveConfig({ presets: { p: { skills: ['ok', 42, null] } } }, configPath);
    expect((await loadPreset('p', configPath))?.skills).toEqual(['ok']);
  });
});
