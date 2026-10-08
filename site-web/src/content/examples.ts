import type { LucideIcon } from 'lucide-react';
import type { ExampleId } from '../i18n/types';
import { AppWindow, FileJson, LayoutDashboard, LayoutTemplate, Monitor, Server, Smartphone, SquareTerminal } from 'lucide-react';

// Every command below was run against the CLI as an equivalent --from spec,
// and every output line is copied from that run (absolute paths shortened to ./).
export interface Example {
  icon: LucideIcon;
  id: ExampleId;
  dir: string;
  command: string;
  output: string[];
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
    icon: LayoutTemplate,
    id: 'landing',
    dir: '~/ideas',
    command:
      'raygent init waitlist-page --platform web --kind landing --type product --mode quick --viewport mobile-first',
    output: scaffolded(['Landing page (Next.js)'], 'product web/landing', 'waitlist-page'),
  },
  {
    icon: AppWindow,
    id: 'saas',
    dir: '~/ideas',
    command:
      'raygent init clinic-followups --platform web --target fullstack --framework nextjs --backend hono --monorepo --type product --mode guided --build-focus ui-first --viewport web-first',
    output: scaffolded(['Next.js (App Router)', 'Hono'], 'product web/nextjs + hono', 'clinic-followups'),
  },
  {
    icon: LayoutDashboard,
    id: 'dashboard',
    dir: '~/clients',
    command: 'raygent init ops-portal --platform web --target frontend --framework vite-react --type client',
    output: scaffolded(['Vite + React (SPA)'], 'client web/vite-react', 'ops-portal'),
  },
  {
    icon: Server,
    id: 'api',
    dir: '~/ideas',
    command: 'raygent init orders-api --platform web --target backend --backend nestjs --type product --comments minimal',
    output: scaffolded(['NestJS'], 'product web/nestjs', 'orders-api'),
  },
  {
    icon: Smartphone,
    id: 'mobile',
    dir: '~/ideas',
    command: 'raygent init habit-tracker --platform mobile --framework react-native --type product --build-focus ui-first',
    output: scaffolded(['React Native (Expo)'], 'product mobile/react-native', 'habit-tracker'),
  },
  {
    icon: Monitor,
    id: 'desktop',
    dir: '~/ideas',
    command: 'raygent init field-notes --platform desktop --framework electron --type product',
    output: scaffolded(['Electron'], 'product desktop/electron', 'field-notes'),
  },
  {
    icon: SquareTerminal,
    id: 'cli',
    dir: '~/ideas',
    command: 'raygent init release-notes-cli --platform cli --framework node --type product --mode quick',
    output: [
      "Initialized product cli/node project 'release-notes-cli' with docs in ./release-notes-cli/docs",
      'Init spec saved to ./release-notes-cli/docs/raygent-init.json',
    ],
  },
  {
    icon: FileJson,
    id: 'spec',
    dir: '~/ideas',
    command: 'raygent init --from waitlist.json',
    output: scaffolded(['Landing page (Next.js)'], 'product web/landing', 'waitlist-page'),
  },
];
