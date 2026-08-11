import fs from 'node:fs/promises';
import path from 'node:path';
import { addSkill } from './skill-lib.js';

export const PLATFORMS = ['web', 'mobile', 'cli', 'desktop', 'agent-skills'] as const;
export const PROJECT_TYPES = ['product', 'client'] as const;

export type Platform = (typeof PLATFORMS)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const FRAMEWORKS_BY_PLATFORM: Record<Platform, readonly string[]> = {
  web: ['nextjs', 'vite-react', 'tanstack-start', 'landing', 'remix'],
  mobile: ['react-native'],
  cli: ['node', 'python', 'rust'],
  desktop: ['electron'],
  'agent-skills': ['claude-code'],
};

export const DOC_SETS: Record<ProjectType, string[]> = {
  product: [
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

export function docTitle(filename: string): string {
  const base = filename.replace(/\.(md|html)$/, '');
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

  const targetDir = path.join(cwd, opts.projectName);
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
