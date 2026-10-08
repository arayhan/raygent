import { useRef } from 'react';
import { useReveal } from '../motion/useReveal';

// Every row is a capability documented in the README; nothing here is new.
const FEATURES: { name: string; what: string }[] = [
  { name: 'Conversational init', what: 'The /raygent init skill: interview, critique, phase cut, stack with reasons, an approved spec, then generation.' },
  { name: 'Adopt existing docs', what: 'Reads PRD, ROADMAP, SPEC and BRIEF files (.md, .txt, .pdf) and shows what it took from where.' },
  { name: 'Real scaffolds', what: 'Next.js, Vite React, TanStack Start, landing pages, Express, Hono and NestJS backends, fullstack with optional Turborepo, React Native (Expo), Electron.' },
  { name: 'Stack add-ons', what: 'Tailwind, Zustand, TanStack Query, Table and Form, React Hook Form, Zod, nuqs, date-fns, Storybook, icon packs, design tokens.' },
  { name: 'Agent layer', what: 'AGENTS.md for Claude Code, opencode and Antigravity. Claude Code also gets subagents, skills, hooks and settings.' },
  { name: 'Coding rules', what: 'docs/rules/ for principles, code style, testing, git workflow, API, SQL, UI styling, security and accessibility, gated by stack.' },
  { name: 'Project preferences', what: 'Comment density, UI-first with a review gate or end-to-end, and mobile-first or web-first layout.' },
  { name: 'Phase 0 walking skeleton', what: 'Step and gate task files, docs/STATE.md, and /start and /wrap session commands.' },
  { name: 'Init specs and presets', what: 'One JSON file replays a whole setup with zero prompts, validated before any write. Every run records its own.' },
  { name: 'Skill manager', what: 'A categorised skill list, installing to the Claude, agents and Gemini skill directories at once.' },
  { name: 'MCP setup', what: 'A checklist written to .mcp.json. Secrets stay ${VAR} placeholders and are never written.' },
  { name: 'Optional AI review', what: 'YC-partner-style feedback and doc elaboration through any OpenAI-compatible endpoint.' },
  { name: 'Dashboard', what: 'Local events, signups, DAU and revenue for every product you ship, at localhost:4321.' },
  { name: 'doctor', what: 'Checks node, pnpm, git, the scaffolder, skills and the AI endpoint before anything runs.' },
];

export function Features() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref, { start: 'top 85%' });

  return (
    <section id="features" ref={ref} className="page-x section-y" aria-labelledby="features-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label m-0">Features</p>
          <h2 id="features-title" className="display-l">
            Everything between the idea and the first commit
          </h2>
        </div>
        <dl className="plate m-0 overflow-hidden">
          {FEATURES.map((f, i) => (
            <div
              key={f.name}
              data-reveal
              className={`grid gap-1 px-5 py-4 transition-colors duration-(--dur-hover) ease-out hover:bg-cyan-wash md:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] md:gap-8 md:px-8 md:py-5 ${
                i > 0 ? 'border-t border-hairline-soft' : ''
              }`}
            >
              <dt className="title">{f.name}</dt>
              <dd className="m-0 text-signal-dim">{f.what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
