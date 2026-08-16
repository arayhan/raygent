import fs from 'node:fs/promises';
import path from 'node:path';
import { addSkill } from './skill-lib.js';
import { bundledSkillsDir, globalSkillsDir } from './paths.js';

export const PLATFORMS = ['web', 'mobile', 'cli', 'desktop', 'agent-skills'] as const;
export const PROJECT_TYPES = ['product', 'client'] as const;

export type Platform = (typeof PLATFORMS)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];

// What KIND of web project, asked before anything else on that platform.
// 'landing' used to sit in the framework list, which was wrong: its registry
// entry is identical to nextjs in every framework-defining field, and only the
// template folder differs. It is a purpose, not a framework. Kept separate from
// PROJECT_TYPES on purpose -- a landing page can be built for a client OR for
// your own product, so collapsing the two would lose that distinction.
// Which coding agent(s) the generated project targets. AGENTS.md is written for
// all of them; only Claude Code additionally gets CLAUDE.md and the .claude/
// process layer, because it is the only one whose subagent/skill/hook formats we
// can emit correctly rather than guess at.
export const AGENT_TOOLS = [
  { value: 'claude-code', name: 'Claude Code', description: 'AGENTS.md + CLAUDE.md pointer + .claude/ agents, skills and hooks' },
  { value: 'opencode', name: 'opencode', description: 'Reads AGENTS.md natively; roster described in prose there' },
  { value: 'antigravity', name: 'Antigravity (agy)', description: 'Reads AGENTS.md natively; roster described in prose there' },
] as const;

// The coding-rule documents a generated project ships, under docs/rules/. Mirrors
// RULE_FILES in raygent-scaffolds' registry.mjs -- that table also decides which
// of these apply to a given stack, so a bare API is never offered a rule about
// focus rings. Leaving the selection empty means "every one that applies", which
// is what the scaffolder does with an absent list.
export const RULE_FILE_OPTIONS = [
  { value: 'principles', name: 'principles', description: "YAGNI, duplication thresholds, SRP and DIP in this stack's terms" },
  { value: 'code-style', name: 'code-style', description: 'Module naming, barrels, comment discipline' },
  { value: 'testing', name: 'testing', description: 'What to test, where tests live, what to mock' },
  { value: 'git-workflow', name: 'git-workflow', description: 'Commit conventions, when to commit, no attribution trailers' },
  { value: 'api-conventions', name: 'api-conventions', description: 'Status codes, error envelope, DTO boundary (needs server code)' },
  { value: 'sql-and-data', name: 'sql-and-data', description: 'Migrations, query discipline, transactions (needs server code)' },
  { value: 'ui-styling', name: 'ui-styling', description: 'CSS convention and tokens; points at DESIGN.md (frontend only)' },
  { value: 'security', name: 'security', description: 'Secrets, env prefixes, validation at the boundary' },
  { value: 'accessibility', name: 'accessibility', description: 'Landmarks, focus, contrast, reduced motion (frontend only)' },
] as const;

export const KINDS = ['app', 'landing'] as const;
export type Kind = (typeof KINDS)[number];

export const FRAMEWORKS_BY_PLATFORM: Record<Platform, readonly string[]> = {
  web: ['nextjs', 'vite-react', 'tanstack-start', 'remix'],
  mobile: ['react-native'],
  cli: ['node', 'python', 'rust'],
  desktop: ['electron'],
  'agent-skills': ['claude-code'],
};

// Web-only: what raygent-scaffolds can actually generate a backend for. Not
// platform-keyed like FRAMEWORKS_BY_PLATFORM -- backend choice only exists on
// the 'web' platform (fullstack/backend-only targets).
export const BACKEND_FRAMEWORKS = ['express', 'hono', 'nestjs'] as const;
export const TARGETS = ['frontend', 'backend', 'fullstack'] as const;
export type Target = (typeof TARGETS)[number];

// Frontends whose real-scaffold template has the addon plumbing wired up
// (templates/addons/* merge into these three only, see raygent-scaffolds).
export const STACK_CAPABLE_FRAMEWORKS = ['nextjs', 'vite-react', 'tanstack-start'] as const;
// Storybook's addon is Vite-builder-only -- offering it for nextjs would
// install a broken (Webpack-flavored) Storybook config.
export const STORYBOOK_CAPABLE_FRAMEWORKS = ['vite-react', 'tanstack-start'] as const;
// Backend roots only ever get the framework-agnostic toggles (no React/JSX).
export const BACKEND_STACK_CAPABLE = ['express', 'hono', 'nestjs'] as const;

