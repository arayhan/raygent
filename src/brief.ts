import { PRODUCT_QUESTIONS, CLIENT_QUESTIONS } from './interview.js';

export type BriefType = 'product' | 'client';

export interface BriefSection {
  /** Must match a key in interview.ts — the marker the skill maps by. */
  key: string;
  heading: string;
  guidance: string;
  example: string;
}

/**
 * The fillable brief, one section per interview question.
 *
 * Headings are what a person would write, not the key names: this is a document
 * you could hand to a collaborator, and `## riskiestAssumption` is a form. The
 * key lives in an HTML comment underneath, invisible when rendered, so the skill
 * maps by marker instead of inferring from a heading it has to interpret.
 *
 * Ordered the way an idea is usually explained, which is not the order
 * interview.ts declares them in.
 */
const PRODUCT_SECTIONS: BriefSection[] = [
  {
    key: 'problem',
    heading: 'The problem',
    guidance: 'What is broken today, and for whom. Describe the pain, not your solution to it.',
    example: 'Freight brokers quote lanes in spreadsheets. A quote takes 20 minutes and margin is guessed.',
  },
  {
    key: 'solution',
    heading: 'What it does',
    guidance: 'One or two sentences. If a stranger could not repeat it back, it is not there yet.',
    example: 'A quoting tool that prices a lane in one screen, using the last 90 days of your own rates.',
  },
  {
    key: 'targetUsers',
    heading: 'Who it is for',
    guidance:
      'The *first* user, specific enough to find ten of them this week. "Small businesses" is not an answer.',
    example: 'Two-to-ten person freight brokerages in the US midwest that still quote in spreadsheets.',
  },
  {
    key: 'insight',
    heading: 'Why you, why now',
    guidance: 'The unfair advantage. Effort and enthusiasm are not advantages.',
    example: 'I ran ops at a brokerage for six years and still have the rate data nobody else can get.',
  },
  {
    key: 'competitors',
    heading: 'What people do today instead',
    guidance: 'Name real alternatives, and include the do-nothing option — most products lose to a spreadsheet.',
    example: 'MacroPoint and DAT for rate lookup; realistically, most just keep using Excel.',
  },
  {
    key: 'differentiation',
    heading: 'Why pick this over those',
    guidance: '"Better UX" is not a differentiator — everyone claims it and nobody can see it before committing.',
    example: 'It prices from *your* historical rates, not a market average, so the number is defensible.',
  },
  {
    key: 'businessModel',
    heading: 'How it makes money',
    guidance: 'Who pays, how much, and what has to be true for that to work. Say the number out loud.',
    example: '$99/month per seat. At 3 seats average, 60 customers replaces my salary.',
  },
  {
    key: 'market',
    heading: 'How big it could get',
    guidance: 'Rough reachable users. A guess is fine — say it is a guess. An invented precise number is not.',
    example: 'Roughly 15,000 US brokerages under 10 people. Guess, not researched.',
  },
  {
    key: 'successMetrics',
    heading: 'What success looks like in 6-12 months',
    guidance: 'Numbers you could check later. "Grow the user base" cannot be checked.',
    example: '200 weekly active users, 20 paying, under 5% monthly churn.',
  },
  {
    key: 'riskiestAssumption',
    heading: 'The riskiest assumption',
    guidance:
      'The unproven thing everything rests on, and the cheapest way to find out you are wrong. If nothing sounds risky, keep looking.',
    example: 'That brokers will trust an automated price. Test: quote 20 lanes by hand for 3 brokers first.',
  },
  {
    key: 'roadmap',
    heading: 'What ships first',
    guidance: 'Phase 1 small enough to finish and complete enough to use. Then what waits.',
    example: 'Phase 1: manual rate import + single-lane quote. Phase 2: multi-lane. Phase 3: carrier API.',
  },
  {
    key: 'nonGoals',
    heading: 'What this is deliberately not',
    guidance:
      'The half people skip. Without it phase 1 grows quietly until it never ships, and every addition looked reasonable.',
    example: 'Not a TMS. No load tracking, no invoicing, no carrier onboarding — ever, not just not-yet.',
  },
  {
    key: 'vision',
    heading: 'Where it goes if it works',
    guidance: 'Beyond phase 1. Should not just restate what it does.',
    example: 'The pricing layer every small brokerage runs on, with a shared benchmark nobody else has.',
  },
  {
    key: 'designDirection',
    heading: 'Look and feel',
    guidance: 'Brand adjectives, reference products, anything visual you already know. Skip if there is no UI.',
    example: 'Dense and fast, like Linear. Not friendly, not playful — these people live in spreadsheets.',
  },
];

