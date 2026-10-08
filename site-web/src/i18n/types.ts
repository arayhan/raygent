import type { ReactNode } from 'react';

export type Lang = 'en' | 'id';

export type FeatureId =
  | 'init'
  | 'adopt'
  | 'scaffolds'
  | 'addons'
  | 'agents'
  | 'rules'
  | 'prefs'
  | 'phase0'
  | 'specs'
  | 'skills'
  | 'mcp'
  | 'ai'
  | 'dashboard'
  | 'doctor';

export type ExampleId = 'landing' | 'saas' | 'dashboard' | 'api' | 'mobile' | 'desktop' | 'cli' | 'spec';

export type StageId = 'idea' | 'interview' | 'cut' | 'spec' | 'repo' | 'gaps' | 'verify';

/**
 * Every user-facing string on the page. `id.tsx` is typed against this, so a
 * missing translation fails the typecheck. Commands, terminal output and real
 * file contents are not here: they stay verbatim in every language.
 */
export interface Dict {
  meta: { title: string; description: string };
  ui: {
    skip: string;
    copy: string;
    copied: string;
    copyLabel: (command: string) => string;
    copyFallback: string;
    pauseRings: string;
    playRings: string;
    language: string;
    backToTop: string;
    navLabel: string;
    footerLabel: string;
    marks: { yes: string; partly: string; no: string };
  };
  nav: { flagship: string; features: string; compare: string; docs: string; examples: string };
  hero: { eyebrow: string; line1: string; line2: string; body: string; cta: string; worksWith: string };
  why: {
    eyebrow: string;
    title: string;
    items: { title: string; body: ReactNode }[];
  };
  flagship: {
    eyebrow: string;
    intro: string;
    note: ReactNode;
    stages: Record<StageId, { title: string; body: string }>;
  };
  features: {
    eyebrow: string;
    title: string;
    intro: string;
    items: Record<FeatureId, { name: string; benefit: string }>;
  };
  compare: {
    eyebrow: string;
    title: string;
    caption: string;
    toolHeader: string;
    columns: string[];
    rowNames: Record<string, string>;
    fitTitle: string;
    fitBody: [string, string];
    notTitle: string;
    notBody: string;
    footnote: string;
  };
  docs: {
    eyebrow: string;
    title: string;
    steps: { title: string; note: ReactNode }[];
    skip: ReactNode;
    navLabel: string;
    tutorial: string;
    reference: string;
  };
  examples: {
    eyebrow: string;
    title: string;
    intro: ReactNode;
    tabsLabel: string;
    sayIt: string;
    footer: ReactNode;
    readmeLink: string;
    items: Record<ExampleId, { tab: string; ask: string; note: string }>;
  };
  creator: { eyebrow: string; alt: string; bio: string; mark: string };
  cta: { title: string; supportTitle: string; supportBody: string; supportCta: string };
  footer: { docs: string; license: string; released: string };
  /** `# note` lines inside example panels, keyed by the English text. */
  annotations: Record<string, string>;
}
