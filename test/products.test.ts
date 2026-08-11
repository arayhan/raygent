import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { registerProduct, listProducts, productsPath } from '../src/products.js';

let dir: string;
let filePath: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-products-'));
  filePath = path.join(dir, 'products.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('products registry', () => {
  it('registers and lists products', async () => {
    await registerProduct({ name: 'app-a', platform: 'web', createdAt: '2026-08-11T00:00:00Z' }, filePath);
    await registerProduct({ name: 'app-b', createdAt: '2026-08-11T00:00:00Z' }, filePath);

    const products = await listProducts(filePath);
    expect(products.map((p) => p.name)).toEqual(['app-a', 'app-b']);
  });

  it('upserts by name instead of duplicating', async () => {
    await registerProduct({ name: 'app', platform: 'web', createdAt: 't1' }, filePath);
    await registerProduct({ name: 'app', framework: 'nextjs', createdAt: 't2' }, filePath);

    const products = await listProducts(filePath);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ name: 'app', platform: 'web', framework: 'nextjs', createdAt: 't2' });
  });

  it('tolerates a missing or corrupt file', async () => {
    expect(await listProducts(filePath)).toEqual([]);
    fs.writeFileSync(filePath, '{not json');
    expect(await listProducts(filePath)).toEqual([]);
    await registerProduct({ name: 'app', createdAt: 't' }, filePath);
    expect(await listProducts(filePath)).toHaveLength(1);
  });

  it('productsPath resolves under ~/.raygent', () => {
    expect(productsPath()).toBe(path.join(os.homedir(), '.raygent', 'products.json'));
  });
});
