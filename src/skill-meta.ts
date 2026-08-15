import fs from 'node:fs/promises';
import path from 'node:path';
import type { SkillInfo } from './skill-lib.js';

export const SKILL_CATEGORIES = [
  'product',
  'design',
  'motion',
  'code',
  'writing',
  'research',
  'agent',
  'other',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export interface SkillMeta {
  category: SkillCategory;
  tags: string[];
  /** Where the category came from, so `other` can be told from a real guess. */
  via: 'curated' | 'prefix' | 'keyword' | 'unmatched';
}

export interface EnrichedSkill extends SkillInfo, SkillMeta {
  description: string;
}

/**
 * Skills raygent knows by name. Hand-written because a curated category beats an
 * inferred one, and because a skill's own description is written to trigger a
 * model rather than to classify itself -- `find-skills` reads as discovery,
 * `humanizer` reads as writing, and both would be filed wrongly by keyword.
 */
const CURATED: Record<string, SkillMeta> = {
  raygent: { category: 'product', tags: ['scaffold', 'init', 'interview'], via: 'curated' },
  impeccable: { category: 'design', tags: ['ui', 'ux', 'critique', 'frontend'], via: 'curated' },
  'apple-design': { category: 'design', tags: ['ui', 'motion', 'ios'], via: 'curated' },
  brandkit: { category: 'design', tags: ['brand', 'identity', 'imagegen'], via: 'curated' },
  'emil-design-eng': { category: 'design', tags: ['ui', 'polish', 'motion'], via: 'curated' },
  'high-end-visual-design': { category: 'design', tags: ['ui', 'visual'], via: 'curated' },
  'minimalist-ui': { category: 'design', tags: ['ui', 'visual'], via: 'curated' },
  'industrial-brutalist-ui': { category: 'design', tags: ['ui', 'visual'], via: 'curated' },
  'pick-ui-library': { category: 'design', tags: ['ui', 'decision'], via: 'curated' },
  'image-to-code': { category: 'design', tags: ['ui', 'frontend'], via: 'curated' },
  'stitch-design-taste': { category: 'design', tags: ['ui', 'taste'], via: 'curated' },
  'gpt-taste': { category: 'design', tags: ['ui', 'taste'], via: 'curated' },
  'redesign-existing-projects': { category: 'design', tags: ['ui', 'refactor'], via: 'curated' },
  'animation-vocabulary': { category: 'motion', tags: ['animation', 'reference'], via: 'curated' },
  'code-review': { category: 'code', tags: ['review', 'quality'], via: 'curated' },
  tdd: { category: 'code', tags: ['testing', 'discipline'], via: 'curated' },
  'improve-codebase-architecture': { category: 'code', tags: ['refactor', 'architecture'], via: 'curated' },
  humanizer: { category: 'writing', tags: ['copy', 'editing'], via: 'curated' },
  'ubiquitous-language': { category: 'writing', tags: ['naming', 'domain'], via: 'curated' },
  'find-skills': { category: 'agent', tags: ['discovery', 'skills'], via: 'curated' },
  orchestration: { category: 'agent', tags: ['multi-agent', 'coordination'], via: 'curated' },
  'computer-use': { category: 'agent', tags: ['desktop', 'automation'], via: 'curated' },
  'media-use': { category: 'agent', tags: ['media', 'automation'], via: 'curated' },
  prototype: { category: 'product', tags: ['prototype', 'spike'], via: 'curated' },
  spec: { category: 'product', tags: ['spec', 'planning'], via: 'curated' },
};

/**
 * Whole families share a purpose, and matching the prefix covers 50+ of the
 * skills on a typical machine without an entry each.
 */
const PREFIX_RULES: { prefix: string; meta: Omit<SkillMeta, 'via'> }[] = [
  { prefix: 'firecrawl', meta: { category: 'research', tags: ['web', 'scraping', 'firecrawl'] } },
  { prefix: 'remotion', meta: { category: 'motion', tags: ['video', 'remotion'] } },
  { prefix: 'hyperframes', meta: { category: 'motion', tags: ['animation', 'hyperframes'] } },
  { prefix: 'imagegen', meta: { category: 'design', tags: ['imagegen', 'frontend'] } },
  { prefix: 'design-taste', meta: { category: 'design', tags: ['ui', 'taste'] } },
  { prefix: 'orca', meta: { category: 'agent', tags: ['orca', 'automation'] } },
  { prefix: 'writing', meta: { category: 'writing', tags: ['copy'] } },
  { prefix: 'grill', meta: { category: 'writing', tags: ['critique', 'review'] } },
  { prefix: 'batch-grill', meta: { category: 'writing', tags: ['critique', 'review'] } },
];

/** Last resort, matched against name and description together. */
const KEYWORD_RULES: { match: RegExp; meta: Omit<SkillMeta, 'via'> }[] = [
  { match: /\banimat|\bmotion\b|\btransition\b/i, meta: { category: 'motion', tags: ['animation'] } },
  { match: /\bdesign\b|\bui\b|\bux\b|visual|typograph|\bbrand\b/i, meta: { category: 'design', tags: ['ui'] } },
  { match: /\btest|\brefactor|\breview\b|\blint\b|architecture/i, meta: { category: 'code', tags: ['quality'] } },
  { match: /\bwrit|\bdocs?\b|documentation|\bcopy\b|prose/i, meta: { category: 'writing', tags: ['docs'] } },
  { match: /\bsearch\b|\bscrape|\bresearch\b|\bcrawl\b|\bmarket\b/i, meta: { category: 'research', tags: ['web'] } },
  { match: /\bagent\b|\bskill\b|orchestrat|\bmcp\b|automation/i, meta: { category: 'agent', tags: ['agent'] } },
  { match: /\bspec\b|\bplan\b|\bproduct\b|\bscaffold|\bprd\b/i, meta: { category: 'product', tags: ['planning'] } },
];

/** Category and tags for a skill, most trustworthy source first. */
export function categorise(name: string, description = ''): SkillMeta {
  const curated = CURATED[name];
  if (curated) return curated;

  for (const rule of PREFIX_RULES) {
    if (name === rule.prefix || name.startsWith(`${rule.prefix}-`)) {
      return { ...rule.meta, via: 'prefix' };
    }
  }

  const haystack = `${name} ${description}`;
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(haystack)) return { ...rule.meta, via: 'keyword' };
  }

  // Deliberately not guessed. "other" is an honest answer; a wrong category is
  // worse than none, because it hides the skill in a group nobody opens.
  return { category: 'other', tags: [], via: 'unmatched' };
}

