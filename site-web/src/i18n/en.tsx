import type { ReactNode } from 'react';
import type { Dict } from './types';

const C = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-mono text-signal-white">{children}</code>
);

export const en: Dict = {
  meta: {
    title: 'raygent: idea to runnable repo',
    description:
      'raygent interviews you, pushes back on your plan, cuts phase 1, picks a stack and generates a runnable repo your coding agents already know how to work in.',
  },
  ui: {
    skip: 'Skip to content',
    copy: 'Copy',
    copied: 'Copied',
    copyLabel: (command) => `Copy command: ${command}`,
    copyFallback: 'Copy unavailable. The command is selected.',
    pauseRings: 'Pause rings',
    playRings: 'Play rings',
    language: 'Language',
    backToTop: 'raygent, back to top',
    navLabel: 'Sections',
    footerLabel: 'Footer',
    marks: { yes: 'yes', partly: 'partly', no: 'no' },
  },
  nav: { flagship: 'Flagship', features: 'Features', compare: 'Compare', docs: 'Docs', examples: 'Examples' },
  hero: {
    eyebrow: 'Open-source CLI and agent skill',
    line1: 'From raw idea',
    line2: 'to runnable repo',
    body: 'raygent interviews you, argues with the weak parts of your plan, cuts phase 1, picks a stack and says why. Then it generates a real project with the docs, rules and task plan your coding agent picks up on its first session.',
    cta: 'Get started',
    worksWith: 'Works with Claude Code, opencode and Antigravity. Node.js 20 or newer.',
  },
  why: {
    eyebrow: 'Why raygent',
    title: 'The first session should start working, not guessing',
    items: [
      {
        title: 'Agents start every repo cold',
        body: (
          <>
            A fresh scaffold tells Claude Code, opencode or Antigravity nothing about the product, the boundaries or what
            to build first. raygent ships <C>AGENTS.md</C>, <C>docs/rules/</C> and a Phase 0 task plan with every
            project.
          </>
        ),
      },
      {
        title: 'Code without a plan, or a plan without code',
        body: 'Scaffolders hand you a codebase with no product context. Spec tools hand you a plan and leave you to bring the code. raygent produces both from one conversation, and writes the plan into the repo the code lives in.',
      },
      {
        title: 'A form accepts every answer',
        body: (
          <>
            The <C>/raygent init</C> skill does not. It names the riskiest assumption, refuses "everyone" as a target
            user, and says so when the idea is a feature inside somebody else's product. Once, clearly, and then it
            builds what you asked for.
          </>
        ),
      },
      {
        title: 'Rules that fail the build',
        body: (
          <>
            ESLint <C>no-restricted-imports</C> zones fail the build on a crossed module boundary. <C>/verify</C> quotes
            lint, test and build output, and the code reviewer is read-only so it keeps reporting.
          </>
        ),
      },
    ],
  },
  flagship: {
    eyebrow: 'Flagship',
    intro:
      'One conversation in your coding agent, from idea to a verified phase 1. raygent argues once, clearly, and then builds what you asked for.',
    note: (
      <>
        An unanswered question stays a visible <code className="font-mono text-mono-s">TODO(content)</code> instead of a
        plausible guess nobody will question later.
      </>
    ),
    stages: {
      idea: {
        title: 'Your idea, or the docs you already have',
        body: 'A sentence, a written brief, or existing PRD, ROADMAP and PDF files. Each adopted answer shows the file it came from.',
      },
      interview: {
        title: 'An interview that pushes back',
        body: "It asks what it does not know yet, then names the riskiest assumption, the first real user, and whether this is a feature inside somebody else's product.",
      },
      cut: {
        title: 'Phase 1, cut',
        body: 'The non-goals get said out loud. The stack is picked with one reason per choice, so you can argue with it.',
      },
      spec: {
        title: 'The spec, approved',
        body: 'Shown to you before anything exists. This is the last cheap moment to change your mind.',
      },
      repo: {
        title: 'The repo, generated',
        body: 'Runnable code, AGENTS.md, product docs, docs/rules/ and the .claude/ layer, with zero prompts.',
      },
      gaps: {
        title: 'The gaps, filled',
        body: 'Interviews you for exactly the TODO(content) markers the conversation left. Nothing is invented to fill them.',
      },
      verify: {
        title: 'Built, verified, reviewed',
        body: 'Step and gate tasks drive the build. /verify quotes lint, test and build output, and the reviewer answers APPROVE or FIX-FIRST.',
      },
    },
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything between the idea and the first commit',
    intro: 'Each one with what it actually produces: real files and real command output from runs of the CLI.',
    items: {
      init: { name: 'Conversational init', benefit: 'You approve a plan you argued for before a single file exists.' },
      adopt: { name: 'Adopt existing docs', benefit: 'The PRD you already wrote becomes interview answers, each with its source.' },
      scaffolds: { name: 'Real scaffolds', benefit: 'Dependencies installed and git initialised: runnable on the first pnpm dev.' },
      addons: { name: 'Stack add-ons', benefit: 'The libraries you always add arrive configured, not as a todo list.' },
      agents: { name: 'Agent layer', benefit: 'Your coding agent knows the roles, the rules and the next task on its first session.' },
      rules: { name: 'Coding rules', benefit: 'One rule file per concern, and only the ones your stack can break.' },
      prefs: { name: 'Project preferences', benefit: 'Agents comment, build and lay out the way you chose, not the way they default.' },
      phase0: { name: 'Phase 0 walking skeleton', benefit: 'Day one has an ordered plan, and the gates are decisions you sign.' },
      specs: { name: 'Init specs and presets', benefit: 'Replay a whole setup with zero prompts, and a typo fails before anything is written.' },
      skills: { name: 'Skill manager', benefit: 'Find a skill by what it is for, and install it for Claude, agents and Gemini at once.' },
      mcp: { name: 'MCP setup', benefit: 'Tools are connected in .mcp.json and secrets stay in your shell, never in a file.' },
      ai: { name: 'Optional AI review', benefit: 'A second opinion on the plan from any OpenAI-compatible model, only if you configure one.' },
      dashboard: { name: 'Dashboard', benefit: 'Events, signups, DAU and revenue for every product you ship, on your own machine.' },
      doctor: { name: 'doctor', benefit: 'A missing tool shows up before init, not halfway through it.' },
    },
  },
  compare: {
    eyebrow: 'How it compares',
    title: 'Built for the moment before the repo exists',
    caption: 'Capabilities of raygent and similar tools: yes, partly or no for each column.',
    toolHeader: 'Tool',
    columns: [
      'Interview that pushes back',
      'Product docs (PRD, roadmap)',
      'Runnable stack scaffold',
      'Agent rules in the repo',
      'Phase and gate task plan',
      'Replayable setup spec',
    ],
    rowNames: {},
    fitTitle: 'Where raygent fits',
    fitBody: [
      "Spec frameworks such as Spec Kit, BMAD and Agent OS give you planning discipline and leave you to bring the codebase. Scaffolders give you the codebase with no product context. Claude Code's /init documents a repo that already exists. raygent starts before the repo exists and hands you both halves at once.",
      "Process skills such as superpowers and gstack work alongside it: they shape how work happens inside the repo, and raygent's init offers a skill checklist to install exactly those.",
    ],
    notTitle: 'What raygent does not do',
    notBody:
      'It does not deploy. It stops at a built, verified phase 1, and shipping is yours. For a throwaway prototype you want to click today, a hosted builder is faster.',
    footnote:
      "Compared against each project's public documentation as of October 2026. Corrections are welcome as GitHub issues.",
  },
  docs: {
    eyebrow: 'How to use it',
    title: 'Three commands to your first conversation',
    steps: [
      {
        title: 'Install the CLI',
        note: (
          <>
            Then <code className="font-mono text-mono-s text-signal-white">raygent doctor</code> checks node, pnpm, git,
            the scaffolder and skills before anything runs.
          </>
        ),
      },
      {
        title: 'Install the skill, once per machine',
        note: 'Global on purpose: you use it before a project exists, so a project-local copy would be out of reach.',
      },
      {
        title: 'Start in an empty folder',
        note: 'Type it in your coding agent with one sentence about the idea. Already have docs? Run it in the folder that holds them.',
      },
    ],
    skip: (
      <>
        Rather skip the conversation? <C>raygent init --template</C> prints a commented spec, and{' '}
        <C>raygent init --from spec.json</C> generates from it with zero prompts.
      </>
    ),
    navLabel: 'Documentation',
    tutorial: 'Tutorial',
    reference: 'Command reference',
  },
  examples: {
    eyebrow: 'Examples',
    title: 'One sentence to your agent, or one command',
    intro: (
      <>
        Say the idea after <C>/raygent init</C> and it picks the flags for you, or run the line yourself. Every command
        here was run before it was printed.
      </>
    ),
    tabsLabel: 'Project kinds',
    sayIt: 'Say it to your agent',
    footer: (
      <>
        Flags you leave out are asked. Agents, rules, add-ons and the skill and MCP checklists are prompts too, unless a
        preset or a spec answers them. More in the
      </>
    ),
    readmeLink: 'README examples',
    items: {
      landing: {
        tab: 'Landing page',
        ask: 'A waitlist page for an invoicing tool for freelancers.',
        note: 'Next.js with a marketing starter: hero, features, CTA, email capture and /api/subscribe. No framework question: a landing page has one shape.',
      },
      saas: {
        tab: 'SaaS web app',
        ask: 'A SaaS where small clinics book and track patient follow-ups.',
        note: 'A Turborepo with apps/web, apps/api and packages/domain. UI-first builds every screen on mock data and stops at a review gate before any backend work.',
      },
      dashboard: {
        tab: 'Client dashboard',
        ask: 'An internal ops portal for a logistics client. Their API already exists.',
        note: 'Client mode swaps the product interview for a brief intake: requirements, scope, deliverables, decision-maker.',
      },
      api: {
        tab: 'API only',
        ask: 'An orders API for an existing storefront.',
        note: 'A bare backend gets only the framework-agnostic add-ons and no UI rules such as accessibility.md.',
      },
      mobile: {
        tab: 'Mobile app',
        ask: 'A habit tracker with streaks and reminders.',
        note: 'Expo-based React Native with a deletable example feature module that shows the feature-driven layout.',
      },
      desktop: {
        tab: 'Desktop app',
        ask: 'An offline notes app for field researchers.',
        note: 'Electron with main, preload and renderer split, plus the same example feature module as mobile.',
      },
      cli: {
        tab: 'CLI tool',
        ask: 'A CLI that drafts release notes from merged pull requests.',
        note: "CLI platforms get raygent's own doc set (PRD, architecture, progress) rather than a runnable scaffold.",
      },
      spec: {
        tab: 'Zero prompts',
        ask: 'The fifth landing page this month, from CI.',
        note: 'Asks nothing, and a bad field fails before any write. raygent init --template prints a commented spec to start from.',
      },
    },
  },
  creator: {
    eyebrow: 'Creator',
    alt: 'The raygent mark: an armored steel-blue dragon on a plinth inside glowing cyan tech-rings',
    bio: "raygent started as Ahmed's own tool for starting products and client work: one conversation from an idea to a repo the coding agents can work in, then a local dashboard to watch what ships.",
    mark: "The guardian dragon is the project's mark. Its tech-rings are the ones turning in the hero.",
  },
  cta: {
    title: 'Your next idea, argued and built',
    supportTitle: 'Support raygent',
    supportBody:
      'raygent is free and MIT-licensed. If it saves you a week of setup, you can support its development on Saweria.',
    supportCta: 'Support on Saweria',
  },
  footer: { docs: 'Docs', license: 'MIT License', released: 'Released under the MIT License.' },
  annotations: {},
};
