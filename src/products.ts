import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

export interface ProductEntry {
  name: string;
  platform?: string;
  framework?: string;
  type?: string;
  path?: string;
  createdAt: string;
}

export function productsPath(): string {
  return path.join(os.homedir(), '.raygent', 'products.json');
}

export async function listProducts(filePath: string = productsPath()): Promise<ProductEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is ProductEntry => p !== null && typeof p === 'object' && typeof (p as ProductEntry).name === 'string'
    );
  } catch {
    return [];
  }
}

export async function registerProduct(entry: ProductEntry, filePath: string = productsPath()): Promise<void> {
  const products = await listProducts(filePath);
  const existing = products.findIndex((p) => p.name === entry.name);
  if (existing >= 0) {
    products[existing] = { ...products[existing], ...entry };
  } else {
    products.push(entry);
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(products, null, 2) + '\n');
}
