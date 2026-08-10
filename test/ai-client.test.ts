import { describe, it, expect, vi } from 'vitest';
import type { AiConfig } from '../src/config.js';
import type { InterviewQuestion, InterviewAnswers } from '../src/interview.js';
import {
  chatCompletion,
  buildFeedbackMessages,
  buildElaborateMessages,
  parseElaborateResponse,
  runElaborate,
  type ProjectMeta,
} from '../src/ai-client.js';

const cfg: AiConfig = {
  baseUrl: 'https://x.example/v1',
  apiKey: 'sk-test-key',
  model: 'test-model',
};

const productMeta: ProjectMeta = {
  projectName: 'Acme',
  platform: 'web',
  framework: 'nextjs',
  type: 'product',
};

const clientMeta: ProjectMeta = {
  projectName: 'Acme',
  platform: 'mobile',
  type: 'client',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function chatResponse(content: string): Response {
  return jsonResponse({ choices: [{ message: { content } }] });
}

describe('chatCompletion', () => {
  it('POSTs to the correct URL with auth header and body, and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatResponse('hello there'));
    const messages = [
      { role: 'system' as const, content: 'sys' },
      { role: 'user' as const, content: 'usr' },
    ];

    const result = await chatCompletion(cfg, messages, fetchMock as unknown as typeof fetch);

    expect(result).toBe('hello there');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://x.example/v1/chat/completions');
    expect(url).not.toContain('//chat');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk-test-key');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ model: 'test-model', messages });
  });

  it('throws with the status code on 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('unauthorized: bad key', { status: 401 }));
    await expect(
      chatCompletion(cfg, [], fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/401/);
  });

  it('throws with the status code on 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('internal error', { status: 500 }));
    await expect(
      chatCompletion(cfg, [], fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/500/);
  });

  it('throws on unexpected response shape (empty choices)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [] }));
    await expect(
      chatCompletion(cfg, [], fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/unexpected response shape/);
  });
});

describe('buildFeedbackMessages', () => {
  const questions: readonly InterviewQuestion[] = [
    { key: 'problem', message: 'What problem are you solving?' },
    { key: 'market', message: 'How big is the market?' },
  ];
  const answers: InterviewAnswers = { problem: 'Slow deploys', market: '' };

  it('uses the YC partner persona for product projects', () => {
    const messages = buildFeedbackMessages(productMeta, questions, answers);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Y Combinator');
  });

  it('uses the consultant persona for client projects', () => {
    const messages = buildFeedbackMessages(clientMeta, questions, answers);
    expect(messages[0].content).toContain('consultant');
  });

  it('renders skipped answers as (skipped) and includes every question message', () => {
    const messages = buildFeedbackMessages(productMeta, questions, answers);
    const user = messages[1].content;
    expect(messages[1].role).toBe('user');
    for (const q of questions) {
      expect(user).toContain(q.message);
    }
    expect(user).toContain('Slow deploys');
    expect(user).toContain('### How big is the market?\n(skipped)');
  });
});

describe('buildElaborateMessages', () => {
  it('embeds every doc path and content, and omits empty answers', () => {
    const answers: InterviewAnswers = { problem: 'Slow deploys', market: '' };
    const docs = {
      'docs/prd.md': '# PRD\ncontent A',
      'docs/plan.md': '# Plan\ncontent B',
    };
    const messages = buildElaborateMessages(productMeta, answers, docs);
    const user = messages[1].content;

    expect(user).toContain('FILE: docs/prd.md');
    expect(user).toContain('content A');
    expect(user).toContain('FILE: docs/plan.md');
    expect(user).toContain('content B');
    expect(user).toContain('problem: Slow deploys');
    expect(user).not.toContain('market:');
  });
});

describe('parseElaborateResponse', () => {
  const expected = ['docs/prd.md'];

  it('parses a raw JSON object', () => {
    const raw = JSON.stringify({ files: { 'docs/prd.md': '# PRD\nnew' } });
    expect(parseElaborateResponse(raw, expected)).toEqual({ 'docs/prd.md': '# PRD\nnew' });
  });

  it('parses a ```json fenced block', () => {
    const raw =
      '```json\n' + JSON.stringify({ files: { 'docs/prd.md': '# PRD\nnew' } }) + '\n```';
    expect(parseElaborateResponse(raw, expected)).toEqual({ 'docs/prd.md': '# PRD\nnew' });
  });

  it('throws on garbage input', () => {
    expect(() => parseElaborateResponse('not json at all {', expected)).toThrow();
  });

  it('ignores unknown extra file keys', () => {
    const raw = JSON.stringify({
      files: { 'docs/prd.md': 'ok', 'evil/other.md': 'nope' },
    });
    const result = parseElaborateResponse(raw, expected);
    expect(result).toEqual({ 'docs/prd.md': 'ok' });
    expect(result).not.toHaveProperty('evil/other.md');
  });

  it('throws when zero expected files survive', () => {
    const raw = JSON.stringify({ files: { 'evil/other.md': 'nope' } });
    expect(() => parseElaborateResponse(raw, expected)).toThrow(
      /contained no expected files/
    );
  });
});

describe('runElaborate heading preservation', () => {
  const docs = { 'docs/prd.md': '# A\nintro\n\n## B\ndetails' };
  const answers: InterviewAnswers = { problem: 'Slow deploys' };

  function fetchReturningFiles(files: Record<string, string>): typeof fetch {
    return vi
      .fn()
      .mockResolvedValue(chatResponse(JSON.stringify({ files }))) as unknown as typeof fetch;
  }

  it('drops a file whose new content is missing an original heading', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await runElaborate(
        cfg,
        productMeta,
        answers,
        docs,
        fetchReturningFiles({ 'docs/prd.md': '# A\nexpanded intro only' })
      );
      expect(result).toEqual({});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('docs/prd.md'));
    } finally {
      warn.mockRestore();
    }
  });

  it('returns the file intact when all headings are preserved', async () => {
    const newContent = '# A\nexpanded intro\n\n## B\nexpanded details';
    const result = await runElaborate(
      cfg,
      productMeta,
      answers,
      docs,
      fetchReturningFiles({ 'docs/prd.md': newContent })
    );
    expect(result).toEqual({ 'docs/prd.md': newContent });
  });
});
