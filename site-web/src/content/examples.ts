// Every command below was run against the CLI as an equivalent --from spec,
// and every output line is copied from that run (absolute paths shortened to ./).
export interface Example {
  id: string;
  tab: string;
  ask: string;
  dir: string;
  command: string;
  output: string[];
  note: string;
}

// The real order of a scaffolded run, from the logs.
function scaffolded(steps: string[], summary: string, name: string): string[] {
  return [
    '◇  Docs and .claude/ config written',
    ...steps.map((s) => `◇  ${s} scaffolded`),
    '◇  package.json written',
    '◇  Dependencies installed',
    '◇  Git repository initialized',
    `Scaffolded ${summary} project '${name}' at ./${name}`,
    `Init spec saved to ./${name}/docs/raygent-init.json`,
  ];
}

export const EXAMPLES: Example[] = [
  {
    id: 'landing',
    tab: 'Landing page',
    ask: 'A waitlist page for an invoicing tool for freelancers.',
    dir: '~/ideas',
    command:
      'raygent init waitlist-page --platform web --kind landing --type product --mode quick --viewport mobile-first',
    output: scaffolded(['Landing page (Next.js)'], 'product web/landing', 'waitlist-page'),
    note: 'Next.js with a marketing starter: hero, features, CTA, email capture and /api/subscribe. No framework question: a landing page has one shape.',
  },
  {
    id: 'saas',
    tab: 'SaaS web app',
    ask: 'A SaaS where small clinics book and track patient follow-ups.',
    dir: '~/ideas',
    command:
      'raygent init clinic-followups --platform web --target fullstack --framework nextjs --backend hono --monorepo --type product --mode guided --build-focus ui-first --viewport web-first',
    output: scaffolded(['Next.js (App Router)', 'Hono'], 'product web/nextjs + hono', 'clinic-followups'),
    note: 'A Turborepo with apps/web, apps/api and packages/domain. UI-first builds every screen on mock data and stops at a review gate before any backend work.',
  },
  {
    id: 'dashboard',
    tab: 'Client dashboard',
    ask: 'An internal ops portal for a logistics client. Their API already exists.',
    dir: '~/clients',
    command: 'raygent init ops-portal --platform web --target frontend --framework vite-react --type client',
    output: scaffolded(['Vite + React (SPA)'], 'client web/vite-react', 'ops-portal'),
    note: 'Client mode swaps the product interview for a brief intake: requirements, scope, deliverables, decision-maker.',
  },
  {
    id: 'api',
    tab: 'API only',
    ask: 'An orders API for an existing storefront.',
    dir: '~/ideas',
    command: 'raygent init orders-api --platform web --target backend --backend nestjs --type product --comments minimal',
    output: scaffolded(['NestJS'], 'product web/nestjs', 'orders-api'),
    note: 'A bare backend gets only the framework-agnostic add-ons and no UI rules such as accessibility.md.',
  },
  {
    id: 'mobile',
    tab: 'Mobile app',
    ask: 'A habit tracker with streaks and reminders.',
    dir: '~/ideas',
    command: 'raygent init habit-tracker --platform mobile --framework react-native --type product --build-focus ui-first',
    output: scaffolded(['React Native (Expo)'], 'product mobile/react-native', 'habit-tracker'),
    note: 'Expo-based React Native with a deletable example feature module that shows the feature-driven layout.',
  },
  {
    id: 'desktop',
    tab: 'Desktop app',
    ask: 'An offline notes app for field researchers.',
    dir: '~/ideas',
    command: 'raygent init field-notes --platform desktop --framework electron --type product',
    output: scaffolded(['Electron'], 'product desktop/electron', 'field-notes'),
    note: 'Electron with main, preload and renderer split, plus the same example feature module as mobile.',
  },
  {
    id: 'cli',
    tab: 'CLI tool',
    ask: 'A CLI that drafts release notes from merged pull requests.',
    dir: '~/ideas',
    command: 'raygent init release-notes-cli --platform cli --framework node --type product --mode quick',
    output: [
      "Initialized product cli/node project 'release-notes-cli' with docs in ./release-notes-cli/docs",
      'Init spec saved to ./release-notes-cli/docs/raygent-init.json',
    ],
    note: 'CLI platforms get raygent\'s own doc set (PRD, architecture, progress) rather than a runnable scaffold.',
  },
  {
    id: 'spec',
    tab: 'Zero prompts',
    ask: 'The fifth landing page this month, from CI.',
    dir: '~/ideas',
    command: 'raygent init --from waitlist.json',
    output: scaffolded(['Landing page (Next.js)'], 'product web/landing', 'waitlist-page'),
    note: 'Asks nothing, and a bad field fails before any write. raygent init --template prints a commented spec to start from.',
  },
];
