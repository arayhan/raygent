import fs from 'node:fs/promises';
import path from 'node:path';

export const FRAMEWORKS = ['next', 'node', 'python'] as const;
export const PROJECT_TYPES = ['product', 'client'] as const;

export type Framework = (typeof FRAMEWORKS)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];

const DOC_SETS: Record<ProjectType, string[]> = {
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
  framework: string;
  type: string;
  force?: boolean;
}

function assertValidProjectName(name: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name === '.' || name === '..') {
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

  if (!FRAMEWORKS.includes(opts.framework as Framework)) {
    throw new Error(`invalid framework '${opts.framework}' (expected one of: ${FRAMEWORKS.join(', ')})`);
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
    await fs.writeFile(path.join(docsDir, filename), docContent(filename));
  }

  return { targetDir, docsDir };
}