export const STACK_TOGGLE_OPTIONS: readonly { key: string; label: string }[] = [
  { key: 'stateManagement', label: 'Zustand (state management)' },
  { key: 'httpClient', label: 'Axios (HTTP client)' },
  { key: 'dataFetching', label: 'TanStack Query (server state)' },
  { key: 'dates', label: 'date-fns (dates)' },
  { key: 'validation', label: 'Zod (schema validation)' },
  { key: 'tables', label: 'TanStack Table' },
  { key: 'urlState', label: 'nuqs (URL state)' },
  { key: 'designSystem', label: 'Design tokens (tokens.css)' },
];

// The only two toggles that also apply on a bare backend root (no JSX/DOM).
export const BACKEND_STACK_TOGGLE_OPTIONS: readonly { key: string; label: string }[] = [
  { key: 'validation', label: 'Zod (schema validation)' },
  { key: 'dates', label: 'date-fns (dates)' },
];

// A landing page is one marketing surface: it has styling, icons and a form
// (the email capture), but no client state, no server cache, no data grid and
// no URL state. Offering those would be noise on every landing run.
export const LANDING_STACK_TOGGLE_OPTIONS: readonly { key: string; label: string }[] = [
  { key: 'validation', label: 'Zod (validate the email capture)' },
  { key: 'dates', label: 'date-fns (dates)' },
];

export const STYLING_CHOICES = [
  { value: 'css', name: 'Plain CSS' },
  { value: 'tailwind', name: 'Tailwind CSS' },
] as const;

export const FORM_CHOICES = [
  { value: 'none', name: 'None' },
  { value: 'react-hook-form', name: 'React Hook Form (recommended default)' },
  { value: 'tanstack-form', name: 'TanStack Form' },
] as const;

export const ICON_CHOICES = [
  { value: 'none', name: 'None' },
  { value: 'lucide-react', name: 'lucide-react (recommended default)' },
  { value: 'react-icons', name: 'react-icons' },
  { value: 'heroicons', name: 'Heroicons' },
  { value: 'phosphor-icons', name: 'Phosphor Icons' },
  { value: 'tabler-icons', name: 'Tabler Icons' },
] as const;

export const DOC_SETS: Record<ProjectType, string[]> = {
  product: [
    'STATE.md',
    'PRD.md',
    'VISION.md',
    'ARCHITECTURE.md',
    'DESIGN.md',
    'ANTISLOP.md',
    'DATABASE.md',
    'PROGRESS.md',
    'product-roadmap.md',
    'DESIGN.html',
  ],
  client: [
    'STATE.md',
    'PRD.md',
    'scope.md',
    'handoff.md',
    'DESIGN.md',
    'ANTISLOP.md',
    'ARCHITECTURE.md',
    'DATABASE.md',
    'PROGRESS.md',
  ],
};

export interface InitOptions {
  projectName: string;
  /** Generate into cwd itself instead of a new <projectName> subfolder. */
  here?: boolean;
  platform: string;
  framework: string;
  type: string;
  force?: boolean;
}

export function assertValidProjectName(name: string): void {
  if (
    !/^[A-Za-z0-9._-]+$/.test(name) ||
    name === '.' ||
    name === '..' ||
    name.endsWith('.') ||
    /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(name)
  ) {
    throw new Error(`invalid project name '${name}'`);
  }
}

/**
 * A human brand name to the folder/package name derived from it:
 * "Acme Landing Page" -> "acme-landing-page".
 *
 * Deliberately the same shape as slugify() in raygent-scaffolds' plan.mjs. The
 * two packages share no code, so this is a duplicate on purpose and a test pins
 * them to the same answer -- a drift between them would put a different name in
 * package.json than in the docs that describe it.
 */
