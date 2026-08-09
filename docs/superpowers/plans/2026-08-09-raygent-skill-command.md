# raygent `skill` command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `raygent skill add|list|remove <name>`, a CLI that copies personal Claude Code skills from `~/.raygent/skills/` into a project's `./.claude/skills/`.

**Architecture:** A pure, dependency-injected core library (`src/skill-lib.ts`) does all filesystem work against an explicit `Roots` object (`{ skillsRoot, projectSkillsDir }`), so it's fully unit-testable against temp directories with no real home-directory access. A thin Commander.js CLI layer (`src/cli.ts`) resolves the real `Roots` via `defaultRoots()` and wires it to the three subcommands, translating thrown `Error`s into `console.error` + non-zero exit.

**Tech Stack:** TypeScript (Node18+, ESM/NodeNext), Commander.js for CLI parsing, Vitest for tests, tsx for dev-run, tsc for build. `fs.promises.cp`/`fs.promises.rm` (Node 18 built-ins) for recursive copy/delete — no extra filesystem dependency.

## Global Constraints

- Node.js >= 18 (spec: TypeScript/Node CLI, `fs.promises.cp` requires Node 16.7+; pin floor at 18 for LTS safety).
- Package/bin name: `raygent`, published later as a public, unscoped npm package (spec: name confirmed available).
- Skill source root is fixed at `~/.raygent/skills/`, no config-file override in v1 (spec: non-goal).
- Install target is project-local `./.claude/skills/` only — no `--global` flag in v1 (spec: non-goal).
- `add` copies (never symlinks); overwriting an existing install requires `--force` (spec).
- `remove` only ever touches the project copy, never `~/.raygent/skills/` (spec).
- Command verbs: `add` / `list` / `remove` (spec, confirmed by user).

---

### Task 1: Project scaffolding + `paths` module

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/paths.ts`
- Test: `test/paths.test.ts`

**Interfaces:**
- Produces: `interface Roots { skillsRoot: string; projectSkillsDir: string }`, `function defaultRoots(cwd?: string): Roots`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "raygent",
  "version": "0.1.0",
  "description": "Personal CLI for managing Claude Code agent skills and project scaffolding",
  "type": "module",
  "bin": {
    "raygent": "./dist/cli.js"
  },
  "main": "dist/cli.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "dev": "tsx src/cli.ts"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT",
  "dependencies": {
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5",
    "tsx": "^4.16.2",
    "@types/node": "^22.5.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, `package-lock.json` created, no errors.

- [ ] **Step 5: Write the failing test**

`test/paths.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { defaultRoots } from '../src/paths.js';

