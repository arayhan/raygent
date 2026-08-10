export interface InterviewQuestion {
  key: string;
  message: string;
}

/** Answers keyed by question key. An empty string means the question was skipped. */
export type InterviewAnswers = Record<string, string>;

export const PRODUCT_QUESTIONS: readonly InterviewQuestion[] = [
  { key: 'problem', message: 'What problem are you solving, and for whom?' },
  { key: 'solution', message: 'What does the product do? Describe the solution in a sentence or two.' },
  { key: 'insight', message: 'What is your unique insight or unfair advantage — why you, why now?' },
  { key: 'vision', message: 'If this works, what does it look like in 5 years?' },
  { key: 'targetUsers', message: 'Who exactly is the first user? Describe your initial target segment.' },
  { key: 'market', message: 'How big is the market — rough TAM or reachable users?' },
  { key: 'competitors', message: 'Who are the competitors or alternatives? How do people solve this today?' },
  { key: 'differentiation', message: 'Why will users pick you over those alternatives?' },
  { key: 'businessModel', message: 'How will this make money? Pricing and business model.' },
  { key: 'successMetrics', message: 'What are the goals and success metrics for the first 6-12 months?' },
  { key: 'roadmap', message: 'What are the build phases? What ships in v1, what comes later?' },
  { key: 'riskiestAssumption', message: 'What is the riskiest assumption, and how will you test it first?' },
  { key: 'nonGoals', message: 'What is explicitly out of scope — the non-goals?' },
  { key: 'designDirection', message: 'Design direction — look and feel, brand adjectives, reference products?' },
];

export const CLIENT_QUESTIONS: readonly InterviewQuestion[] = [
  { key: 'clientName', message: 'Client name / company?' },
  { key: 'projectDescription', message: 'Describe the project in one or two sentences.' },
  { key: 'requirements', message: "What are the client's core requirements?" },
  { key: 'inScope', message: 'What is explicitly in scope?' },
  { key: 'outOfScope', message: 'What is explicitly out of scope?' },
  { key: 'deliverables', message: 'What are the concrete deliverables?' },
  { key: 'timeline', message: 'Timeline and key milestones or deadlines?' },
  { key: 'budget', message: 'Budget or engagement model (fixed-price / time-and-materials), if known?' },
  { key: 'decisionMaker', message: 'Who is the decision-maker — who signs off on the work?' },
  { key: 'integrations', message: 'Integration or technical constraints — existing systems, APIs, hosting?' },
  { key: 'successCriteria', message: 'How will the client judge success? Acceptance criteria?' },
  { key: 'designDirection', message: 'Design direction — brand guidelines, references, look and feel?' },
];

export function questionsForType(type: string): readonly InterviewQuestion[] {
  if (type === 'product') return PRODUCT_QUESTIONS;
  if (type === 'client') return CLIENT_QUESTIONS;
  throw new Error(`invalid type '${type}'`);
}

export type AskFn = (q: InterviewQuestion) => Promise<string>;

/**
 * Ask each question in order and collect trimmed answers.
 * A rejecting `ask` propagates to the caller (e.g. Ctrl+C handling).
 */
export async function runInterview(
  questions: readonly InterviewQuestion[],
  ask: AskFn
): Promise<InterviewAnswers> {
  const answers: InterviewAnswers = {};
  for (const q of questions) {
    answers[q.key] = (await ask(q)).trim();
  }
  return answers;
}
