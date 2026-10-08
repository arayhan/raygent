import type { LucideIcon } from 'lucide-react';
import type { FeatureId } from '../i18n/types';
import {
  Bot,
  Boxes,
  FileJson,
  FileSearch,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareQuote,
  MessagesSquare,
  Plug,
  ScrollText,
  SlidersHorizontal,
  Stethoscope,
} from 'lucide-react';

export interface Feature {
  id: FeatureId;
  icon: LucideIcon;
  /** Real output, identical in every language. Names and benefits live in i18n. */
  example: { title: string; lines: string[] };
}

// Every example is real: generated files and command output from runs of the
// CLI (project names are the descriptive ones used in Examples), documented
// output blocks from the README, or the exact shape the source writes. Home
// paths are shortened to ~ and the run directory to ./. Lines starting with
// `# ` are our annotations, never presented as output.
export const FEATURES: Feature[] = [
  {
    icon: MessagesSquare,
    id: 'init',
    example: {
      title: 'docs/raygent-init.json, shown for approval',
      lines: [
        '{',
        '  "project": {',
        '    "name": "waitlist-page",',
        '    "brand": "Waitlist Page",',
        '    "type": "product"',
        '  },',
        '  "stack": {',
        '    "platform": "web",',
        '    "kind": "landing",',
        '    "packageManager": "pnpm"',
        '  },',
        '  "agents": ["claude-code"],',
        '  "preferences": { "viewport": "mobile-first" }',
        '}',
      ],
    },
  },
  {
    icon: FileSearch,
    id: 'adopt',
    example: {
      title: '/raygent init in a folder that holds your docs',
      lines: [
        'Adopted 9 of 14 from your docs:',
        '  problem             Brokers quote in spreadsheets…     PRD.md',
        '  roadmap             3 phases                           ROADMAP.md',
        '  riskiestAssumption  Carriers will accept API quotes    DECISIONS.md',
        'Not found: market, businessModel, successMetrics, differentiation, insight',
      ],
    },
  },
  {
    icon: Boxes,
    id: 'scaffolds',
    example: {
      title: 'clinic-followups/',
      lines: [
        'clinic-followups/',
        '├── apps/',
        '│   ├── api/            # Hono',
        '│   └── web/            # Next.js (App Router)',
        '├── packages/',
        '│   ├── config/',
        '│   └── domain/',
        '├── db/',
        '├── docs/',
        '├── .claude/',
        '├── AGENTS.md',
        '├── pnpm-workspace.yaml',
        '└── turbo.json',
      ],
    },
  },
  {
    icon: Layers,
    id: 'addons',
    example: {
      title: 'raygent init --template, the addons block',
      lines: [
        '"addons": {',
        '  // css | tailwind',
        '  "styling": "tailwind",',
        '  // none | react-hook-form | tanstack-form',
        '  "forms": "react-hook-form",',
        '  // none | lucide-react | react-icons | heroicons | ...',
        '  "icons": "lucide-react",',
        '  // TanStack Query (server state)',
        '  "dataFetching": false,',
        '  // Zod (schema validation)',
        '  "validation": false,',
        '  // nuqs (URL state)',
        '  "urlState": false',
        '}',
      ],
    },
  },
  {
    icon: Bot,
    id: 'agents',
    example: {
      title: 'waitlist-page/.claude/',
      lines: [
        '.claude/',
        '├── agents/     code-reviewer  engineering-lead  project-manager',
        '│               software-engineer  ui-designer',
        '├── commands/   start  verify  wrap',
        '├── hooks/      check-agentsmd  inject-gotchas  notify',
        '├── skills/     bootstrap-project  project-gotchas',
        '└── settings.json',
        '',
        'AGENTS.md       # read by Claude Code, opencode and Antigravity',
        'CLAUDE.md       # points Claude Code at AGENTS.md',
      ],
    },
  },
  {
    icon: ScrollText,
    id: 'rules',
    example: {
      title: 'orders-api/docs/rules/ (NestJS, no frontend)',
      lines: [
        'api-conventions.md',
        'code-style.md',
        'git-workflow.md',
        'principles.md',
        'project-preferences.md',
        'security.md',
        'sql-and-data.md',
        'testing.md',
        '',
        '# no accessibility.md or ui-styling.md: nothing here renders UI',
      ],
    },
  },
  {
    icon: SlidersHorizontal,
    id: 'prefs',
    example: {
      title: 'waitlist-page/docs/rules/project-preferences.md',
      lines: [
        '# Project preferences',
        '',
        'Chosen when the project was created. Where another file in',
        'docs/rules/ disagrees, this file wins.',
        '',
        '## Layout priority: mobile-first',
        '',
        '- Base styles target a ~375px phone. Breakpoints only add',
        '  layout upward (`min-width`).',
        '- Check every screen at 375px first, then tablet, then desktop.',
      ],
    },
  },
  {
    icon: ListChecks,
    id: 'phase0',
    example: {
      title: 'clinic-followups/docs/tasks/ (UI-first)',
      lines: [
        '0-step-01-scaffold.md',
        '0-step-02-verify-loop.md',
        '0-step-03-ui-shell.md          # every screen on mock data',
        '0-gate-ui-review.md            # you approve the UI',
        '0-gate-deploy.md               # live on a public URL',
        '1-step-01-data-round-trip.md   # then the real backend',
        'README.md',
      ],
    },
  },
  {
    icon: FileJson,
    id: 'specs',
    example: {
      title: '$ raygent init --from launch.json',
      lines: [
        'launch.json has 3 problems:',
        '  project.name     "Launch Page" cannot be a folder name — use letters,',
        '                   digits, ".", "_", "-" (the brand goes in project.brand)',
        '  stack.framework  "nextjs14" is not valid (nextjs, vite-react,',
        '                   tanstack-start, remix). Did you mean "nextjs"?',
        '  rules[1]         "style" is not valid (...). Did you mean "code-style"?',
        '',
        'Nothing was generated.',
      ],
    },
  },
  {
    icon: Library,
    id: 'skills',
    example: {
      title: '$ raygent skill list',
      lines: [
        'DESIGN (16)',
        '  impeccable        global   Design, redesign, shape, or otherwise improve a',
        '                             frontend interface. Covers websites, landing pages,',
        '                             dashboards, and empty states.',
        '                             tags: ui, ux, critique, frontend',
        '',
        'AGENT (7)',
        '  orchestration     global   Use Orca orchestration for structured multi-agent',
        '                             coordination: threaded messages, blocking ask/reply',
        '                             flows, task dispatch.',
        '                             tags: multi-agent, coordination',
      ],
    },
  },
  {
    icon: Plug,
    id: 'mcp',
    example: {
      title: '.mcp.json',
      lines: [
        '{',
        '  "mcpServers": {',
        '    "context7": {',
        '      "command": "npx",',
        '      "args": [',
        '        "-y",',
        '        "@upstash/context7-mcp"',
        '      ]',
        '    }',
        '  }',
        '}',
      ],
    },
  },
  {
    icon: MessageSquareQuote,
    id: 'ai',
    example: {
      title: '~/.raygent/config.json',
      lines: [
        '{',
        '  "ai": {',
        '    "baseUrl": "https://your-omniroute-host/v1",',
        '    "apiKey": "sk-...",',
        '    "model": "your-model-id"',
        '  }',
        '}',
        '',
        '# without it, no AI prompt appears and init still completes',
      ],
    },
  },
  {
    icon: LayoutDashboard,
    id: 'dashboard',
    example: {
      title: 'after it ships',
      lines: [
        '$ raygent dashboard',
        '  http://localhost:4321',
        '',
        '$ raygent finance add waitlist-page 49 "first sale"',
        '$ raygent finance summary',
        '',
        '# products send events to /api/ingest',
        '# data stays in ~/.raygent/',
      ],
    },
  },
  {
    icon: Stethoscope,
    id: 'doctor',
    example: {
      title: '$ raygent doctor',
      lines: [
        'ok   node             v24.18.0',
        'ok   pnpm             11.17.0',
        'ok   git              git version 2.38.1.windows.1',
        'ok   scaffolder       …/raygent/vendor/scaffolder/bin/create.mjs',
        'ok   personal skills  ~/.raygent/skills',
        'ok   global skills    ~/.agents/skills',
        'ok   ai               not configured (AI steps stay off)',
      ],
    },
  },
];