describe('defaultRoots', () => {
  it('resolves skillsRoot under the home directory and projectSkillsDir under cwd', () => {
    const roots = defaultRoots('/tmp/some-project');
    expect(roots.skillsRoot).toBe(path.join(os.homedir(), '.raygent', 'skills'));
    expect(roots.projectSkillsDir).toBe(path.join('/tmp/some-project', '.claude', 'skills'));
  });

  it('defaults cwd to process.cwd() when not given', () => {
    const roots = defaultRoots();
    expect(roots.projectSkillsDir).toBe(path.join(process.cwd(), '.claude', 'skills'));
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/paths.test.ts`
Expected: FAIL — cannot find module `../src/paths.js` (file doesn't exist yet).

- [ ] **Step 7: Write minimal implementation**

`src/paths.ts`:

```typescript
import path from 'node:path';
import os from 'node:os';

export interface Roots {
  skillsRoot: string;
  projectSkillsDir: string;
}

export function defaultRoots(cwd: string = process.cwd()): Roots {
  return {
    skillsRoot: path.join(os.homedir(), '.raygent', 'skills'),
    projectSkillsDir: path.join(cwd, '.claude', 'skills'),
  };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/paths.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json src/paths.ts test/paths.test.ts
git commit -m "feat: scaffold raygent CLI project and add paths module"
```

---

### Task 2: `listSkills`

**Files:**
- Create: `src/skill-lib.ts`
- Test: `test/skill-lib.test.ts`

**Interfaces:**
- Consumes: `Roots` from `src/paths.ts` (`{ skillsRoot, projectSkillsDir }`)
- Produces: `interface SkillInfo { name: string; installed: boolean }`, `function listSkills(roots: Roots): Promise<SkillInfo[]>`

- [ ] **Step 1: Write the failing test**

`test/skill-lib.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { listSkills } from '../src/skill-lib.js';
import type { Roots } from '../src/paths.js';

let skillsRoot: string;
let projectSkillsDir: string;
let roots: Roots;

beforeEach(() => {
  skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-skills-'));
  projectSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raygent-project-'));
  roots = { skillsRoot, projectSkillsDir };
});

afterEach(() => {
  fs.rmSync(skillsRoot, { recursive: true, force: true });
  fs.rmSync(projectSkillsDir, { recursive: true, force: true });
});

describe('listSkills', () => {
  it('returns skills found in skillsRoot, marking installed status', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'skill-a'));
    fs.mkdirSync(path.join(skillsRoot, 'skill-b'));
    fs.mkdirSync(path.join(projectSkillsDir, 'skill-a'));

    const result = await listSkills(roots);

    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'skill-a', installed: true },
        { name: 'skill-b', installed: false },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when skillsRoot does not exist', async () => {
    fs.rmSync(skillsRoot, { recursive: true, force: true });
    const result = await listSkills(roots);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/skill-lib.test.ts`
Expected: FAIL — cannot find module `../src/skill-lib.js`.

- [ ] **Step 3: Write minimal implementation**

`src/skill-lib.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Roots } from './paths.js';

export interface SkillInfo {
  name: string;
  installed: boolean;
}

export async function listSkills(roots: Roots): Promise<SkillInfo[]> {
  let entries;
  try {
    entries = await fs.readdir(roots.skillsRoot, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const skills: SkillInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const installed = await fs
      .access(path.join(roots.projectSkillsDir, entry.name))
      .then(() => true)
      .catch(() => false);
    skills.push({ name: entry.name, installed });
  }
  return skills;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/skill-lib.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/skill-lib.ts test/skill-lib.test.ts
git commit -m "feat: add listSkills to skill-lib"
```

---

### Task 3: `addSkill`

**Files:**
- Modify: `src/skill-lib.ts` (add `addSkill`)
- Test: `test/skill-lib.test.ts` (add `describe('addSkill', ...)`)

**Interfaces:**
- Consumes: `Roots` from `src/paths.ts`
- Produces: `function addSkill(name: string, roots: Roots, opts?: { force?: boolean }): Promise<void>` — throws `Error` on missing source or (without `--force`) existing destination.

- [ ] **Step 1: Write the failing tests**

Add to `test/skill-lib.test.ts`:

```typescript
describe('addSkill', () => {
  it('copies a skill from skillsRoot to projectSkillsDir', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.writeFileSync(path.join(skillsRoot, 'my-skill', 'SKILL.md'), '# my-skill');

    await addSkill('my-skill', roots);

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# my-skill');
  });

  it('throws when the source skill does not exist', async () => {
    await expect(addSkill('missing-skill', roots)).rejects.toThrow(
      `skill 'missing-skill' not found in ${skillsRoot}`
    );
  });

  it('throws when destination already exists and force is not set', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.mkdirSync(path.join(projectSkillsDir, 'my-skill'), { recursive: true });

    await expect(addSkill('my-skill', roots)).rejects.toThrow(/already installed/);
  });

  it('overwrites the destination when force is true', async () => {
    fs.mkdirSync(path.join(skillsRoot, 'my-skill'));
    fs.writeFileSync(path.join(skillsRoot, 'my-skill', 'SKILL.md'), '# new content');
    fs.mkdirSync(path.join(projectSkillsDir, 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), '# old content');

    await addSkill('my-skill', roots, { force: true });

    const copied = fs.readFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), 'utf8');
    expect(copied).toBe('# new content');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/skill-lib.test.ts`
Expected: FAIL — `addSkill` is not exported from `../src/skill-lib.js`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/skill-lib.ts`:

```typescript
export async function addSkill(
  name: string,
  roots: Roots,
  opts: { force?: boolean } = {}
): Promise<void> {
  const sourceDir = path.join(roots.skillsRoot, name);
  const destDir = path.join(roots.projectSkillsDir, name);

  const sourceExists = await fs.access(sourceDir).then(() => true).catch(() => false);
  if (!sourceExists) {
    throw new Error(`skill '${name}' not found in ${roots.skillsRoot}`);
  }

  const destExists = await fs.access(destDir).then(() => true).catch(() => false);
  if (destExists && !opts.force) {
    throw new Error(`skill '${name}' is already installed at ${destDir} (use --force to overwrite)`);
  }

  await fs.mkdir(roots.projectSkillsDir, { recursive: true });
  if (destExists) {
    await fs.rm(destDir, { recursive: true, force: true });
  }
  await fs.cp(sourceDir, destDir, { recursive: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/skill-lib.test.ts`
Expected: PASS (6 tests total: 2 `listSkills` + 4 `addSkill`).

- [ ] **Step 5: Commit**

```bash
git add src/skill-lib.ts test/skill-lib.test.ts
git commit -m "feat: add addSkill to skill-lib"
```

---

### Task 4: `removeSkill`

**Files:**
- Modify: `src/skill-lib.ts` (add `removeSkill`)
- Test: `test/skill-lib.test.ts` (add `describe('removeSkill', ...)`)

**Interfaces:**
- Consumes: `Roots` from `src/paths.ts`
- Produces: `function removeSkill(name: string, roots: Roots): Promise<void>` — throws `Error` if not installed.

- [ ] **Step 1: Write the failing tests**

Add to `test/skill-lib.test.ts`:

```typescript
describe('removeSkill', () => {
  it('removes an installed skill from projectSkillsDir', async () => {
    fs.mkdirSync(path.join(projectSkillsDir, 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(projectSkillsDir, 'my-skill', 'SKILL.md'), '# my-skill');

    await removeSkill('my-skill', roots);

    expect(fs.existsSync(path.join(projectSkillsDir, 'my-skill'))).toBe(false);
  });

  it('throws when the skill is not installed', async () => {
    await expect(removeSkill('missing-skill', roots)).rejects.toThrow(
      `skill 'missing-skill' is not installed in ${projectSkillsDir}`
    );
  });
});
```

Update the import line at the top of `test/skill-lib.test.ts` to include `removeSkill`:

```typescript
import { listSkills, addSkill, removeSkill } from '../src/skill-lib.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/skill-lib.test.ts`
Expected: FAIL — `removeSkill` is not exported from `../src/skill-lib.js`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/skill-lib.ts`:

```typescript
export async function removeSkill(name: string, roots: Roots): Promise<void> {
  const destDir = path.join(roots.projectSkillsDir, name);
  const destExists = await fs.access(destDir).then(() => true).catch(() => false);
  if (!destExists) {
    throw new Error(`skill '${name}' is not installed in ${roots.projectSkillsDir}`);
  }
  await fs.rm(destDir, { recursive: true, force: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/skill-lib.test.ts`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/skill-lib.ts test/skill-lib.test.ts
git commit -m "feat: add removeSkill to skill-lib"
```

---

### Task 5: CLI wiring (`raygent skill add|list|remove`)

**Files:**
- Create: `src/cli.ts`

**Interfaces:**
- Consumes: `defaultRoots` from `src/paths.ts`; `listSkills`, `addSkill`, `removeSkill` from `src/skill-lib.ts`.
- Produces: the `raygent` executable (`dist/cli.js`, via `bin` in `package.json` from Task 1).

This task wires already-tested library functions into a CLI; it has no new pure logic to unit test, so the deliverable is verified by build + manual run rather than a Vitest test.

- [ ] **Step 1: Write `src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { defaultRoots } from './paths.js';
import { listSkills, addSkill, removeSkill } from './skill-lib.js';

const program = new Command();
program
  .name('raygent')
  .description('Personal CLI for Claude Code skills and project scaffolding')
  .version('0.1.0');

const skill = program.command('skill').description('Manage Claude Code skills');

skill
  .command('add <name>')
  .description('Install a skill from ~/.raygent/skills into ./.claude/skills')
  .option('-f, --force', 'overwrite if already installed')
  .action(async (name: string, opts: { force?: boolean }) => {
    try {
      const roots = defaultRoots();
      await addSkill(name, roots, { force: opts.force });
      console.log(`Installed skill '${name}' to ${roots.projectSkillsDir}/${name}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

skill
  .command('list')
  .description('List skills available in ~/.raygent/skills and whether installed in this project')
  .action(async () => {
    const roots = defaultRoots();
    const skills = await listSkills(roots);
    if (skills.length === 0) {
      console.log(`No skills found in ${roots.skillsRoot}`);
      return;
    }
    for (const s of skills) {
      console.log(`${s.installed ? '[installed]' : '[available]'} ${s.name}`);
    }
  });

skill
  .command('remove <name>')
  .description('Remove a skill from ./.claude/skills in this project')
  .action(async (name: string) => {
    try {
      const roots = defaultRoots();
      await removeSkill(name, roots);
      console.log(`Removed skill '${name}' from ${roots.projectSkillsDir}/${name}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program.parse();
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `dist/cli.js` and `dist/paths.js` and `dist/skill-lib.js` created, no TypeScript errors.

- [ ] **Step 3: Link the CLI globally**

Run: `npm link`
Expected: `raygent` command available on PATH, pointing at this project's `dist/cli.js`.

- [ ] **Step 4: Manual smoke test — list with no skills**

```bash
raygent skill list
```
Expected output: `No skills found in <home>/.raygent/skills`

- [ ] **Step 5: Manual smoke test — add, list, remove**

```bash
mkdir -p ~/.raygent/skills/hello-world
echo '# hello-world' > ~/.raygent/skills/hello-world/SKILL.md
cd /tmp && mkdir raygent-smoke-test && cd raygent-smoke-test
raygent skill add hello-world
```
Expected: `Installed skill 'hello-world' to <cwd>/.claude/skills/hello-world`, and `./.claude/skills/hello-world/SKILL.md` exists with the content above.

```bash
raygent skill list
```
Expected: `[installed] hello-world`

```bash
raygent skill add hello-world
```
Expected: non-zero exit, `skill 'hello-world' is already installed at ... (use --force to overwrite)`

```bash
raygent skill remove hello-world
raygent skill list
```
Expected: `Removed skill 'hello-world' from ...`, then `[available] hello-world`

- [ ] **Step 6: Run full test suite once more**

Run: `npm test`
Expected: PASS, all 8 tests (from Tasks 1–4).

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts
git commit -m "feat: wire raygent skill add/list/remove CLI commands"
```

---

## Self-Review Notes

- **Spec coverage:** `add`/`list`/`remove` behavior, error cases (missing source, existing destination without `--force`, missing project `.claude/` folder auto-created via `mkdir recursive`), copy-not-symlink, project-local-only target, and fixed `~/.raygent/skills` source are all covered by Tasks 1–5.
- **Deferred by spec, not included here:** `--global` flag, remote sources, config-file override, `raygent init`. These are listed as future extension points in the design doc and intentionally have no tasks in this plan.
- **Type consistency:** `Roots`, `SkillInfo`, and the three function signatures are defined once in Tasks 1–4 and reused verbatim (import paths `../src/paths.js` / `./paths.js`, `../src/skill-lib.js` / `./skill-lib.js`) in every later task — matches Node's ESM/NodeNext requirement for explicit `.js` extensions in relative imports.
