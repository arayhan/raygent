import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

export interface FinanceEntry {
  product: string;
  amount: number;
  note?: string;
  ts: string;
}

export interface FinanceSummary {
  byProduct: Record<string, number>;
  byMonth: Record<string, number>; // key: YYYY-MM
  total: number;
}

export function financePath(): string {
  return path.join(os.homedir(), '.raygent', 'finance.jsonl');
}

export async function addFinanceEntry(entry: FinanceEntry, filePath: string = financePath()): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, JSON.stringify(entry) + '\n');
}

export async function readFinanceEntries(filePath: string = financePath()): Promise<FinanceEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }
  const entries: FinanceEntry[] = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        typeof (parsed as FinanceEntry).product === 'string' &&
        typeof (parsed as FinanceEntry).amount === 'number' &&
        Number.isFinite((parsed as FinanceEntry).amount)
      ) {
        entries.push(parsed as FinanceEntry);
      }
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

export function summarizeFinance(entries: FinanceEntry[]): FinanceSummary {
  const byProduct: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  let total = 0;
  for (const entry of entries) {
    byProduct[entry.product] = (byProduct[entry.product] ?? 0) + entry.amount;
    const month = entry.ts.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + entry.amount;
    total += entry.amount;
  }
  return { byProduct, byMonth, total };
}