const CLIENT_SECTIONS: BriefSection[] = [
  {
    key: 'clientName',
    heading: 'Client',
    guidance: 'Company or person the work is for.',
    example: 'Northwind Logistics',
  },
  {
    key: 'projectDescription',
    heading: 'The project',
    guidance: 'One or two sentences on what is being built.',
    example: 'A public marketing site plus a quote-request form feeding their existing CRM.',
  },
  {
    key: 'requirements',
    heading: 'What they actually need',
    guidance: 'Core requirements, in priority order. A flat feature list with no priority is not this.',
    example: 'Must: quote form to CRM, mobile-first. Should: case studies. Could: blog.',
  },
  {
    key: 'inScope',
    heading: 'In scope',
    guidance: 'What is explicitly included.',
    example: 'Five pages, the form, CRM integration, one round of copy revisions.',
  },
  {
    key: 'outOfScope',
    heading: 'Out of scope',
    guidance: 'What is explicitly excluded. This is what protects the engagement — leave it blank at your cost.',
    example: 'No CMS, no multi-language, no hosting migration, no ongoing SEO retainer.',
  },
  {
    key: 'deliverables',
    heading: 'Deliverables',
    guidance: 'Concrete things handed over. Activities are not deliverables.',
    example: 'Deployed site, source repo, a 2-page handover doc, admin credentials.',
  },
  {
    key: 'timeline',
    heading: 'Timeline',
    guidance: 'Milestones, not just a final date. A deadline with nothing before it is a wish.',
    example: 'Design approved wk2, staging wk4, content freeze wk5, live wk6.',
  },
  {
    key: 'budget',
    heading: 'Budget and engagement model',
    guidance: 'Fixed-price or time-and-materials, if known. Fixed-price with vague scope is worth flagging.',
    example: 'Fixed price, £8k, 50% up front.',
  },
  {
    key: 'decisionMaker',
    heading: 'Who signs off',
    guidance: 'A name. "The team" is not a decision-maker.',
    example: 'Sarah Chen, Head of Ops. One reviewer, not a committee.',
  },
  {
    key: 'integrations',
    heading: 'Systems and constraints',
    guidance: 'Existing systems, APIs, hosting, anything you must fit into.',
    example: 'HubSpot CRM, their AWS account, must keep the existing domain and email.',
  },
  {
    key: 'successCriteria',
    heading: 'How they judge it done',
    guidance: 'Acceptance criteria. Undefined acceptance on a fixed-price job is the risk worth naming.',
    example: 'Form submissions land in HubSpot, Lighthouse over 90, signed off by Sarah.',
  },
  {
    key: 'designDirection',
    heading: 'Look and feel',
    guidance: 'Brand guidelines, references, anything visual already decided.',
    example: 'Their 2023 brand deck. Navy and white, conservative — their customers are 55+.',
  },
];

export function briefSections(type: BriefType): BriefSection[] {
  return type === 'client' ? CLIENT_SECTIONS : PRODUCT_SECTIONS;
}

/** Keys the interview actually accepts, for the test that pins these together. */
export function interviewKeysFor(type: BriefType): string[] {
  return (type === 'client' ? CLIENT_QUESTIONS : PRODUCT_QUESTIONS).map((q) => q.key);
}

/**
 * The brief as Markdown.
 *
 * Written to be filled by a person and read by an agent. The `<!-- key -->`
 * markers make adoption exact: `/raygent init` maps by marker rather than
 * inferring from a heading, so a section left blank is unambiguously a gap
 * rather than an answer it has to guess at.
 */
export function renderBrief(type: BriefType = 'product'): string {
  const sections = briefSections(type);
  const label = type === 'client' ? 'client project' : 'product';

  const head = [
    `# <your ${label} name>`,
    '',
    '<!--',
    `  raygent brief — fill this in, then run /raygent init in this folder.`,
    '',
    '  Write in prose. Delete the example under each heading as you replace it.',
    '  Leaving a section blank is fine and often right: an unanswered question',
    '  gets asked, while a made-up answer ends up in your docs unquestioned.',
    '',
    // Must not write a literal comment marker here: HTML comments do not nest,
    // so an inner "-->" would close this block early and leak the rest as
    // visible text on the page.
    '  The hidden comment under each heading is how the skill maps this file.',
    '  Keep them, and keep each one directly under its heading.',
    '-->',
    '',
  ].join('\n');

  const body = sections
    .map((s) =>
      [
        `## ${s.heading}`,
        `<!-- ${s.key} -->`,
        '',
        `_${s.guidance}_`,
        '',
        `> Example: ${s.example}`,
        '',
      ].join('\n')
    )
    .join('\n');

  return `${head}\n${body}`;
}
