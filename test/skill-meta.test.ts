import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  categorise,
  condenseDescription,
  readSkillDescription,
  wrapText,
  groupByCategory,
  SKILL_CATEGORIES,
  type EnrichedSkill,
} from '../src/skill-meta.js';

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'raygent-meta-'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('categorise', () => {
  it('prefers a curated entry over anything inferable', () => {
    // find-skills reads as "discovery" by keyword; it is agent tooling.
    expect(categorise('find-skills', 'Helps users discover and install agent skills')).toMatchObject({
      category: 'agent',
      via: 'curated',
    });
  });

  it('matches a whole family by prefix', () => {
    expect(categorise('firecrawl-lead-gen', '')).toMatchObject({ category: 'research', via: 'prefix' });
    expect(categorise('remotion-captions', '')).toMatchObject({ category: 'motion', via: 'prefix' });
  });

  it('does not treat a prefix as a substring match', () => {
    // "orca" must not claim "orchestration-adjacent" names it does not own.
    expect(categorise('orcaless-thing', '').via).not.toBe('prefix');
  });

  it('falls back to keywords in the description', () => {
    expect(categorise('some-tool', 'Review the test suite and refactor it')).toMatchObject({
      category: 'code',
      via: 'keyword',
    });
  });

  it('returns other rather than guessing', () => {
    expect(categorise('zzz-unknown', 'Lorem ipsum dolor sit amet')).toMatchObject({
      category: 'other',
      via: 'unmatched',
      tags: [],
    });
  });

  it('only ever returns a known category', () => {
    for (const name of ['impeccable', 'firecrawl-x', 'zzz', 'tdd']) {
      expect(SKILL_CATEGORIES).toContain(categorise(name, '').category);
    }
  });
});

describe('condenseDescription', () => {
  it('drops the "Use when" lead-in every skill opens with', () => {
    expect(condenseDescription('Use when the user wants to polish a UI.')).toBe('Polish a UI.');
  });

  it('keeps a space between sentences', () => {
    const out = condenseDescription('First thing. Second thing.');
    expect(out).toBe('First thing. Second thing.');
  });

  it('collapses a long trigger enumeration without breaking grammar', () => {
    // Regression: a looser rule produced "dashboards, or and empty states".
    const out = condenseDescription(
      'Covers websites, landing pages, dashboards, product UI, app shells, forms, and empty states.'
    );
    expect(out).not.toMatch(/\bor and\b|\band and\b|,\s*,/);
    expect(out).toMatch(/and empty states\.$/);
  });

  it('leaves a short list alone', () => {
    expect(condenseDescription('Covers a, b, and c.')).toBe('Covers a, b, and c.');
  });

  it('never cuts mid-word', () => {
    const long = 'A '.repeat(200) + 'end.';
    const out = condenseDescription(long, 40);
    expect(out.endsWith('…')).toBe(false);
    expect(out).toMatch(/[.!?]$/);
  });

  it('keeps the first sentence whole even past the budget', () => {
    const first = 'This one sentence is definitely longer than the budget allows for.';
    expect(condenseDescription(`${first} Second.`, 10)).toBe(first);
  });

  it('stops adding sentences once the budget is reached', () => {
    const out = condenseDescription('One. Two. Three. Four. Five. Six. Seven. Eight.', 20);
    expect(out.length).toBeLessThanOrEqual(24);
    expect(out).toMatch(/^One\./);
  });

  it('returns empty for empty input', () => {
    expect(condenseDescription('')).toBe('');
  });
});

describe('readSkillDescription', () => {
  async function writeSkill(body: string) {
    const dir = path.join(tmp, 'x');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'SKILL.md'), body);
    return dir;
  }

  it('reads a single-line description', async () => {
    const dir = await writeSkill('---\nname: x\ndescription: Does a thing\n---\nbody');
    expect(await readSkillDescription(dir)).toBe('Does a thing');
  });

  it('joins a wrapped multi-line description', async () => {
    const dir = await writeSkill('---\nname: x\ndescription: First part\n  second part\n---\n');
    expect(await readSkillDescription(dir)).toBe('First part second part');
  });

  it('stops at the next frontmatter key', async () => {
    const dir = await writeSkill('---\nname: x\ndescription: Only this\nversion: 1.0.0\n---\n');
    expect(await readSkillDescription(dir)).toBe('Only this');
  });

  it('returns empty when there is no frontmatter', async () => {
    const dir = await writeSkill('# just a heading\n');
    expect(await readSkillDescription(dir)).toBe('');
  });

  it('returns empty when SKILL.md is missing', async () => {
    expect(await readSkillDescription(path.join(tmp, 'nope'))).toBe('');
  });
});

describe('wrapText', () => {
  it('wraps at the width without splitting words', () => {
    const lines = wrapText('aaa bbb ccc ddd', 7, 0);
    expect(lines.every((l) => l.length <= 7)).toBe(true);
    expect(lines.join(' ')).toBe('aaa bbb ccc ddd');
  });

  it('keeps a word longer than the width on its own line', () => {
    expect(wrapText('short supercalifragilistic', 10, 0)).toContain('supercalifragilistic');
  });
});

describe('groupByCategory', () => {
  const skill = (name: string, category: EnrichedSkill['category']): EnrichedSkill => ({
    name,
    category,
    installed: false,
    installedGlobally: false,
    source: 'personal',
    description: '',
    tags: [],
    via: 'curated',
  });

  it('drops empty groups and keeps declaration order', () => {
    const groups = groupByCategory([skill('a', 'code'), skill('b', 'design')]);
    expect(groups.map(([c]) => c)).toEqual(['design', 'code']);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
