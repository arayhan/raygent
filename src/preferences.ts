// How the coding agent in a generated project should work, as opposed to what
// it builds. raygent-scaffolds drops CCP_ANSWERS keys it does not know, so these
// cannot ride along to the templates: raygent writes them itself, after the
// scaffold, as docs/rules/project-preferences.md.

export const COMMENT_DENSITIES = [
  { value: 'none', name: 'No comments', description: 'Names and types carry the meaning; only tool directives' },
  { value: 'minimal', name: 'Minimal', description: 'Only the non-obvious why: constraints, workarounds, gotchas' },
  { value: 'full', name: 'Full', description: 'Doc comment on every export, plus a comment per non-trivial block' },
] as const;

// 'end-to-end' rather than 'fullstack': TARGETS already uses 'fullstack' for
// what gets scaffolded, and this is about the order work happens in.
export const BUILD_FOCUSES = [
  { value: 'ui-first', name: 'UI first', description: 'Screens on mock data, shown to you for approval before any backend work' },
  { value: 'end-to-end', name: 'End to end', description: 'Each feature built as a full vertical slice: UI, API and data together' },
] as const;

export const VIEWPORTS = [
  { value: 'mobile-first', name: 'Mobile first', description: 'Base styles for ~375px, breakpoints scale up' },
  { value: 'web-first', name: 'Web first', description: 'Base styles for ~1280px desktop, breakpoints scale down' },
] as const;

export type CommentDensity = (typeof COMMENT_DENSITIES)[number]['value'];
export type BuildFocus = (typeof BUILD_FOCUSES)[number]['value'];
export type Viewport = (typeof VIEWPORTS)[number]['value'];

// Every field optional on purpose: an unset field means nobody chose it, and
// the scaffolder's own rules stay the authority instead of an invented default.
export interface ProjectPreferences {
  comments?: CommentDensity;
  buildFocus?: BuildFocus;
  viewport?: Viewport;
}

export const PREFERENCE_VALUES: Record<keyof ProjectPreferences, readonly string[]> = {
  comments: COMMENT_DENSITIES.map((c) => c.value),
  buildFocus: BUILD_FOCUSES.map((b) => b.value),
  viewport: VIEWPORTS.map((v) => v.value),
};

/**
 * Read a preferences object from untyped JSON (a preset). Malformed values are
 * dropped rather than thrown on: a preset is reused across projects, and one
 * stale field should not block every init that names it.
 */
export function parsePreferences(raw: unknown): ProjectPreferences | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const pick = (key: keyof ProjectPreferences) =>
    typeof r[key] === 'string' && PREFERENCE_VALUES[key].includes(r[key] as string) ? r[key] : undefined;
  return {
    comments: pick('comments') as CommentDensity | undefined,
    buildFocus: pick('buildFocus') as BuildFocus | undefined,
    viewport: pick('viewport') as Viewport | undefined,
  };
}

export const PREFERENCES_DOC_PATH = 'docs/rules/project-preferences.md';

interface ProjectShape {
  platform?: string;
  kind?: string;
  target?: string;
}

/**
 * Build order only means something when there is both a UI to show and a data
 * layer to hold back: a landing page is all UI, an API or CLI has no screens.
 */
export function asksBuildFocus(p: ProjectShape): boolean {
  if (p.platform === 'web') return p.kind !== 'landing' && p.target !== 'backend';
  return p.platform === 'mobile' || p.platform === 'desktop';
}

/**
 * Only the web platform has a layout that spans phone to desktop; react-native
 * is phone-shaped and electron is desktop-shaped by construction.
 */
export function asksViewport(p: ProjectShape): boolean {
  return p.platform === 'web' && p.target !== 'backend';
}

const COMMENT_RULES: Record<CommentDensity, string[]> = {
  none: [
    'Write no comments. Names, types and small functions carry the meaning.',
    'The only exception is a tool directive (`eslint-disable-next-line`, `@ts-expect-error`), and it states its reason on the same line.',
    'If code seems to need a comment, rename or extract until it does not.',
  ],
  minimal: [
    'Comment only what the code cannot say: why a constraint exists, why the obvious approach was rejected, what breaks if this is changed.',
    'Never restate what the line below does. If a comment does, delete it.',
  ],
  full: [
    'Every exported function, type, component and constant gets a doc comment: purpose, parameters, return value, thrown errors.',
    'Every non-trivial block (a branch, a loop, a transformation) gets a short comment saying what it does and why.',
    'Comments stay true: change a comment in the same edit as the code it describes.',
  ],
};

const BUILD_RULES: Record<BuildFocus, string[]> = {
  'ui-first': [
    'Build the screens of a feature first, on mock or static data shaped exactly like the API response will be.',
    'Run it and show the user: a dev server URL or screenshots of every screen and state (empty, loading, error, filled).',
    'Stop and wait for explicit approval. Do not start the backend, database or real API wiring for that feature before it.',
    'After approval, replace the mocks with the real data path without changing the approved UI.',
  ],
  'end-to-end': [
    'Build each feature as a vertical slice: UI, API and data together, working end to end before the next feature starts.',
    'Do not build screens on mock data that no slice is about to replace.',
  ],
};

const VIEWPORT_RULES: Record<Viewport, string[]> = {
  'mobile-first': [
    'Base styles target a ~375px phone. Breakpoints only add layout upward (`min-width`).',
    'Check every screen at 375px first, then tablet, then desktop.',
  ],
  'web-first': [
    'Base styles target a ~1280px desktop. Breakpoints adapt downward (`max-width`).',
    'A feature is not done until it has had a pass at 375px: no horizontal scroll, tap targets at least 44px.',
  ],
};

function section(heading: string, choice: string, rules: string[], footer?: string): string {
  const lines = [`## ${heading}: ${choice}`, '', ...rules.map((r) => `- ${r}`)];
  if (footer) lines.push('', footer);
  return lines.join('\n');
}

/** The rules doc for the chosen preferences, or null when none were chosen. */
export function renderPreferencesDoc(prefs: ProjectPreferences): string | null {
  const sections: string[] = [];
  if (prefs.comments) {
    sections.push(
      section(
        'Code comments',
        prefs.comments,
        COMMENT_RULES[prefs.comments],
        'This overrides the comment guidance in docs/rules/code-style.md.',
      ),
    );
  }
  if (prefs.buildFocus) sections.push(section('Build order', prefs.buildFocus, BUILD_RULES[prefs.buildFocus]));
  if (prefs.viewport) sections.push(section('Layout priority', prefs.viewport, VIEWPORT_RULES[prefs.viewport]));
  if (sections.length === 0) return null;

  return [
    '# Project preferences',
    '',
    'Chosen when the project was created. Where another file in docs/rules/ disagrees, this file wins.',
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
}
