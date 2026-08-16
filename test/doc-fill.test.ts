import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  fillSection,
  SCAFFOLD_DOC_MAP,
  applyInterviewToScaffoldDocs,
  renderStubDoc,
  applyInterviewToStubDocs,
  writeInterviewJson,
  insertStateDocInAgentsMd,
  STATE_DOC_ROW,
} from '../src/doc-fill.js';
import type { InterviewAnswers } from '../src/interview.js';
import { CLIENT_QUESTIONS, PRODUCT_QUESTIONS } from '../src/interview.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/scaffold-docs', import.meta.url));

const FULL_CLIENT_ANSWERS: InterviewAnswers = Object.fromEntries(
  CLIENT_QUESTIONS.map((q) => [q.key, `answer for ${q.key}`])
);

const FULL_PRODUCT_ANSWERS: InterviewAnswers = Object.fromEntries(
  PRODUCT_QUESTIONS.map((q) => [q.key, `answer for ${q.key}`])
);

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-doc-fill-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** Copy fixture docs into tmp as <tmp>/docs/, optionally a subset. */
function copyFixtures(files = ['PRODUCT.md', 'PRD.md', 'DESIGN.md']): string {
  const docsDir = path.join(tmp, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  for (const f of files) {
    fs.copyFileSync(path.join(FIXTURES, f), path.join(docsDir, f));
  }
  return docsDir;
}

describe('fillSection', () => {
  const doc = [
    '# Title',
    '',
    '**Not filled in yet.** banner.',
    '',
    '## Vision',
    '',
    '<TODO(content)> — hint text.',
    '',
    '## Filled already',
    '',
    'Real content here.',
    '',
    "## Decisions still the client's",
    '',
    '<TODO(content)>',
    '',
  ].join('\n');

  it('fills a TODO body and leaves the rest intact', () => {
    const { text, didFill } = fillSection(doc, 'Vision', 'Big vision.');
    expect(didFill).toBe(true);
    expect(text).toContain('## Vision\n\nBig vision.\n\n## Filled already');
    expect(text).toContain('Real content here.');
  });

  it('refuses to overwrite a non-TODO body', () => {
    const { text, didFill } = fillSection(doc, 'Filled already', 'Overwrite attempt');
    expect(didFill).toBe(false);
    expect(text).toBe(doc);
  });

  it('matches headings by prefix', () => {
    const { text, didFill } = fillSection(doc, 'Decisions still', 'The client decides pricing.');
    expect(didFill).toBe(true);
    expect(text).toContain("## Decisions still the client's\n\nThe client decides pricing.");
  });

  it('returns didFill=false for a missing heading', () => {
    const { text, didFill } = fillSection(doc, 'No such heading', 'x');
    expect(didFill).toBe(false);
    expect(text).toBe(doc);
  });

  it('fills a "- <none yet>" parking-lot style body', () => {
    const prd = '# T\n\n## Parking lot\n\nExplanation.\n\n- <none yet>\n';
    const { text, didFill } = fillSection(prd, 'Parking lot', '- dark mode');
    expect(didFill).toBe(true);
    expect(text).toContain('## Parking lot\n\n- dark mode\n');
    expect(text).not.toContain('<none yet>');
  });
});

describe('SCAFFOLD_DOC_MAP tripwire against real scaffold output', () => {
  for (const [rel, specs] of Object.entries(SCAFFOLD_DOC_MAP)) {
    const fixture = fs.readFileSync(path.join(FIXTURES, path.basename(rel)), 'utf8');
    const headings = fixture
      .split('\n')
      .map((line) => line.match(/^#{2,3} (.*)$/)?.[1])
      .filter((h): h is string => h !== undefined);

    for (const spec of specs) {
      // DESIGN.md 'Direction' is an insert, not a section fill: exempt.
      if (rel === 'docs/DESIGN.md' && spec.heading === 'Direction') continue;

      it(`${rel} '${spec.heading}' matches a real heading`, () => {
        expect(headings.some((h) => h.startsWith(spec.heading))).toBe(true);
      });
    }
  }

  it('DESIGN.md fixture has no pre-existing Direction heading (insert target)', () => {
    const fixture = fs.readFileSync(path.join(FIXTURES, 'DESIGN.md'), 'utf8');
    expect(/^## Direction\s*$/m.test(fixture)).toBe(false);
  });
});

describe('applyInterviewToScaffoldDocs', () => {
  it('fills all client sections from full answers and swaps the banner', async () => {
    copyFixtures();
    const result = await applyInterviewToScaffoldDocs(tmp, 'client', FULL_CLIENT_ANSWERS);

    expect(result.missed).toEqual([]);
    expect(result.filled).toContain('docs/PRODUCT.md: Problem & solution');
    expect(result.filled).toContain('docs/PRD.md: Phase 1');
    expect(result.filled).toContain('docs/DESIGN.md: Direction');

    const product = fs.readFileSync(path.join(tmp, 'docs', 'PRODUCT.md'), 'utf8');
    expect(product).toContain('answer for projectDescription\n\nanswer for requirements');
    expect(product).toContain('answer for decisionMaker');
    expect(product).not.toContain('**Not filled in yet.**');
    expect(product).toContain('**Pre-filled from the raygent guided interview**');

    const prd = fs.readFileSync(path.join(tmp, 'docs', 'PRD.md'), 'utf8');
    expect(prd).toContain('**Scope**: answer for inScope\n\nanswer for deliverables');
    expect(prd).toContain('**Definition of Done**:\n- [ ] answer for successCriteria');
    expect(prd).toContain('answer for outOfScope');
    expect(prd).not.toContain('<none yet>');
    // Phases 2 and 3 are not mapped: still TODO
    expect(prd).toContain('## Phase 2 — client checkpoint\n\n**Scope**: <TODO(content)>');

    const design = fs.readFileSync(path.join(tmp, 'docs', 'DESIGN.md'), 'utf8');
    expect(design).toContain('## Direction\n\nanswer for designDirection\n\n## Tokens');
    // untouched sections remain TODO
    expect(design).toContain('## Typography\n\n<TODO(content)>');
  });

  it('fills product sections including Decisions still via prefix match', async () => {
    copyFixtures();
    const result = await applyInterviewToScaffoldDocs(tmp, 'product', FULL_PRODUCT_ANSWERS);

    expect(result.missed).toEqual([]);
    const product = fs.readFileSync(path.join(tmp, 'docs', 'PRODUCT.md'), 'utf8');
    expect(product).toContain("## Decisions still the client's\n\nanswer for riskiestAssumption");
    expect(product).toContain('answer for problem\n\nanswer for solution');

    const prd = fs.readFileSync(path.join(tmp, 'docs', 'PRD.md'), 'utf8');
    expect(prd).toContain('**Scope**: answer for roadmap');
    expect(prd).toContain('- [ ] answer for successMetrics');
  });

  it('leaves TODO placeholders for skipped answers and reports them missed', async () => {
    copyFixtures();
    const answers: InterviewAnswers = { ...FULL_CLIENT_ANSWERS, budget: '', designDirection: '' };
    const result = await applyInterviewToScaffoldDocs(tmp, 'client', answers);

    expect(result.missed).toContain('docs/PRODUCT.md: Business model');
    expect(result.missed).toContain('docs/DESIGN.md: Direction');

    const product = fs.readFileSync(path.join(tmp, 'docs', 'PRODUCT.md'), 'utf8');
    expect(product).toContain('## Business model\n\n<TODO(content)>');
    // other sections were still filled, so the banner swapped
    expect(product).toContain('**Pre-filled from the raygent guided interview**');

    const design = fs.readFileSync(path.join(tmp, 'docs', 'DESIGN.md'), 'utf8');
    expect(design).not.toContain('## Direction');
    // no fill happened in DESIGN.md: banner untouched
    expect(design).toContain('**Not filled in yet.**');
  });

  it('warns and continues when a mapped file is missing', async () => {
    copyFixtures(['PRODUCT.md']); // no PRD.md, no DESIGN.md
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await applyInterviewToScaffoldDocs(tmp, 'client', FULL_CLIENT_ANSWERS);

    expect(warn).toHaveBeenCalled();
    expect(result.missed).toContain('docs/PRD.md: Phase 1');
    expect(result.missed).toContain('docs/PRD.md: Parking lot');
    expect(result.missed).toContain('docs/DESIGN.md: Direction');
    // PRODUCT.md still got filled
    expect(result.filled).toContain('docs/PRODUCT.md: Problem & solution');
  });

  it('does not refill sections with real content on a second run', async () => {
    copyFixtures();
    await applyInterviewToScaffoldDocs(tmp, 'client', FULL_CLIENT_ANSWERS);
    const first = fs.readFileSync(path.join(tmp, 'docs', 'PRODUCT.md'), 'utf8');

    const result = await applyInterviewToScaffoldDocs(tmp, 'client', {
      ...FULL_CLIENT_ANSWERS,
      projectDescription: 'DIFFERENT',
    });
    const second = fs.readFileSync(path.join(tmp, 'docs', 'PRODUCT.md'), 'utf8');
    expect(second).toBe(first);
    expect(result.filled).not.toContain('docs/PRODUCT.md: Problem & solution');
  });
});

describe('renderStubDoc', () => {
  it('renders product PRD.md with all sections filled', () => {
    const out = renderStubDoc('PRD.md', 'product', FULL_PRODUCT_ANSWERS, 'demo');
    expect(out).not.toBeNull();
    expect(out).toContain('# PRD');
    expect(out).toContain('## Problem\n\nanswer for problem');
    expect(out).toContain('## Solution\n\nanswer for solution');
    expect(out).toContain('## Target users\n\nanswer for targetUsers');
    expect(out).toContain('## Scope v1\n\nanswer for roadmap');
    expect(out).toContain('## Non-goals\n\nanswer for nonGoals');
    expect(out).toContain('## Success metrics\n\nanswer for successMetrics');
  });

  it('renders all-empty answers as a structured doc of TODO comments', () => {
    const out = renderStubDoc('PRD.md', 'product', {}, 'demo');
    expect(out).not.toBeNull();
    expect(out).toContain('## Problem\n\n<!-- TODO: Problem -->');
    expect(out).toContain('## Success metrics\n\n<!-- TODO: Success metrics -->');
  });

  it('returns null for filenames without interview-backed structure', () => {
    expect(renderStubDoc('ANTISLOP.md', 'product', FULL_PRODUCT_ANSWERS, 'demo')).toBeNull();
    expect(renderStubDoc('DATABASE.md', 'client', FULL_CLIENT_ANSWERS, 'demo')).toBeNull();
    expect(renderStubDoc('scope.md', 'product', FULL_PRODUCT_ANSWERS, 'demo')).toBeNull();
  });

  it('joins multi-key sections and always TODOs fixed sections', () => {
    const vision = renderStubDoc('VISION.md', 'product', FULL_PRODUCT_ANSWERS, 'demo');
    expect(vision).toContain(
      '## Competitors & alternatives\n\nanswer for competitors\n\nanswer for differentiation'
    );

    const design = renderStubDoc('DESIGN.md', 'client', FULL_CLIENT_ANSWERS, 'demo');
    expect(design).toContain('## Direction\n\nanswer for designDirection');
    expect(design).toContain('## Tokens\n\n<!-- TODO: Tokens -->');

    const handoff = renderStubDoc('handoff.md', 'client', FULL_CLIENT_ANSWERS, 'demo');
    expect(handoff).toContain('# Handoff');
    expect(handoff).toContain('## Handover notes\n\n<!-- TODO: Handover notes -->');
  });
});

describe('applyInterviewToStubDocs', () => {
  it('overwrites the client stub docs that have structure', async () => {
    const docsDir = path.join(tmp, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    // pre-seed stubs so overwrite is observable
    for (const f of ['PRD.md', 'scope.md', 'handoff.md', 'DESIGN.md', 'ARCHITECTURE.md', 'ANTISLOP.md']) {
      fs.writeFileSync(path.join(docsDir, f), 'stub\n');
    }

    await applyInterviewToStubDocs(docsDir, 'client', FULL_CLIENT_ANSWERS, 'demo');

    expect(fs.readFileSync(path.join(docsDir, 'PRD.md'), 'utf8')).toContain('answer for clientName');
    expect(fs.readFileSync(path.join(docsDir, 'scope.md'), 'utf8')).toContain(
      '## Timeline & budget\n\nanswer for timeline\n\nanswer for budget'
    );
    expect(fs.readFileSync(path.join(docsDir, 'handoff.md'), 'utf8')).toContain('answer for decisionMaker');
    expect(fs.readFileSync(path.join(docsDir, 'ARCHITECTURE.md'), 'utf8')).toContain('answer for integrations');
    // no structure for ANTISLOP.md: untouched
    expect(fs.readFileSync(path.join(docsDir, 'ANTISLOP.md'), 'utf8')).toBe('stub\n');
  });

  it('writes the product docs with structure into an empty docsDir', async () => {
    const docsDir = path.join(tmp, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    await applyInterviewToStubDocs(docsDir, 'product', FULL_PRODUCT_ANSWERS, 'demo');

    expect(fs.readdirSync(docsDir).sort()).toEqual(
      ['DESIGN.md', 'PRD.md', 'VISION.md', 'product-roadmap.md'].sort()
    );
    expect(fs.readFileSync(path.join(docsDir, 'product-roadmap.md'), 'utf8')).toContain(
      '# Product Roadmap'
    );
  });

  it('rejects an invalid type', async () => {
    await expect(applyInterviewToStubDocs(tmp, 'bogus', {}, 'demo')).rejects.toThrow(/invalid type/);
  });
});

describe('writeInterviewJson', () => {
  it('round-trips meta and answers including skipped ("") keys', async () => {
    const answers: InterviewAnswers = { problem: 'p', solution: '', vision: 'v' };
    const filePath = await writeInterviewJson(
      tmp,
      { projectName: 'demo', platform: 'web', framework: 'nextjs', type: 'product' },
      answers
    );

    expect(filePath).toBe(path.join(tmp, 'interview.json'));
    const raw = fs.readFileSync(filePath, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);

    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(new Date(parsed.createdAt).toString()).not.toBe('Invalid Date');
    expect(parsed.project).toEqual({ name: 'demo', platform: 'web', framework: 'nextjs', type: 'product' });
    expect(parsed.answers).toEqual(answers);
    expect(parsed.answers.solution).toBe('');
  });
});

describe('insertStateDocInAgentsMd', () => {
  const sampleAgentsMd = [
    '# Test Project',
    '',
    '## Docs (read in this order)',
    '',
    '| Doc | Content |',
    '|---|---|',
    '| [docs/PRODUCT.md](docs/PRODUCT.md) | Product truth |',
    '| [docs/PRD.md](docs/PRD.md) | Product spec |',
    '| [docs/architecture.md](docs/architecture.md) | System diagram |',
    '| [docs/PROGRESS.md](docs/PROGRESS.md) | Decision/progress log |',
    '',
    '## Coding rules',
  ].join('\n');

  it('inserts STATE.md row immediately before the PROGRESS.md row', () => {
    const { text, didInsert } = insertStateDocInAgentsMd(sampleAgentsMd);
    expect(didInsert).toBe(true);
    expect(text).toContain(
      `${STATE_DOC_ROW}\n| [docs/PROGRESS.md](docs/PROGRESS.md) | Decision/progress log |`
    );
  });

  it('is idempotent and leaves text unchanged if STATE.md is already present', () => {
    const alreadyInserted = [
      '| [docs/PRODUCT.md](docs/PRODUCT.md) | Product truth |',
      STATE_DOC_ROW,
      '| [docs/PROGRESS.md](docs/PROGRESS.md) | Decision/progress log |',
    ].join('\n');

    const { text, didInsert } = insertStateDocInAgentsMd(alreadyInserted);
    expect(didInsert).toBe(true);
    expect(text).toBe(alreadyInserted);
  });

  it('returns didInsert=false when PROGRESS.md row is not found (fails loudly)', () => {
    const brokenDocsTable = [
      '# Test Project',
      '',
      '## Docs (read in this order)',
      '',
      '| Doc | Content |',
      '|---|---|',
      '| [docs/PRODUCT.md](docs/PRODUCT.md) | Product truth |',
    ].join('\n');

    const { text, didInsert } = insertStateDocInAgentsMd(brokenDocsTable);
    expect(didInsert).toBe(false);
    expect(text).toBe(brokenDocsTable);
  });
});