export function slugifyProjectName(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The reverse, for when only a folder name was supplied:
 * "acme-landing-page" -> "Acme Landing Page".
 *
 * Without this a preset or a positional-arg run ships a kebab-case string as the
 * project's <h1>, browser tab title and logo text.
 */
export function titleCaseSlug(slug: string): string {
  return slug
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

/** True when `name` passes assertValidProjectName, without throwing. */
export function isValidProjectName(name: string): boolean {
  try {
    assertValidProjectName(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where the project is written. `here` generates into `cwd` itself rather than a
 * new subfolder, for the `mkdir myapp && cd myapp && raygent init --here` flow.
 * Both paths are guarded downstream: the scaffolder refuses a non-empty target,
 * and initProject refuses to overwrite existing docs without --force.
 */
export function resolveTargetDir(projectName: string, cwd: string, here?: boolean): string {
  return here ? cwd : path.join(cwd, projectName);
}

export function docTitle(filename: string): string {
  const base = filename.replace(/\.(md|html)$/, '');
  if (base === 'STATE') return 'State';
  return base
    .split('-')
    .map((segment) => (segment === segment.toUpperCase() ? segment : segment[0].toUpperCase() + segment.slice(1)))
    .join(' ');
}

export function docContent(filename: string): string {
  const title = docTitle(filename);
  if (filename.endsWith('.html')) {
    return `<!DOCTYPE html>\n<html>\n<head>\n<title>${title}</title>\n</head>\n<body>\n<!-- TODO: ${title} -->\n</body>\n</html>\n`;
  }
  return `# ${title}\n\n<!-- TODO: ${title} -->\n`;
}

export async function initProject(
  opts: InitOptions,
  cwd: string = process.cwd()
): Promise<{ targetDir: string; docsDir: string }> {
  assertValidProjectName(opts.projectName);

  if (!PLATFORMS.includes(opts.platform as Platform)) {
    throw new Error(`invalid platform '${opts.platform}' (expected one of: ${PLATFORMS.join(', ')})`);
  }
  const validFrameworks = FRAMEWORKS_BY_PLATFORM[opts.platform as Platform];
  if (!validFrameworks.includes(opts.framework)) {
    throw new Error(
      `invalid framework '${opts.framework}' for platform '${opts.platform}' (expected one of: ${validFrameworks.join(', ')})`
    );
  }
  if (!PROJECT_TYPES.includes(opts.type as ProjectType)) {
    throw new Error(`invalid type '${opts.type}' (expected one of: ${PROJECT_TYPES.join(', ')})`);
  }

  const targetDir = resolveTargetDir(opts.projectName, cwd, opts.here);
  const docsDir = path.join(targetDir, 'docs');
  const files = DOC_SETS[opts.type as ProjectType];

  if (!opts.force) {
    const conflicts: string[] = [];
    for (const filename of files) {
      const filePath = path.join(docsDir, filename);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      if (exists) conflicts.push(filePath);
    }
    if (conflicts.length > 0) {
      throw new Error(`refusing to overwrite existing docs (use --force to overwrite):\n${conflicts.join('\n')}`);
    }
  }

  await fs.mkdir(docsDir, { recursive: true });
  for (const filename of files) {
    // 'wx' backstops the conflict pre-check against files appearing mid-run
    await fs.writeFile(path.join(docsDir, filename), docContent(filename), {
      flag: opts.force ? 'w' : 'wx',
    });
  }

  return { targetDir, docsDir };
}

export interface InstallSelectedSkillsOptions {
  targetDir: string;
  skillsRoot: string;
  agentSkillsDir: string;
  globalAgentSkillsDir: string;
  personalSkillNames: string[];
  builtinSkillNames: string[];
}

export async function installSelectedSkills(opts: InstallSelectedSkillsOptions): Promise<void> {
  const projectSkillsDir = path.join(opts.targetDir, '.claude', 'skills');
  const roots = {
    skillsRoot: opts.skillsRoot,
    projectSkillsDir,
    agentSkillsDir: opts.agentSkillsDir,
    globalAgentSkillsDir: opts.globalAgentSkillsDir,
    // So a generated project can pick up raygent's own skill from the checklist
    // like any other, rather than only via `raygent skills install`.
    bundledSkillsDir: bundledSkillsDir(),
    // Required by the type but unused here: everything installed during init is
    // project-scoped by design. A generated project must not write skills into
    // the user's home directory as a side effect of being created.
    globalSkillsDir: globalSkillsDir(),
  };

  // force: the user just confirmed each skill in the checklist
  for (const name of opts.personalSkillNames) {
    await addSkill(name, roots, { force: true });
  }

  // catalog ("built-in") names: try a real copy first (they often do exist,
  // e.g. under globalAgentSkillsDir) and only fall back to a manifest
  // reminder for names addSkill can't resolve anywhere
  const unresolved: string[] = [];
  for (const name of opts.builtinSkillNames) {
    try {
      await addSkill(name, roots, { force: true });
    } catch {
      unresolved.push(name);
    }
  }

  if (unresolved.length > 0) {
    const claudeDir = path.join(opts.targetDir, '.claude');
    const manifestPath = path.join(claudeDir, 'skills.json');
    await fs.mkdir(claudeDir, { recursive: true });

    let existing: string[] = [];
    try {
      const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed.filter((n): n is string => typeof n === 'string');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    const merged = [...new Set([...existing, ...unresolved])];
    await fs.writeFile(manifestPath, JSON.stringify(merged, null, 2) + '\n');
  }
}
