import fs from 'node:fs/promises';
import path from 'node:path';
import type { InterviewAnswers } from './interview.js';
import { DOC_SETS, docTitle, PROJECT_TYPES, type ProjectType } from './init-lib.js';

export interface FillResult {
  filled: string[];
  missed: string[];
}

const HEADING_RE = /^(#{2,3}) (.*)$/;

/**
 * Replace the body of the section whose `##`/`###` heading starts with
 * `heading` (prefix match, so 'Decisions still' matches "Decisions still the
 * client's"). The body is only replaced when it consists of placeholder
 * content — i.e. it contains `<TODO(content)>`, `<!-- TODO`, or `- <none yet>`.
 * Real content is never overwritten.
 */
export function fillSection(
  markdown: string,
  heading: string,
  body: string
): { text: string; didFill: boolean } {
  const lines = markdown.split('\n');

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADING_RE);
    if (m && m[2].startsWith(heading)) {
      start = i;
      break;
    }
  }
  if (start === -1) return { text: markdown, didFill: false };

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i])) {
      end = i;
      break;
    }
  }

  const sectionBody = lines.slice(start + 1, end).join('\n');
  const fillable =
    sectionBody.includes('<TODO(content)>') ||
    sectionBody.includes('<!-- TODO') ||
    sectionBody.includes('- <none yet>');
  if (!fillable) return { text: markdown, didFill: false };

  const next = [...lines.slice(0, start + 1), '', body, '', ...lines.slice(end)];
  return { text: next.join('\n'), didFill: true };
}

export interface ScaffoldSectionSpec {
  heading: string;
  keys: string[];
  /** Project types this spec applies to; undefined means both. */
  types?: string[];
}

/**
 * Map of scaffold doc paths (relative to targetDir) to fillable sections.
 * Headings are prefix-matched against the rendered scaffold docs.
 * `docs/DESIGN.md`'s 'Direction' entry is special: it is an *insert* after the
 * title/banner, not a section fill (the scaffold's DESIGN.md has no Direction
 * heading).
 */
export const SCAFFOLD_DOC_MAP: Record<string, ScaffoldSectionSpec[]> = {
  'docs/PRODUCT.md': [
    { heading: 'Problem & solution', keys: ['problem', 'solution'], types: ['product'] },
    { heading: 'Problem & solution', keys: ['projectDescription', 'requirements'], types: ['client'] },
    { heading: 'Vision', keys: ['vision', 'insight'], types: ['product'] },
    { heading: 'Who the user is', keys: ['targetUsers'], types: ['product'] },
    { heading: 'Who the user is', keys: ['clientName'], types: ['client'] },
    { heading: 'Target market', keys: ['market'], types: ['product'] },
    { heading: 'Competitors & alternatives', keys: ['competitors', 'differentiation'], types: ['product'] },
    { heading: 'Business model', keys: ['businessModel'], types: ['product'] },
    { heading: 'Business model', keys: ['budget'], types: ['client'] },
    { heading: 'Goals & success metrics', keys: ['successMetrics'], types: ['product'] },
    { heading: 'Goals & success metrics', keys: ['successCriteria'], types: ['client'] },
    { heading: 'Decisions still', keys: ['riskiestAssumption'], types: ['product'] },
    { heading: 'Decisions still', keys: ['decisionMaker'], types: ['client'] },
  ],
  'docs/PRD.md': [
    { heading: 'Phase 1', keys: ['roadmap'], types: ['product'] },
    { heading: 'Phase 1', keys: ['inScope', 'deliverables'], types: ['client'] },
    { heading: 'Parking lot', keys: ['nonGoals'], types: ['product'] },
    { heading: 'Parking lot', keys: ['outOfScope'], types: ['client'] },
  ],
  'docs/DESIGN.md': [{ heading: 'Direction', keys: ['designDirection'] }],
};

const OLD_BANNER_RE = /\*\*Not filled in yet\.\*\*[^\n]*/;
const NEW_BANNER =
  '**Pre-filled from the raygent guided interview** (docs/interview.json). ' +
  'Run /bootstrap-project to deepen any remaining <TODO(content)> sections.';

