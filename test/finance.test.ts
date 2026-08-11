import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { addFinanceEntry, readFinanceEntries, summarizeFinance } from '../src/finance.js';

let dir: string;
let filePath: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-finance-'));
  filePath = path.join(dir, 'finance.jsonl');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('finance', () => {
  it('appends and reads entries', async () => {
    await addFinanceEntry({ product: 'a', amount: 100, ts: '2026-08-01T00:00:00Z' }, filePath);
    await addFinanceEntry({ product: 'b', amount: 50, note: 'client x', ts: '2026-08-02T00:00:00Z' }, filePath);

    const entries = await readFinanceEntries(filePath);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ product: 'b', amount: 50, note: 'client x' });
  });

  it('skips malformed and non-numeric lines', async () => {
    fs.writeFileSync(
      filePath,
      ['not json', '{"product":"a","amount":"NaN-string","ts":"t"}', '{"product":"a","amount":10,"ts":"2026-08-01T00:00:00Z"}'].join(
        '\n'
      ) + '\n'
    );
    const entries = await readFinanceEntries(filePath);
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(10);
  });

  it('summarizes per product, per month, and total', () => {
    const summary = summarizeFinance([
      { product: 'a', amount: 100, ts: '2026-07-15T00:00:00Z' },
      { product: 'a', amount: 200, ts: '2026-08-01T00:00:00Z' },
      { product: 'b', amount: 50, ts: '2026-08-02T00:00:00Z' },
    ]);
    expect(summary.byProduct).toEqual({ a: 300, b: 50 });
    expect(summary.byMonth).toEqual({ '2026-07': 100, '2026-08': 250 });
    expect(summary.total).toBe(350);
  });

  it('missing file reads as empty', async () => {
    expect(await readFinanceEntries(filePath)).toEqual([]);
  });
});
