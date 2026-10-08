import {
  PLATFORMS,
  PROJECT_TYPES,
  KINDS,
  TARGETS,
  FRAMEWORKS_BY_PLATFORM,
  BACKEND_FRAMEWORKS,
  AGENT_TOOLS,
  RULE_FILE_OPTIONS,
  STYLING_CHOICES,
  FORM_CHOICES,
  ICON_CHOICES,
  STACK_TOGGLE_OPTIONS,
  type Platform,
} from './init-lib.js';
import { PRODUCT_QUESTIONS, CLIENT_QUESTIONS } from './interview.js';
import { PREFERENCE_VALUES, COMMENT_DENSITIES, BUILD_FOCUSES, VIEWPORTS } from './preferences.js';

/**
 * One fully-specified init run, as JSON. Fill this in once and
 * `raygent init --from spec.json` asks nothing — stack, identity, coding agents,
 * rules, the guided interview, and the skill and MCP checklists all come from
 * the file.
 *
 * Deliberately a superset of Preset: a preset is "my usual stack" and is reused
 * across projects, while a spec describes ONE project completely. A spec may
 * name a preset to inherit the stack half rather than repeating it.
 */
export interface InitSpec {
  version?: number;
  preset?: string;
  project?: {
    name?: string;
    brand?: string;
    type?: string;
    here?: boolean;
    mode?: string;
  };
  stack?: {
    platform?: string;
    kind?: string;
    framework?: string;
    target?: string;
    backend?: string | null;
    monorepo?: boolean;
    packageManager?: string;
    addons?: Record<string, unknown>;
  };
  agents?: string[];
  rules?: string[];
  skills?: string[];
  mcp?: string[];
  preferences?: {
    comments?: string;
    buildFocus?: string;
    viewport?: string;
  };
  interview?: Record<string, string>;
}

export interface SpecProblem {
  /** Dotted path into the spec, e.g. "stack.framework" or "rules[2]". */
  path: string;
  message: string;
}

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'bun'] as const;

/**
 * Strip `//` and block comments, but only outside string literals.
 *
 * The naive version — a regex over the whole text — eats the rest of any line
 * containing a URL, and interview answers routinely contain URLs. It would
 * silently truncate an answer rather than fail, which is the worst kind of bug:
 * the project generates fine and the doc is quietly wrong.
 */
