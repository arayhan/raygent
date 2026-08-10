import type { AiConfig } from './config.js';
import type { InterviewQuestion, InterviewAnswers } from './interview.js';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface ProjectMeta {
  projectName: string;
  platform: string;
  framework?: string;
  type: string;
}

const FEEDBACK_PERSONAS: Record<string, string> = {
  product:
    'You are a seasoned Y Combinator partner giving office-hours feedback on a startup plan. ' +
    'Be direct, specific, and concise. Name the weakest parts plainly. No flattery, no generic advice.',
  client:
    'You are a principal consultant reviewing a client project brief before kickoff. ' +
    'Be direct and specific: find scope gaps, ambiguous requirements, timeline/budget risks, and missing acceptance criteria.',
};

const FEEDBACK_INSTRUCTION =
  'Give: 1) a one-paragraph overall read, 2) the three sharpest risks or unanswered questions, ' +
  '3) what to validate first and how, 4) concrete suggestions to strengthen the plan. Markdown, under 600 words.';

const ELABORATE_SYSTEM =
  "You are a senior product writer elaborating a project's planning docs from raw founder interview answers. " +
  'Rules: preserve every markdown heading exactly as given; expand only from information in the answers — ' +
  'do not invent facts, names, or numbers; keep any <TODO(content)> or <!-- TODO --> marker whose section has ' +
  'no supporting answer; keep each doc under 200 lines. Respond with ONLY a JSON object: ' +
  '{"files": {"<relative path>": "<full new file content>"}} covering exactly the files provided.';

function projectHeader(meta: ProjectMeta): string {
  const stack = meta.framework ? `${meta.platform} (${meta.framework})` : meta.platform;
  return `Project: ${meta.projectName}\nPlatform: ${stack}\nType: ${meta.type}`;
}

export async function chatCompletion(
  cfg: AiConfig,
  messages: ChatMessage[],
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<string> {
  const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: cfg.model, messages }),
  });

  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      // Ignore body read failures; the status alone is still useful.
    }
    throw new Error(`AI request failed with status ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: unknown = await res.json();
  const content = (data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
    ?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('unexpected response shape from AI endpoint: missing choices[0].message.content');
  }
  return content;
}

export function buildFeedbackMessages(
  meta: ProjectMeta,
  questions: readonly InterviewQuestion[],
  answers: InterviewAnswers
): ChatMessage[] {
  const persona = FEEDBACK_PERSONAS[meta.type] ?? FEEDBACK_PERSONAS.product;

  const transcript = questions
    .map((q) => `### ${q.message}\n${answers[q.key] || '(skipped)'}`)
    .join('\n\n');

  const user = `${projectHeader(meta)}\n\n${transcript}\n\n${FEEDBACK_INSTRUCTION}`;

  return [
    { role: 'system', content: persona },
    { role: 'user', content: user },
  ];
}

export function buildElaborateMessages(
  meta: ProjectMeta,
  answers: InterviewAnswers,
  docs: Record<string, string>
): ChatMessage[] {
  const answerLines = Object.entries(answers)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const docBlocks = Object.entries(docs)
    .map(([relPath, content]) => `FILE: ${relPath}\n---\n${content}\n---`)
    .join('\n\n');

  const user = `${projectHeader(meta)}\n\nInterview answers:\n${answerLines}\n\n${docBlocks}`;

  return [
    { role: 'system', content: ELABORATE_SYSTEM },
    { role: 'user', content: user },
  ];
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/m.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

export function parseElaborateResponse(
  raw: string,
  expectedFiles: string[]
): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new Error('elaborate response was not valid JSON');
  }

  const files = (parsed as { files?: unknown })?.files;
  if (files === null || typeof files !== 'object' || Array.isArray(files)) {
    throw new Error('elaborate response had unexpected shape: expected { files: { ... } }');
  }

  const expected = new Set(expectedFiles);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(files as Record<string, unknown>)) {
    if (expected.has(key) && typeof value === 'string') {
      result[key] = value;
    }
  }

  if (Object.keys(result).length === 0) {
    throw new Error('elaborate response contained no expected files');
  }
  return result;
}

export async function runFeedback(
  cfg: AiConfig,
  meta: ProjectMeta,
  questions: readonly InterviewQuestion[],
  answers: InterviewAnswers,
  fetchImpl?: typeof fetch
): Promise<string> {
  return chatCompletion(cfg, buildFeedbackMessages(meta, questions, answers), fetchImpl);
}

function extractHeadings(content: string): string[] {
  return content.split(/\r?\n/).filter((line) => /^#{1,6} /.test(line));
}

export async function runElaborate(
  cfg: AiConfig,
  meta: ProjectMeta,
  answers: InterviewAnswers,
  docs: Record<string, string>,
  fetchImpl?: typeof fetch
): Promise<Record<string, string>> {
  const raw = await chatCompletion(cfg, buildElaborateMessages(meta, answers, docs), fetchImpl);
  const parsed = parseElaborateResponse(raw, Object.keys(docs));

  const result: Record<string, string> = {};
  for (const [relPath, newContent] of Object.entries(parsed)) {
    const originalHeadings = extractHeadings(docs[relPath] ?? '');
    const newLines = new Set(newContent.split(/\r?\n/));
    const missing = originalHeadings.filter((h) => !newLines.has(h));
    if (missing.length > 0) {
      console.warn(
        `raygent: dropping ${relPath} from elaborate result — missing heading(s): ${missing.join(', ')}`
      );
      continue;
    }
    result[relPath] = newContent;
  }
  return result;
}