/** The `description:` value from a SKILL.md's YAML frontmatter, or ''. */
export async function readSkillDescription(skillDir: string): Promise<string> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf8');
  } catch {
    return '';
  }
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return '';

  // Hand-rolled rather than a YAML dependency: only one scalar is needed, and
  // descriptions are routinely unquoted multi-line blocks that a naive
  // line-splitter would cut at the first newline.
  const body = match[1];
  const start = /^description:[ \t]*/m.exec(body);
  if (!start) return '';
  const after = body.slice(start.index + start[0].length);
  const lines = after.split(/\r?\n/);
  const collected: string[] = [lines[0]];
  for (const line of lines.slice(1)) {
    // A continuation is indented; a new key is not.
    if (/^[A-Za-z-]+:/.test(line) || line.trim() === '') break;
    collected.push(line.trim());
  }
  return collected
    .join(' ')
    .replace(/^["'>|]\s*/, '')
    .replace(/["']$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A description condensed to something worth putting in a list, without cutting
 * mid-thought.
 *
 * Not truncation: it drops the "Use when the user wants to..." boilerplate every
 * skill opens with, collapses the long trigger enumerations that make some of
 * these 900 characters, and then keeps WHOLE sentences up to a budget. The
 * result always ends where a sentence ends.
 */
export function condenseDescription(raw: string, budget = 180): string {
  if (!raw) return '';

  let text = raw
    // Some descriptions open with a bullet, which survives the frontmatter read
    // and then blocks the lead-in rules below from matching at position 0.
    .replace(/^[-*•]\s+/, '')
    .replace(/^use\s+(this\s+skill\s+)?(when|to|for)\s+/i, '')
    .replace(/^this\s+skill\s+(should\s+be\s+used\s+)?(when|to|for)\s+/i, '')
    .replace(/^the\s+(user|agent)\s+(wants|asks)\s+to\s+/i, '')
    .trim();

  // "a, b, c, d, e, f, or h" -> "a, b, c, or h". Several skills list a dozen
  // synonyms as triggers: useful to a model, noise to a reader.
  //
  // Deliberately strict. Items must be one to three plain words and the real
  // conjunction must be present, because a loose version of this rule turned
  // "dashboards, product UI, ... and empty states" into "dashboards, or and
  // empty states" -- mangled meaning is worse than a long sentence.
  text = text.replace(
    /((?:[\w-]+(?:\s+[\w-]+){0,2},\s+){5,})(or|and)\s+([\w-]+(?:\s+[\w-]+){0,2})\b/gi,
    (_whole, list: string, conjunction: string, last: string) => {
      const items = list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return `${items.slice(0, 3).join(', ')}, ${conjunction} ${last.trim()}`;
    }
  );

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  let out = '';
  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    const next = out ? `${out} ${piece}` : piece;
    // Always keep the first sentence whole, however long -- cutting it is the
    // truncation this function exists to avoid.
    if (out && next.length > budget) break;
    out = next;
  }
  out = out.trim();
  if (out && !/[.!?]$/.test(out)) out += '.';
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/**
 * Word-wrap to a width, with every line after the first indented.
 *
 * Honours the width it is given rather than clamping to a minimum: the caller
 * knows the terminal size and already floors it, and a silent clamp here made
 * the function ignore narrow widths without saying so.
 */
export function wrapText(text: string, width: number, hangingIndent: number): string[] {
  const usable = Math.max(1, width);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const limit = lines.length === 0 ? usable : usable - hangingIndent;
    if (candidate.length > limit && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Attach description, category and tags to each discovered skill. */
export async function enrichSkills(skills: SkillInfo[], sourceDirFor: (s: SkillInfo) => string | null) {
  const enriched: EnrichedSkill[] = [];
  for (const skill of skills) {
    const dir = sourceDirFor(skill);
    const description = dir ? await readSkillDescription(dir) : '';
    enriched.push({ ...skill, description, ...categorise(skill.name, description) });
  }
  return enriched;
}

/** Group in SKILL_CATEGORIES order, dropping empty groups. */
export function groupByCategory(skills: EnrichedSkill[]): [SkillCategory, EnrichedSkill[]][] {
  return SKILL_CATEGORIES.map(
    (category) => [category, skills.filter((s) => s.category === category)] as [SkillCategory, EnrichedSkill[]]
  ).filter(([, group]) => group.length > 0);
}
