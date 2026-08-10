import { describe, it, expect } from 'vitest';
import {
  PRODUCT_QUESTIONS,
  CLIENT_QUESTIONS,
  questionsForType,
  runInterview,
  type InterviewQuestion,
} from '../src/interview.js';

describe('question banks', () => {
  it('has 14 product questions and 12 client questions', () => {
    expect(PRODUCT_QUESTIONS).toHaveLength(14);
    expect(CLIENT_QUESTIONS).toHaveLength(12);
  });

  it('has unique keys within each bank', () => {
    for (const bank of [PRODUCT_QUESTIONS, CLIENT_QUESTIONS]) {
      const keys = bank.map((q) => q.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('has non-empty messages for every question', () => {
    for (const q of [...PRODUCT_QUESTIONS, ...CLIENT_QUESTIONS]) {
      expect(q.message.length).toBeGreaterThan(0);
    }
  });
});

describe('questionsForType', () => {
  it("returns PRODUCT_QUESTIONS for 'product'", () => {
    expect(questionsForType('product')).toBe(PRODUCT_QUESTIONS);
  });

  it("returns CLIENT_QUESTIONS for 'client'", () => {
    expect(questionsForType('client')).toBe(CLIENT_QUESTIONS);
  });

  it('throws for an unknown type', () => {
    expect(() => questionsForType('nonsense')).toThrow(/invalid type/);
  });
});

describe('runInterview', () => {
  it('collects answers keyed by question key, asking in declared order', async () => {
    const scripted: Record<string, string> = {
      clientName: 'Acme Corp',
      projectDescription: 'A widget portal.',
      requirements: 'Fast and reliable.',
      inScope: 'Web app',
      outOfScope: 'Mobile app',
      deliverables: 'Deployed site',
      timeline: 'Q3',
      budget: 'fixed-price',
      decisionMaker: 'Jane',
      integrations: 'Existing CRM',
      successCriteria: 'Launch on time',
      designDirection: 'Clean and minimal',
    };
    const asked: string[] = [];
    const answers = await runInterview(CLIENT_QUESTIONS, async (q: InterviewQuestion) => {
      asked.push(q.key);
      return scripted[q.key] ?? '';
    });

    expect(asked).toEqual(CLIENT_QUESTIONS.map((q) => q.key));
    expect(answers).toEqual(scripted);
  });

  it('trims whitespace and keeps empty answers as empty strings', async () => {
    const questions: readonly InterviewQuestion[] = [
      { key: 'a', message: 'A?' },
      { key: 'b', message: 'B?' },
    ];
    const answers = await runInterview(questions, async (q) =>
      q.key === 'a' ? '  padded  ' : ''
    );
    expect(answers).toEqual({ a: 'padded', b: '' });
  });

  it('propagates a rejection from ask', async () => {
    const err = new Error('cancelled');
    await expect(
      runInterview(PRODUCT_QUESTIONS, async () => {
        throw err;
      })
    ).rejects.toBe(err);
  });
});