export function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i++;
      } else if (ch === '\n') {
        // Keep newlines so JSON.parse error line numbers still point at the
        // line the user is looking at in their editor.
        out += ch;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === '\\') {
        // Copy the escaped character verbatim; a \" must not end the string.
        out += next ?? '';
        i++;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '/' && next === '/') {
      inLine = true;
      i++;
    } else if (ch === '/' && next === '*') {
      inBlock = true;
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Parse a JSONC init spec. Throws with the parser's message on malformed JSON. */
export function parseInitSpec(text: string): InitSpec {
  const stripped = stripJsonComments(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new Error(`spec is not valid JSON: ${(err as Error).message}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('spec must be a JSON object');
  }
  return parsed as InitSpec;
}

/** Levenshtein distance, only used to suggest a near-miss on an invalid value. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[rows - 1][cols - 1];
}

/** The closest valid value, when it is close enough to be worth suggesting. */
function nearest(value: string, valid: readonly string[]): string | null {
  const needle = value.toLowerCase();

  // Containment first. "style" is 5 edits from "code-style" -- too far for any
  // sane distance threshold -- but it is obviously the intended value, and
  // writing the short half of a hyphenated name is the common typo here.
  const contained = valid
    .filter((c) => c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase()))
    .sort((a, b) => a.length - b.length)[0];
  if (contained !== undefined && needle.length >= 3) return contained;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of valid) {
    const distance = editDistance(needle, candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  // A third of the length, so "nextjs14" suggests "nextjs" but "banana" does not.
  return best !== null && bestDistance <= Math.max(2, Math.ceil(best.length / 3)) ? best : null;
}

function enumProblem(path: string, value: string, valid: readonly string[]): SpecProblem {
  const suggestion = nearest(value, valid);
  return {
    path,
    message:
      `"${value}" is not valid (${valid.join(', ')})` + (suggestion ? `. Did you mean "${suggestion}"?` : ''),
  };
}

/**
 * Every problem with a spec, not the first.
 *
 * Reporting one at a time turns a five-field typo into five round trips, each
 * ending in a failed run. Valid values come from init-lib's tables rather than
 * a second copy, so adding a framework there cannot leave this stale.
 */
export function validateInitSpec(spec: InitSpec, opts: { requireComplete?: boolean } = {}): SpecProblem[] {
  const problems: SpecProblem[] = [];
  const required = opts.requireComplete !== false;

  const project = spec.project ?? {};
  const stack = spec.stack ?? {};

  const check = (path: string, value: unknown, valid: readonly string[]) => {
    if (value === undefined || value === null) return;
    if (typeof value !== 'string') {
      problems.push({ path, message: `must be a string` });
      return;
    }
    if (!valid.includes(value)) problems.push(enumProblem(path, value, valid));
  };

  // Identity. A spec with no name is only usable with --fill-gaps.
  if (required && !project.name) {
    problems.push({ path: 'project.name', message: 'missing (the folder and package name)' });
  }
  // Only complain about the SHAPE of a name that was actually supplied -- an
  // empty string is already reported as missing, and saying both is noise.
  if (project.name !== undefined && project.name !== '' && !/^[A-Za-z0-9._-]+$/.test(String(project.name))) {
    problems.push({
      path: 'project.name',
      message: `"${project.name}" cannot be a folder name — use letters, digits, ".", "_", "-" (the brand goes in project.brand)`,
    });
  }
  if (required && !project.type) {
    problems.push({ path: 'project.type', message: `missing (${PROJECT_TYPES.join(' | ')})` });
  }
  check('project.type', project.type, PROJECT_TYPES);
  check('project.mode', project.mode, ['guided', 'quick']);

  // Stack.
  if (required && !stack.platform) {
    problems.push({ path: 'stack.platform', message: `missing (${PLATFORMS.join(' | ')})` });
  }
  check('stack.platform', stack.platform, PLATFORMS);
  check('stack.kind', stack.kind, KINDS);
  check('stack.target', stack.target, TARGETS);
  check('stack.packageManager', stack.packageManager, PACKAGE_MANAGERS);
  if (stack.backend !== undefined && stack.backend !== null) {
    check('stack.backend', stack.backend, BACKEND_FRAMEWORKS);
  }

  // Framework is only checkable once the platform is known and valid.
  if (stack.framework !== undefined) {
    const platform = stack.platform;
    if (typeof platform === 'string' && (PLATFORMS as readonly string[]).includes(platform)) {
      const valid = FRAMEWORKS_BY_PLATFORM[platform as Platform];
      check('stack.framework', stack.framework, valid);
    }
  } else if (required && stack.kind !== 'landing' && stack.target !== 'backend' && stack.platform !== undefined) {
    // A landing page and a backend-only web project have no frontend framework
    // question; everything else does.
    problems.push({ path: 'stack.framework', message: 'missing' });
  }

  if (stack.addons !== undefined) {
    if (typeof stack.addons !== 'object' || stack.addons === null || Array.isArray(stack.addons)) {
      problems.push({ path: 'stack.addons', message: 'must be an object' });
    } else {
      const toggleKeys = STACK_TOGGLE_OPTIONS.map((o) => o.key);
      const known = [...toggleKeys, 'styling', 'forms', 'icons', 'storybook'];
      for (const [key, value] of Object.entries(stack.addons)) {
        if (!known.includes(key)) {
          const suggestion = nearest(key, known);
          problems.push({
            path: `stack.addons.${key}`,
            message: `unknown add-on` + (suggestion ? `. Did you mean "${suggestion}"?` : ''),
          });
          continue;
        }
        if (key === 'styling') check('stack.addons.styling', value, STYLING_CHOICES.map((c) => c.value));
        else if (key === 'forms') check('stack.addons.forms', value, FORM_CHOICES.map((c) => c.value));
        else if (key === 'icons') check('stack.addons.icons', value, ICON_CHOICES.map((c) => c.value));
        else if (typeof value !== 'boolean') {
          problems.push({ path: `stack.addons.${key}`, message: 'must be true or false' });
        }
      }
    }
  }

  // List fields.
  const checkList = (path: string, list: unknown, valid: readonly string[]) => {
    if (list === undefined) return;
    if (!Array.isArray(list)) {
      problems.push({ path, message: 'must be an array' });
      return;
    }
    list.forEach((entry, i) => {
      if (typeof entry !== 'string') {
        problems.push({ path: `${path}[${i}]`, message: 'must be a string' });
        return;
      }
      if (!valid.includes(entry)) problems.push(enumProblem(`${path}[${i}]`, entry, valid));
    });
  };
  checkList('agents', spec.agents, AGENT_TOOLS.map((a) => a.value));
  checkList('rules', spec.rules, RULE_FILE_OPTIONS.map((r) => r.value));
  // skills and mcp are open sets — a personal skill name is not in any registry
  // here — so they are only shape-checked.
  for (const path of ['skills', 'mcp'] as const) {
    const list = spec[path];
    if (list !== undefined && !Array.isArray(list)) problems.push({ path, message: 'must be an array' });
  }

  // Preferences. Same reasoning as interview keys below: a mistyped key would
  // be a choice the user made that never reaches docs/rules/.
  if (spec.preferences !== undefined) {
    if (typeof spec.preferences !== 'object' || spec.preferences === null || Array.isArray(spec.preferences)) {
      problems.push({ path: 'preferences', message: 'must be an object' });
    } else {
      const validKeys = Object.keys(PREFERENCE_VALUES);
      for (const [key, value] of Object.entries(spec.preferences)) {
        if (!validKeys.includes(key)) {
          const suggestion = nearest(key, validKeys);
          problems.push({
            path: `preferences.${key}`,
            message: `unknown preference` + (suggestion ? `. Did you mean "${suggestion}"?` : ''),
          });
          continue;
        }
        check(`preferences.${key}`, value, PREFERENCE_VALUES[key as keyof typeof PREFERENCE_VALUES]);
      }
    }
  }

  // Interview answers. An unknown key is a problem rather than a silent drop:
  // a mistyped key means an answer the user wrote never reaches the docs.
  if (spec.interview !== undefined) {
    if (typeof spec.interview !== 'object' || spec.interview === null || Array.isArray(spec.interview)) {
      problems.push({ path: 'interview', message: 'must be an object' });
    } else {
      const validKeys = [...PRODUCT_QUESTIONS, ...CLIENT_QUESTIONS].map((q) => q.key);
      for (const key of Object.keys(spec.interview)) {
        if (!validKeys.includes(key)) {
          const suggestion = nearest(key, validKeys);
          problems.push({
            path: `interview.${key}`,
            message: `no question has this key` + (suggestion ? `. Did you mean "${suggestion}"?` : ''),
          });
        }
      }
    }
  }

  return problems;
}

/**
 * A commented, fillable spec. JSON cannot document itself and this file has
 * enough fields that a blank one is not fillable, so the template carries the
 * valid values inline next to each key. parseInitSpec strips the comments back
 * out, so the filled file stays loadable as-is.
 *
 * `filled` renders the spec an init actually used, which is what makes the
 * format discoverable: run init once by hand, then copy the file it wrote.
 */
export function initSpecTemplate(filled?: InitSpec): string {
  const s = filled;
  const q = (v: unknown, fallback: string) =>
    v === undefined || v === null ? fallback : JSON.stringify(v);
  const list = (v: string[] | undefined, fallback: string) =>
    v === undefined ? fallback : JSON.stringify(v);

  const interviewBlock =
    s?.interview && Object.keys(s.interview).length > 0
      ? Object.entries(s.interview)
          .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
          .join(',\n')
      : [
          '    // Keys come from src/interview.ts: product and client have different sets.',
          '    // Whatever you leave out stays a TODO in the generated docs -- it is NOT',
          '    // asked, because --from means no prompts. Pass --fill-gaps to be asked',
          '    // for the missing ones instead.',
          '    // "problem": "",',
          '    // "solution": ""',
        ].join('\n');

  // Unset keys render as comments, so the valid values stay discoverable
  // without the template inventing a preference nobody chose. Commas go only
  // between real entries: JSON rejects one before a closing brace.
  const prefRows = [
    { key: 'comments', hint: COMMENT_DENSITIES.map((c) => c.value).join(' | '), example: 'minimal' },
    { key: 'buildFocus', hint: `UI projects with data only: ${BUILD_FOCUSES.map((b) => b.value).join(' | ')}`, example: 'end-to-end' },
    { key: 'viewport', hint: `web frontends only: ${VIEWPORTS.map((v) => v.value).join(' | ')}`, example: 'mobile-first' },
  ] as const;
  const setKeys = prefRows.filter((r) => s?.preferences?.[r.key] !== undefined).map((r) => r.key);
  const preferencesBlock = prefRows
    .map((r) => {
      const value = s?.preferences?.[r.key];
      if (value === undefined) return `    // ${r.hint}\n    // ${JSON.stringify(r.key)}: ${JSON.stringify(r.example)}`;
      const comma = r.key === setKeys[setKeys.length - 1] ? '' : ',';
      return `    // ${r.hint}\n    ${JSON.stringify(r.key)}: ${JSON.stringify(value)}${comma}`;
    })
    .join('\n');

  return `{
  // raygent init spec. Fill this in, then:  raygent init --from this-file.json
  // Comments are stripped on read, so you can keep them.
  "version": 1,

  // Optional: inherit the stack half from a preset in ~/.raygent/config.json.
  // Anything set below wins over the preset.
  ${s?.preset ? `"preset": ${JSON.stringify(s.preset)},` : '// "preset": "saas",'}

  "project": {
    // Folder and package name. Letters, digits, ".", "_", "-" only.
    "name": ${q(s?.project?.name, '""')},
    // Display name — headings, browser tab, logo. Defaults to name, title-cased.
    "brand": ${q(s?.project?.brand, '""')},
    // ${PROJECT_TYPES.join(' | ')}
    "type": ${q(s?.project?.type, '"product"')},
    // true generates into the current directory instead of a new ./<name>/
    "here": ${q(s?.project?.here, 'false')},
    // guided runs the interview (answers below pre-fill it) | quick writes stub docs
    "mode": ${q(s?.project?.mode, '"guided"')}
  },

  "stack": {
    // ${PLATFORMS.join(' | ')}
    "platform": ${q(s?.stack?.platform, '"web"')},
    // web only: ${KINDS.join(' | ')}
    "kind": ${q(s?.stack?.kind, '"app"')},
    // valid values depend on platform — web: ${FRAMEWORKS_BY_PLATFORM.web.join(', ')}
    "framework": ${q(s?.stack?.framework, '"nextjs"')},
    // web only: ${TARGETS.join(' | ')}
    "target": ${q(s?.stack?.target, '"frontend"')},
    // ${BACKEND_FRAMEWORKS.join(' | ')} — null for frontend-only
    "backend": ${q(s?.stack?.backend, 'null')},
    // web fullstack only: Turborepo monorepo instead of sibling folders
    "monorepo": ${q(s?.stack?.monorepo, 'false')},
    // ${PACKAGE_MANAGERS.join(' | ')}
    "packageManager": ${q(s?.stack?.packageManager, '"pnpm"')},
    "addons": {
      // ${STYLING_CHOICES.map((c) => c.value).join(' | ')}
      "styling": ${q(s?.stack?.addons?.styling, '"tailwind"')},
      // ${FORM_CHOICES.map((c) => c.value).join(' | ')}
      "forms": ${q(s?.stack?.addons?.forms, '"react-hook-form"')},
      // ${ICON_CHOICES.map((c) => c.value).join(' | ')}
      "icons": ${q(s?.stack?.addons?.icons, '"lucide-react"')},
${STACK_TOGGLE_OPTIONS.map(
  (o) => `      // ${o.label}\n      ${JSON.stringify(o.key)}: ${q(s?.stack?.addons?.[o.key], 'false')}`
).join(',\n')}
    }
  },

  // ${AGENT_TOOLS.map((a) => a.value).join(' | ')}
  "agents": ${list(s?.agents, '["claude-code"]')},

  // docs/rules files. Omit the key for "every one that applies to the stack".
  // ${RULE_FILE_OPTIONS.map((r) => r.value).join(' | ')}
  "rules": ${list(s?.rules, '[]')},

  // Claude Code skills installed into the new project.
  "skills": ${list(s?.skills, '[]')},

  // MCP servers written into .mcp.json. Secrets stay as \${VAR} placeholders.
  "mcp": ${list(s?.mcp, '[]')},

  // How the coding agent works; written to docs/rules/project-preferences.md.
  // Omit a key to leave it to the scaffolded rules (nothing is written for it).
  "preferences": {
${preferencesBlock}
  },

  "interview": {
${interviewBlock}
  }
}
`;
}

/** Render problems as the block printed before exiting non-zero. */
export function formatSpecProblems(file: string, problems: SpecProblem[]): string {
  const width = Math.max(...problems.map((p) => p.path.length));
  const lines = problems.map((p) => `  ${p.path.padEnd(width)}  ${p.message}`);
  return [
    `${file} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:`,
    ...lines,
    '',
    'Nothing was generated.',
  ].join('\n');
}