/** Join the non-empty answers for `keys` with blank lines; '' if all empty. */
function joinAnswers(answers: InterviewAnswers, keys: string[]): string {
  return keys
    .map((k) => (answers[k] ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Insert `## Direction` (with `direction` as its body) right after the H1
 * title line and the banner paragraph that follows it. No-op when `direction`
 * is empty or a `## Direction` heading already exists.
 */
function insertDirection(markdown: string, direction: string): { text: string; didFill: boolean } {
  const trimmed = direction.trim();
  if (!trimmed || /^## Direction\s*$/m.test(markdown)) return { text: markdown, didFill: false };

  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length && !/^# /.test(lines[i])) i++;
  if (i === lines.length) return { text: markdown, didFill: false };
  i++; // past the H1
  while (i < lines.length && lines[i].trim() === '') i++; // blank gap
  // banner paragraph: consecutive non-empty, non-heading lines
  while (i < lines.length && lines[i].trim() !== '' && !HEADING_RE.test(lines[i])) i++;

  const next = [...lines.slice(0, i), '', '## Direction', '', trimmed, ...lines.slice(i)];
  return { text: next.join('\n'), didFill: true };
}

export interface InterviewMeta {
  projectName: string;
  platform: string;
  framework?: string;
  type: string;
}

/** Write docs/interview.json capturing the interview; returns the file path. */
export async function writeInterviewJson(
  docsDir: string,
  meta: InterviewMeta,
  answers: InterviewAnswers
): Promise<string> {
  const filePath = path.join(docsDir, 'interview.json');
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    project: {
      name: meta.projectName,
      platform: meta.platform,
      framework: meta.framework,
      type: meta.type,
    },
    answers,
  };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + '\n');
  return filePath;
}

/**
 * Fill the scaffold-rendered docs under `targetDir` with interview answers.
 * Only placeholder sections are touched; on any fill the "Not filled in yet"
 * banner is swapped for a pre-filled notice. Sections that could not be filled
 * (empty answers, missing file, missing heading, real content already present)
 * are reported in `missed`.
 */
export async function applyInterviewToScaffoldDocs(
  targetDir: string,
  type: string,
  answers: InterviewAnswers
): Promise<FillResult> {
  const result: FillResult = { filled: [], missed: [] };

  for (const [rel, specs] of Object.entries(SCAFFOLD_DOC_MAP)) {
    const applicable = specs.filter((s) => !s.types || s.types.includes(type));
    if (applicable.length === 0) continue;

    const filePath = path.join(targetDir, ...rel.split('/'));
    let text: string;
    try {
      text = await fs.readFile(filePath, 'utf8');
    } catch {
      console.warn(`doc-fill: ${rel} not found, skipping`);
      for (const spec of applicable) result.missed.push(`${rel}: ${spec.heading}`);
      continue;
    }

    let changed = false;
    for (const spec of applicable) {
      const label = `${rel}: ${spec.heading}`;
      let outcome: { text: string; didFill: boolean };

      if (rel === 'docs/DESIGN.md' && spec.heading === 'Direction') {
        outcome = insertDirection(text, answers['designDirection'] ?? '');
      } else if (rel === 'docs/PRD.md' && spec.heading === 'Phase 1') {
        const joined = joinAnswers(answers, spec.keys);
        if (!joined) {
          result.missed.push(label);
          continue;
        }
        const doneKey = type === 'product' ? 'successMetrics' : 'successCriteria';
        const done = (answers[doneKey] ?? '').trim() || '<TODO(content)>';
        const body = `**Scope**: ${joined}\n\n**Definition of Done**:\n- [ ] ${done}`;
        outcome = fillSection(text, spec.heading, body);
      } else {
        const joined = joinAnswers(answers, spec.keys);
        if (!joined) {
          result.missed.push(label);
          continue;
        }
        outcome = fillSection(text, spec.heading, joined);
      }

      if (outcome.didFill) {
        text = outcome.text;
        changed = true;
        result.filled.push(label);
      } else {
        result.missed.push(label);
      }
    }

    if (changed) {
      text = text.replace(OLD_BANNER_RE, NEW_BANNER);
      await fs.writeFile(filePath, text);
    }
  }

  return result;
}

function stubSection(title: string, content: string): string {
  const trimmed = content.trim();
  return `## ${title}\n\n${trimmed || `<!-- TODO: ${title} -->`}\n`;
}

/**
 * Render a raygent stub doc (created by initProject) as a structured doc
 * pre-filled from interview answers. Returns the full new file content, or
 * null when the filename has no interview-backed structure for this type
 * (leave the stub as-is). Files with all-empty answers still get the
 * structured version, with every section a TODO comment, so the doc shape is
 * consistent regardless of which questions were skipped.
 */
export function renderStubDoc(
  filename: string,
  type: string,
  answers: InterviewAnswers,
  projectName: string
): string | null {
  void projectName; // titles come from the filename, matching init-lib's docTitle
  const a = (key: string): string => (answers[key] ?? '').trim();
  const join = (...keys: string[]): string => joinAnswers(answers, keys);

  let sections: [string, string][] | null = null;

  if (type === 'product') {
    switch (filename) {
      case 'PRD.md':
        sections = [
          ['Problem', a('problem')],
          ['Solution', a('solution')],
          ['Target users', a('targetUsers')],
          ['Scope v1', a('roadmap')],
          ['Non-goals', a('nonGoals')],
          ['Success metrics', a('successMetrics')],
        ];
        break;
      case 'VISION.md':
        sections = [
          ['Vision', a('vision')],
          ['Unique insight', a('insight')],
          ['Market', a('market')],
          ['Competitors & alternatives', join('competitors', 'differentiation')],
          ['Business model', a('businessModel')],
          ['Riskiest assumption', a('riskiestAssumption')],
        ];
        break;
      case 'product-roadmap.md':
        sections = [['Phases', a('roadmap')]];
        break;
      case 'DESIGN.md':
        sections = [
          ['Direction', a('designDirection')],
          ['Tokens', ''],
          ['Typography', ''],
          ['Components', ''],
        ];
        break;
    }
  } else if (type === 'client') {
    switch (filename) {
      case 'PRD.md':
        sections = [
          ['Client', a('clientName')],
          ['Project description', a('projectDescription')],
          ['Requirements', a('requirements')],
          ['Acceptance criteria', a('successCriteria')],
        ];
        break;
      case 'scope.md':
        sections = [
          ['In scope', a('inScope')],
          ['Out of scope', a('outOfScope')],
          ['Deliverables', a('deliverables')],
          ['Timeline & budget', join('timeline', 'budget')],
        ];
        break;
      case 'handoff.md':
        sections = [
          ['Decision-maker', a('decisionMaker')],
          ['Deliverables checklist', a('deliverables')],
          ['Handover notes', ''],
        ];
        break;
      case 'DESIGN.md':
        sections = [
          ['Direction', a('designDirection')],
          ['Tokens', ''],
          ['Typography', ''],
          ['Components', ''],
        ];
        break;
      case 'ARCHITECTURE.md':
        sections = [
          ['Integration constraints', a('integrations')],
          ['Overview', ''],
        ];
        break;
    }
  }

  if (!sections) return null;

  return `# ${docTitle(filename)}\n\n${sections.map(([t, c]) => stubSection(t, c)).join('\n')}`;
}

/**
 * Overwrite the raygent stub docs in `docsDir` with structured, interview
 * pre-filled versions. Files renderStubDoc has no structure for keep their
 * original stub content.
 */
export async function applyInterviewToStubDocs(
  docsDir: string,
  type: string,
  answers: InterviewAnswers,
  projectName: string
): Promise<void> {
  if (!PROJECT_TYPES.includes(type as ProjectType)) {
    throw new Error(`invalid type '${type}' (expected one of: ${PROJECT_TYPES.join(', ')})`);
  }
  for (const filename of DOC_SETS[type as ProjectType]) {
    const rendered = renderStubDoc(filename, type, answers, projectName);
    if (rendered === null) continue;
    await fs.writeFile(path.join(docsDir, filename), rendered);
  }
}
