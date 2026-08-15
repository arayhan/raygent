#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Command } from 'commander';
import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { defaultRoots } from './paths.js';
import { listSkills, addSkill, removeSkill, skillDestDir, skillSourceDir, type SkillInfo } from './skill-lib.js';
import {
  enrichSkills,
  groupByCategory,
  condenseDescription,
  wrapText,
  SKILL_CATEGORIES,
  type EnrichedSkill,
} from './skill-meta.js';
import {
  initProject,
  installSelectedSkills,
  assertValidProjectName,
  isValidProjectName,
  slugifyProjectName,
  titleCaseSlug,
} from './init-lib.js';
import {
  parseInitSpec,
  validateInitSpec,
  formatSpecProblems,
  initSpecTemplate,
  type InitSpec,
} from './init-spec.js';
import {
  resolveTargetDir,
  PLATFORMS,
  FRAMEWORKS_BY_PLATFORM,
  PROJECT_TYPES,
  BACKEND_FRAMEWORKS,
  TARGETS,
  STACK_CAPABLE_FRAMEWORKS,
  STORYBOOK_CAPABLE_FRAMEWORKS,
  BACKEND_STACK_CAPABLE,
  STACK_TOGGLE_OPTIONS,
  BACKEND_STACK_TOGGLE_OPTIONS,
  LANDING_STACK_TOGGLE_OPTIONS,
  KINDS,
  AGENT_TOOLS,
  RULE_FILE_OPTIONS,
  STYLING_CHOICES,
  FORM_CHOICES,
  ICON_CHOICES,
} from './init-lib.js';
import { relevantCatalogSkills } from './skill-catalog.js';
import { MCP_CATALOG } from './mcp-catalog.js';
import { writeMcpConfig } from './mcp-lib.js';
import { supportsRealScaffold, supportsRealScaffoldBackend, runClientProjectScaffold } from './scaffold-tools.js';
import { questionsForType, runInterview, type InterviewAnswers } from './interview.js';
import { renderBrief } from './brief.js';
import { writeInterviewJson, applyInterviewToScaffoldDocs, applyInterviewToStubDocs } from './doc-fill.js';
import {
  loadAiConfig,
  loadConfig,
  loadPreset,
  saveConfig,
  setConfigValue,
  getConfigValue,
  defaultConfigPath,
} from './config.js';
import { runFeedback, runElaborate, type ProjectMeta } from './ai-client.js';
import { runDoctorChecks } from './doctor.js';
import { registerProduct, listProducts } from './products.js';
import { addFinanceEntry, readFinanceEntries, summarizeFinance } from './finance.js';
import { createDashboardServer } from './dashboard.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const program = new Command();
program
  .name('raygent')
  .description('Personal CLI for Claude Code skills and project scaffolding')
  .version(version);

const skill = program.command('skill').description('Manage Claude Code skills');

/** Bundled skill names, or a clear error explaining an empty bundle. */
async function bundledSkillNames(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    throw new Error(
      `no bundled skills found at ${dir} — if this is a published install, "skills" is missing from the package files list`
    );
  }
  const names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (names.length === 0) throw new Error(`no bundled skills found at ${dir}`);
  return names;
}

skill
  .command('install [name]')
  .description('Install a skill into ~/.claude/skills (no name: every skill raygent ships)')
  .option('--local', 'install into ./.claude/skills instead, for this project only')
  .option('-f, --force', 'overwrite if already installed')
  .action(async (name: string | undefined, opts: { local?: boolean; force?: boolean }) => {
    try {
      const roots = defaultRoots();
      // Global by default because /raygent init is used BEFORE a project exists,
      // often in an empty directory. A project-local install of the skill that
      // creates projects is unreachable exactly when you need it.
      const scope = opts.local ? 'project' : 'global';

      let wanted: string[];
      if (name) {
        wanted = [name];
      } else {
        wanted = await bundledSkillNames(roots.bundledSkillsDir);
      }

      for (const skillName of wanted) {
        try {
          await addSkill(skillName, roots, { force: opts.force, scope });
        } catch (err) {
          // A name that resolves nowhere should say what DOES exist rather than
          // print four absolute paths, the same courtesy --rules and --agents give.
          if (/not found in/.test((err as Error).message)) {
            const available = await bundledSkillNames(roots.bundledSkillsDir).catch(() => []);
            throw new Error(
              `skill '${skillName}' not found` +
                (available.length > 0 ? ` (raygent ships: ${available.join(', ')})` : '') +
                `; personal skills go in ${roots.skillsRoot}`
            );
          }
          throw err;
        }
        console.log(`Installed '${skillName}' to ${path.join(skillDestDir(roots, scope), skillName)}`);
      }
      if (!name) console.log(`Try: /${wanted[0]} init`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

skill
  .command('add <name>', { hidden: true })
  .description('Deprecated alias for `skill install <name> --local`')
  .option('-f, --force', 'overwrite if already installed')
  .action(async (name: string, opts: { force?: boolean }) => {
    try {
      const roots = defaultRoots();
      await addSkill(name, roots, { force: opts.force, scope: 'project' });
      console.log(`Installed skill '${name}' to ${path.join(roots.projectSkillsDir, name)}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

skill
  .command('list')
  .description('List available skills and where each one is installed')
  .option('--source <source>', 'filter by source: personal | project | global | bundled')
  .option('--installed', 'only show skills installed somewhere')
  .option('--category <category>', 'filter by function: product | design | motion | code | writing | research | agent | other')
  .action(async (opts: { source?: string; installed?: boolean; category?: string }) => {
    try {
      const roots = defaultRoots();
      let skills = await listSkills(roots);
      if (opts.source) {
        if (!['personal', 'project', 'global', 'bundled'].includes(opts.source)) {
          throw new Error(`invalid source '${opts.source}' (expected one of: personal, project, global, bundled)`);
        }
        skills = skills.filter((s) => s.source === opts.source);
      }
      if (opts.installed) skills = skills.filter((s) => s.installed || s.installedGlobally);

      let enriched = await enrichSkills(skills, (s) => path.join(skillSourceDir(roots, s.source), s.name));

      if (opts.category) {
        const valid = SKILL_CATEGORIES as readonly string[];
        if (!valid.includes(opts.category)) {
          throw new Error(`invalid category '${opts.category}' (expected one of: ${valid.join(', ')})`);
        }
        enriched = enriched.filter((s) => s.category === opts.category);
      }
      if (enriched.length === 0) {
        console.log('No skills matched.');
        return;
      }

      // Grouped rather than one 90-row table: with this many skills the category
      // is what you scan by, and repeating it as a column on every line makes it
      // harder to see, not easier.
      const groups = groupByCategory(enriched);
      const width = Math.max(60, process.stdout.columns ?? 100);
      const nameWidth = Math.max(4, ...enriched.map((s) => s.name.length));
      const where = (s: EnrichedSkill) =>
        [s.installedGlobally ? 'global' : null, s.installed ? 'project' : null].filter(Boolean).join(', ') || '-';
      const whereWidth = Math.max(9, ...enriched.map((s) => where(s).length));
      const indent = 2 + nameWidth + 2 + whereWidth + 2;

      for (const [category, group] of groups) {
        console.log(`\n${category.toUpperCase()} (${group.length})`);
        for (const s of group) {
          const head = `  ${s.name.padEnd(nameWidth)}  ${where(s).padEnd(whereWidth)}  `;
          const body = condenseDescription(s.description) || '—';
          const lines = wrapText(body, width - indent, 0);
          console.log(head + (lines[0] ?? ''));
          for (const line of lines.slice(1)) console.log(' '.repeat(indent) + line);
          if (s.tags.length > 0) console.log(`${' '.repeat(indent)}tags: ${s.tags.join(', ')}`);
        }
      }
      console.log(`\n${enriched.length} skill(s). Filter with --category <${SKILL_CATEGORIES.join('|')}>.`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

skill
  .command('remove <name>')
  .description('Remove a skill from ~/.claude/skills (--local: from this project)')
  .option('--local', 'remove from ./.claude/skills instead')
  .action(async (name: string, opts: { local?: boolean }) => {
    try {
      const roots = defaultRoots();
      // Mirrors install's default, so the two are inverses.
      const scope = opts.local ? 'project' : 'global';
      await removeSkill(name, roots, { scope });
      console.log(`Removed skill '${name}' from ${path.join(skillDestDir(roots, scope), name)}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('brief')
  .description('Print a fillable Markdown brief to pour your idea into')
  .option('--type <type>', 'product | client', 'product')
  .option('--out <file>', 'write to a file instead of stdout')
  .option('-f, --force', 'overwrite an existing --out file')
  .action(async (opts: { type: string; out?: string; force?: boolean }) => {
    try {
      if (opts.type !== 'product' && opts.type !== 'client') {
        throw new Error(`invalid type '${opts.type}' (expected one of: product, client)`);
      }
      const markdown = renderBrief(opts.type);
      if (!opts.out) {
        // Default to stdout so `raygent brief > IDEA.md` works, and so it can be
        // piped or previewed without leaving a file behind.
        process.stdout.write(markdown);
        return;
      }
      const target = path.resolve(opts.out);
      if (!opts.force) {
        const exists = await fs
          .access(target)
          .then(() => true)
          .catch(() => false);
        if (exists) throw new Error(`${target} already exists (use --force to overwrite)`);
      }
      await fs.writeFile(target, markdown);
      console.log(`Brief written to ${target}`);
      console.log('Fill it in, then run /raygent init in this folder.');
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

const config = program.command('config').description('Manage raygent configuration (~/.raygent/config.json)');

config
  .command('show')
  .description('Print the current configuration (API key masked)')
  .action(async () => {
    try {
      const cfg = await loadConfig();
      const masked = JSON.parse(JSON.stringify(cfg)) as Record<string, unknown>;
      const key = getConfigValue(masked, 'ai.apiKey');
      if (typeof key === 'string' && key.length > 0) {
        setConfigValue(masked, 'ai.apiKey', `${key.slice(0, 6)}...`);
      }
      console.log(`# ${defaultConfigPath()}`);
      console.log(JSON.stringify(masked, null, 2));
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

config
  .command('get <key>')
  .description("Read a config value by dot-path (e.g. ai.model, presets.saas.platform)")
  .action(async (key: string) => {
    try {
      const value = getConfigValue(await loadConfig(), key);
      if (value === undefined) {
        console.error(`'${key}' is not set`);
        process.exitCode = 1;
        return;
      }
      console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

config
  .command('set <key> <value>')
  .description("Set a config value by dot-path; JSON values are parsed (e.g. '[\"impeccable\"]')")
  .action(async (key: string, value: string) => {
    try {
      const cfg = await loadConfig();
      let parsed: unknown = value;
      try {
        parsed = JSON.parse(value);
      } catch {
        // plain string value
      }
      setConfigValue(cfg, key, parsed);
      await saveConfig(cfg);
      console.log(`Set ${key} in ${defaultConfigPath()}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('dashboard')
  .description('Serve the local monitoring dashboard (products, events, signups, revenue)')
  .option('--port <port>', 'port to listen on', '4321')
  .action(async (opts: { port: string }) => {
    const port = Number(opts.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(`invalid port '${opts.port}'`);
      process.exitCode = 1;
      return;
    }
    const server = createDashboardServer();
    server.listen(port, () => {
      console.log(`Dashboard: http://localhost:${port}`);
      console.log(`Ingest:    http://localhost:${port}/api/ingest`);
      console.log(`Point each product's NEXT_PUBLIC_ANALYTICS_URL at the ingest URL. Ctrl+C to stop.`);
    });
    server.on('error', (err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
    process.on('SIGINT', () => {
      server.close(() => process.exit(0));
    });
  });

const product = program.command('product').description('Manage the product registry (~/.raygent/products.json)');

product
  .command('add <name>')
  .description('Register an existing product so the dashboard tracks it')
  .option('--platform <platform>', 'platform label')
  .option('--framework <framework>', 'framework label')
  .option('--type <type>', 'product | client')
  .action(async (name: string, opts: { platform?: string; framework?: string; type?: string }) => {
    try {
      await registerProduct({
        name,
        platform: opts.platform,
        framework: opts.framework,
        type: opts.type,
        createdAt: new Date().toISOString(),
      });
      console.log(`Registered product '${name}'`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

product
  .command('list')
  .description('List registered products')
  .action(async () => {
    try {
      const products = await listProducts();
      if (products.length === 0) {
        console.log('No products registered yet (raygent init registers them automatically).');
        return;
      }
      for (const p of products) {
        const meta = [p.platform, p.framework, p.type].filter(Boolean).join('/');
        console.log(`${p.name}${meta ? ` (${meta})` : ''}${p.path ? ` — ${p.path}` : ''}`);
      }
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

const finance = program.command('finance').description('Track revenue per product (~/.raygent/finance.jsonl)');

finance
  .command('add <product> <amount> [note...]')
  .description('Record income for a product (amount is a plain number)')
  .action(async (productName: string, amountArg: string, noteParts: string[]) => {
    try {
      const amount = Number(amountArg);
      if (!Number.isFinite(amount)) {
        throw new Error(`invalid amount '${amountArg}'`);
      }
      await addFinanceEntry({
        product: productName,
        amount,
        note: noteParts.length > 0 ? noteParts.join(' ') : undefined,
        ts: new Date().toISOString(),
      });
      console.log(`Recorded ${amount} for '${productName}'`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

finance
  .command('summary')
  .description('Print revenue totals per product and per month')
  .action(async () => {
    try {
      const summary = summarizeFinance(await readFinanceEntries());
      if (summary.total === 0) {
        console.log('No finance entries yet (raygent finance add <product> <amount> [note]).');
        return;
      }
      console.log('Per product:');
      for (const [name, total] of Object.entries(summary.byProduct)) {
        console.log(`  ${name}: ${total}`);
      }
      console.log('Per month:');
      for (const [month, total] of Object.entries(summary.byMonth).sort()) {
        console.log(`  ${month}: ${total}`);
      }
      console.log(`Total: ${summary.total}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('doctor')
  .description('Check the raygent environment: node, pnpm, git, scaffolder, skills, AI endpoint')
  .action(async () => {
    const checks = await runDoctorChecks();
    for (const c of checks) {
      console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name.padEnd(16)} ${c.detail}`);
    }
    if (checks.some((c) => !c.ok)) process.exitCode = 1;
  });

/**
 * Collects the stack answers for a frontend. `toggles` varies by surface: an app
 * gets the full set, a landing page only the ones a marketing surface can use
 * (see LANDING_STACK_TOGGLE_OPTIONS). Passing the list in rather than branching
 * inside keeps the prompt order identical for both.
 */
async function collectFrontendStack(
  framework: string,
  toggles: readonly { key: string; label: string }[] = STACK_TOGGLE_OPTIONS
): Promise<Record<string, unknown>> {
  const stack: Record<string, unknown> = {};

  stack.styling = await select({
    message: 'Styling:',
    choices: STYLING_CHOICES.map((c) => ({ name: c.name, value: c.value })),
  });

  const toggled = await checkbox({
    message: 'Tech stack add-ons (space to select, enter to confirm):',
    choices: toggles.map((o) => ({ name: o.label, value: o.key })),
  });
  for (const key of toggled) stack[key] = true;

  if ((STORYBOOK_CAPABLE_FRAMEWORKS as readonly string[]).includes(framework)) {
    const wantStorybook = await confirm({ message: 'Add Storybook?', default: false });
    if (wantStorybook) stack.storybook = true;
  }

  const forms = await select({ message: 'Form library:', choices: FORM_CHOICES.map((c) => ({ name: c.name, value: c.value })) });
  if (forms !== 'none') stack.forms = forms;

  const icons = await select({ message: 'Icon pack:', choices: ICON_CHOICES.map((c) => ({ name: c.name, value: c.value })) });
  if (icons !== 'none') stack.icons = icons;

  return stack;
}

async function collectBackendStack(): Promise<Record<string, unknown>> {
  const toggled = await checkbox({
    message: 'Backend add-ons (space to select, enter to confirm):',
    choices: BACKEND_STACK_TOGGLE_OPTIONS.map((o) => ({ name: o.label, value: o.key })),
  });
  const stack: Record<string, unknown> = {};
  for (const key of toggled) stack[key] = true;
  return stack;
}

program
  .command('init')
  .description('Scaffold a new project with AI-context docs')
  .argument('[project-name]', 'name of the project folder to create')
  .option('--platform <platform>', 'web | mobile | cli | desktop | agent-skills')
  .option('--framework <framework>', 'frontend framework valid for the chosen --platform')
  .option('--agents <list>', 'comma-separated coding agents: claude-code, opencode, antigravity')
  .option('--rules <list>', 'comma-separated docs/rules files (default: every one that applies to the stack)')
  .option('--brand <name>', 'display name shown to users (default: the project name, title-cased)')
  .option('--here', 'generate into the current directory instead of a new <name> folder')
  .option('--kind <kind>', 'web only: app | landing (default app)')
  .option('--target <target>', "web only: frontend | backend | fullstack (default frontend)")
  .option('--backend <backend>', 'web only: express | hono | nestjs')
  .option('--monorepo', 'web fullstack only: use Turborepo')
  .option('--type <type>', `product | client`)
  .option('--mode <mode>', 'guided (interview to pre-fill docs) | quick (stub docs)')
  .option('--preset <name>', 'apply a preset from ~/.raygent/config.json (flags still override)')
  .option('--from <file>', 'read every answer from a JSON init spec — no prompts')
  .option('--template', 'print a fillable init spec to stdout and exit')
  .option('--fill-gaps', 'with --from: prompt for missing fields instead of failing')
  .option('-f, --force', 'overwrite existing docs files')
  .action(
    async (
      projectNameArg: string | undefined,
      opts: {
        platform?: string;
        framework?: string;
        kind?: string;
        here?: boolean;
        agents?: string;
        rules?: string;
        brand?: string;
        target?: string;
        backend?: string;
        monorepo?: boolean;
        type?: string;
        mode?: string;
        preset?: string;
        from?: string;
        template?: boolean;
        fillGaps?: boolean;
        force?: boolean;
      }
    ) => {
      try {
        // --template prints a fillable file and exits. Nothing else runs.
        if (opts.template) {
          process.stdout.write(initSpecTemplate());
          return;
        }

        // A spec is read and fully validated BEFORE the first prompt or any
        // write, and reports every problem at once -- a five-field typo should
        // cost one round trip, not five.
        let spec: InitSpec | null = null;
        if (opts.from) {
          const specPath = path.resolve(opts.from);
          let raw: string;
          try {
            raw = await fs.readFile(specPath, 'utf8');
          } catch {
            throw new Error(`cannot read spec '${specPath}'`);
          }
          spec = parseInitSpec(raw);
          const problems = validateInitSpec(spec, { requireComplete: !opts.fillGaps });
          if (problems.length > 0) {
            console.error(formatSpecProblems(specPath, problems));
            process.exitCode = 1;
            return;
          }
          // A spec may name a preset for the stack half rather than repeating it.
          opts.preset ??= spec.preset;
        }

        const preset = opts.preset ? await loadPreset(opts.preset) : null;
        if (opts.preset && !preset) {
          throw new Error(
            `preset '${opts.preset}' not found in ${defaultConfigPath()} (raygent config set presets.${opts.preset}.platform web ...)`
          );
        }
        if (preset) {
          opts.platform ??= preset.platform;
          opts.framework ??= preset.framework;
          opts.type ??= preset.type;
          opts.mode ??= preset.mode;
          opts.kind ??= preset.kind;
          if (!opts.agents && preset.agents?.length) opts.agents = preset.agents.join(',');
          if (!opts.rules && preset.rules?.length) opts.rules = preset.rules.join(',');
          opts.brand ??= preset.brand;
          opts.target ??= preset.target;
          opts.backend ??= preset.backend;
          if (opts.monorepo === undefined) opts.monorepo = preset.monorepo;
        }

        // Spec values sit between flags and preset: an explicit flag still wins,
        // so `--from spec.json --framework vite-react` does what it looks like.
        // Assigned after the preset block so a spec overrides what a preset set.
        if (spec) {
          const sp = spec.project ?? {};
          const st = spec.stack ?? {};
          if (sp.type !== undefined) opts.type ??= sp.type;
          if (sp.mode !== undefined) opts.mode ??= sp.mode;
          if (sp.brand !== undefined) opts.brand ??= sp.brand;
          // Absent means "a new folder", not "ask me". A spec that says nothing
          // about location still has to reach zero prompts.
          if (opts.here === undefined) opts.here = Boolean(sp.here);
          // The folder name normally arrives as the positional argument; with a
          // spec it comes from the file, and without this the name prompt fires.
          if (sp.name !== undefined && projectNameArg === undefined) projectNameArg = sp.name;
          if (st.platform !== undefined) opts.platform ??= st.platform;
          if (st.framework !== undefined) opts.framework ??= st.framework;
          if (st.kind !== undefined) opts.kind ??= st.kind;
          if (st.target !== undefined) opts.target ??= st.target;
          if (st.backend !== undefined && st.backend !== null) opts.backend ??= st.backend;
          if (st.monorepo !== undefined && opts.monorepo === undefined) opts.monorepo = st.monorepo;
          if (!opts.agents && spec.agents?.length) opts.agents = spec.agents.join(',');
          if (!opts.rules && spec.rules?.length) opts.rules = spec.rules.join(',');
          // An omitted key in a spec is an answer, not a gap: "no agents listed"
          // means the default, "no rules listed" means every rule that applies.
          // Falling through to a prompt would break the zero-prompt promise on
          // any spec that did not spell out all nine fields.
          opts.mode ??= 'guided';
        }

        // With a spec, every remaining prompt takes its default instead of
        // asking. --fill-gaps is the opt-out, for a half-filled spec.
        const unattended = spec !== null && !opts.fillGaps;
        // Validate flags BEFORE any prompt: being told a flag is wrong after
        // answering four questions is worse than being told immediately.
        const validAgentTools = AGENT_TOOLS.map((t) => t.value) as readonly string[];
        let agentsFromFlag: string[] | null = null;
        if (opts.agents) {
          agentsFromFlag = opts.agents.split(',').map((t) => t.trim()).filter(Boolean);
          const unknown = agentsFromFlag.filter((t) => !validAgentTools.includes(t));
          if (unknown.length > 0) {
            throw new Error(`unknown agent(s) '${unknown.join(', ')}' (expected: ${validAgentTools.join(', ')})`);
          }
          if (agentsFromFlag.length === 0) agentsFromFlag = ['claude-code'];
        }

        const validRuleFiles = RULE_FILE_OPTIONS.map((r) => r.value) as readonly string[];
        let rulesFromFlag: string[] | null = null;
        if (opts.rules) {
          rulesFromFlag = opts.rules.split(',').map((r) => r.trim()).filter(Boolean);
          const unknownRules = rulesFromFlag.filter((r) => !validRuleFiles.includes(r));
          if (unknownRules.length > 0) {
            throw new Error(`unknown rule file(s) '${unknownRules.join(', ')}' (expected: ${validRuleFiles.join(', ')})`);
          }
          // An explicitly empty list would read as "no rules", but the scaffolder
          // treats empty as "all applicable". Fall back to prompting rather than
          // silently generating the opposite of what was typed.
          if (rulesFromFlag.length === 0) rulesFromFlag = null;
        }

        // A spec's addons block is the same shape as a preset's stack, and both
        // skip the tech-stack prompts entirely. The spec wins when both exist.
        const presetStack = (spec?.stack?.addons as Record<string, unknown> | undefined) ?? preset?.stack;
        // Where the project lands. Asked before the name, because the answer
        // changes what the name defaults to: generating in place, the folder you
        // are already standing in has almost certainly got the right name.
        const here =
          opts.here ??
          (await select({
            message: 'Where should it go?',
            choices: [
              {
                name: 'A new folder',
                value: false,
                description: `Creates ./<name>/ under ${process.cwd()}`,
              },
              {
                name: 'This directory',
                value: true,
                description: `Generates straight into ${process.cwd()} — it must be empty`,
              },
            ],
          }));

        const cwdName = path.basename(process.cwd());

        // Two names, because they are two different things. The brand is what a
        // visitor reads -- headings, the browser tab, the logo. The project name
        // is what npm and the filesystem need. Asking only for the second is what
        // put "acme-landing-page" in a page title: the strict validator
        // rejected "Acme Landing Page", and the slug typed in its place then
        // became the display name everywhere.
        //
        // Brand is asked FIRST so the folder name can be derived from it. Skipped
        // entirely when the folder name came from an argument and a brand from a
        // flag or preset.
        const brandFromFlag = opts.brand?.trim() || undefined;
        const needsBrandPrompt = !brandFromFlag && !projectNameArg;
        const brandAnswer = needsBrandPrompt
          ? await input({
              message: 'Brand name (shown to users):',
              default: here ? titleCaseSlug(cwdName) : undefined,
              validate: (value) => (value.trim() !== '' ? true : 'enter a name'),
            })
          : undefined;

        const projectName =
          projectNameArg ??
          (await input({
            message: 'Folder / package name:',
            // Derived from the brand just entered. Still editable: a brand of
            // "Acme" may well belong in a folder called acme-landing.
            // The --here case wins, since that folder already exists.
            default:
              here && isValidProjectName(cwdName)
                ? cwdName
                : brandAnswer
                  ? slugifyProjectName(brandAnswer)
                  : undefined,
            validate: (value) =>
              /^[A-Za-z0-9._-]+$/.test(value) && value !== '.' && value !== '..'
                ? true
                : 'use only letters, digits, ".", "_", "-"',
          }));

        // Explicit flag beats the prompt beats a title-cased slug. The last of
        // those is what stops a preset or a scripted `raygent init <name>` from
        // shipping a kebab-case <h1>.
        const brandName = brandFromFlag ?? brandAnswer?.trim() ?? titleCaseSlug(projectName);
        const platform =
          opts.platform ?? (await select({ message: 'Platform:', choices: PLATFORMS.map((p) => ({ name: p, value: p })) }));

        let framework: string | undefined = opts.framework;
        let backend: string | null = opts.backend ?? null;
        let monorepo: string | null = opts.monorepo ? 'turborepo' : null;

        let kind: string = opts.kind ?? 'app';
        if (platform === 'web') {
          kind =
            opts.kind ??
            (await select({
              message: 'What kind of web project?',
              choices: [
                {
                  name: 'Application',
                  value: 'app',
                  description: 'App with routes and data. You pick the framework and stack next.',
                },
                {
                  name: 'Landing page',
                  value: 'landing',
                  description:
                    'Marketing page with hero, features, CTA and email capture. Next.js, no framework choice.',
                },
              ],
            }));
          if (!(KINDS as readonly string[]).includes(kind)) {
            throw new Error(`invalid kind '${kind}' (expected one of: ${KINDS.join(', ')})`);
          }
        } else if (opts.kind && opts.kind !== 'app') {
          throw new Error(`--kind ${opts.kind} is only valid for --platform web`);
        }

        // A landing page has one fixed shape: Next.js, frontend-only. Asking for
        // a target or a framework here would be offering a choice that does not
        // exist, so both prompts are skipped and the template key is set directly.
        const isLanding = platform === 'web' && kind === 'landing';
        if (isLanding) framework = 'landing';

        // Hoisted only so the run can be recorded into docs/raygent-init.json;
        // the decision itself still belongs to the block below.
        let resolvedTarget: string | undefined;

        if (platform === 'web' && !isLanding) {
          const target =
            opts.target ??
            (await select({
              message: 'What are you building?',
              choices: [
                { name: 'Frontend only', value: 'frontend' },
                { name: 'Backend only (API)', value: 'backend' },
                { name: 'Fullstack (frontend + backend)', value: 'fullstack' },
              ],
            }));
          if (!(TARGETS as readonly string[]).includes(target)) {
            throw new Error(`invalid target '${target}' (expected one of: ${TARGETS.join(', ')})`);
          }
          resolvedTarget = target;

          if (target === 'frontend' || target === 'fullstack') {
            framework =
              opts.framework ??
              (await select({
                message: 'Frontend framework:',
                choices: FRAMEWORKS_BY_PLATFORM.web.map((f) => ({ name: f, value: f })),
              }));
          }
          if (target === 'backend' || target === 'fullstack') {
            backend =
              opts.backend ??
              (await select({
                message: 'Backend framework:',
                choices: BACKEND_FRAMEWORKS.map((f) => ({ name: f, value: f })),
              }));
          }
          if (
            target === 'fullstack' &&
            !opts.monorepo &&
            framework &&
            backend &&
            supportsRealScaffold('web', framework) &&
            supportsRealScaffoldBackend(backend)
          ) {
            const wantMonorepo = unattended ? false : await confirm({ message: 'Use a monorepo (Turborepo)?', default: false });
            monorepo = wantMonorepo ? 'turborepo' : null;
          }
        } else if (!isLanding) {
          const frameworkChoices = (FRAMEWORKS_BY_PLATFORM as Record<string, readonly string[]>)[platform] ?? [];
          framework =
            opts.framework ??
            (frameworkChoices.length > 0
              ? await select({ message: 'Framework:', choices: frameworkChoices.map((f) => ({ name: f, value: f })) })
              : undefined);
        }

        let stack: Record<string, unknown> = presetStack ?? {};
        // A spec with no addons block still answers the tech-stack questions:
        // "none of them" is a legitimate answer and asking would be a prompt.
        if (presetStack === undefined && !unattended) {
          if (isLanding) {
            stack = await collectFrontendStack('landing', LANDING_STACK_TOGGLE_OPTIONS);
          } else if (framework && (STACK_CAPABLE_FRAMEWORKS as readonly string[]).includes(framework)) {
            stack = await collectFrontendStack(framework);
          } else if (backend && (BACKEND_STACK_CAPABLE as readonly string[]).includes(backend)) {
            stack = await collectBackendStack();
          }
        }

        let agentTools: string[];
        if (agentsFromFlag) {
          agentTools = agentsFromFlag;
        } else if (unattended) {
          agentTools = ['claude-code'];
        } else {
          agentTools = await checkbox({
            message: 'Which coding agent(s) will work in this project?',
            choices: AGENT_TOOLS.map((t) => ({ name: t.name, value: t.value, description: t.description, checked: t.value === 'claude-code' })),
          });
          // An empty selection would silently produce a project with no
          // instruction file worth reading, so fall back rather than accept it.
          if (agentTools.length === 0) agentTools = ['claude-code'];
        }

        // Which rule files land in docs/rules/. Every option is offered rather
        // than pre-filtered by stack: the scaffolder's RULE_FILES table already
        // decides what applies, and re-deriving that here would be a second copy
        // of the rule -- the exact thing docs/rules/ exists to stop.
        let ruleFiles: string[];
        if (rulesFromFlag) {
          ruleFiles = rulesFromFlag;
        } else if (unattended) {
          // Empty means "every rule that applies to this stack" downstream.
          ruleFiles = [];
        } else {
          ruleFiles = await checkbox({
            message: 'Which coding rules should docs/rules/ carry? (ones that do not fit the stack are skipped)',
            choices: RULE_FILE_OPTIONS.map((r) => ({
              name: r.name,
              value: r.value,
              description: r.description,
              checked: true,
            })),
          });
        }

        const type =
          opts.type ?? (await select({ message: 'Type:', choices: PROJECT_TYPES.map((t) => ({ name: t, value: t })) }));

        if (opts.mode !== undefined && opts.mode !== 'guided' && opts.mode !== 'quick') {
          throw new Error(`invalid mode '${opts.mode}' (expected one of: guided, quick)`);
        }
        const mode =
          opts.mode ??
          (await select({
            message: 'Setup mode:',
            choices: [
              { name: 'guided — interview to pre-fill your docs', value: 'guided' },
              { name: 'quick — stub docs, fill them later', value: 'quick' },
            ],
          }));

        let answers: InterviewAnswers | null = null;
        if (mode === 'guided') {
          const fromSpec = spec?.interview ?? null;
          if (fromSpec) {
            // The whole point of a spec: the interview is the long part, so a
            // spec that carries answers must not re-ask them. --fill-gaps still
            // prompts for the questions the spec left out.
            const questions = questionsForType(type);
            const missing = questions.filter((q) => !fromSpec[q.key]);
            answers = Object.fromEntries(questions.map((q) => [q.key, fromSpec[q.key] ?? '']));
            if (opts.fillGaps && missing.length > 0) {
              console.log(`Spec answered ${questions.length - missing.length}/${questions.length}. Asking the rest.`);
              for (const q of missing) answers[q.key] = (await input({ message: q.message })).trim();
            } else {
              console.log(`Interview answered from the spec (${questions.length - missing.length}/${questions.length}).`);
            }
          } else {
            console.log('Guided setup — press Enter on any question to skip it.');
            answers = await runInterview(questionsForType(type), (q) => input({ message: q.message }));
          }
        }

        const frontendRealScaffold =
          isLanding || (Boolean(framework) && supportsRealScaffold(platform, framework as string));
        const backendRealScaffold = Boolean(backend) && supportsRealScaffoldBackend(backend as string);

        let targetDir: string;
        let usedRealScaffold = false;
        if (frontendRealScaffold || backendRealScaffold) {
          assertValidProjectName(projectName);
          targetDir = resolveTargetDir(projectName, process.cwd(), here);
          usedRealScaffold = true;
          await runClientProjectScaffold({
            projectName,
            brandName,
            targetDir,
            frontend: frontendRealScaffold ? (framework as string) : null,
            backend: backendRealScaffold ? backend : null,
            monorepo,
            type,
            stack,
            agentTools,
            ruleFiles,
          });
          const stackLabel = [framework, backend].filter(Boolean).join(' + ');
          console.log(`Scaffolded ${type} ${platform}/${stackLabel} project '${projectName}' at ${targetDir}`);
        } else {
          const result = await initProject({
            projectName,
            here,
            platform,
            framework: framework as string,
            type,
            force: opts.force,
          });
          targetDir = result.targetDir;
          console.log(`Initialized ${type} ${platform}/${framework} project '${projectName}' with docs in ${result.docsDir}`);
        }

        try {
          await registerProduct({
            // The dashboard lists products to a person, so it gets the brand.
            name: brandName,
            platform,
            framework: framework ?? backend ?? undefined,
            type,
            path: targetDir,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // registry failure never fails init
        }

        if (answers) {
          const docsDir = path.join(targetDir, 'docs');
          await fs.mkdir(docsDir, { recursive: true });
          await writeInterviewJson(docsDir, { projectName: brandName, platform, framework, type }, answers);

          if (usedRealScaffold) {
            const { filled, missed } = await applyInterviewToScaffoldDocs(targetDir, type, answers);
            if (filled.length > 0) console.log(`Pre-filled ${filled.length} doc section(s) from your answers.`);
            if (missed.length > 0) {
              console.log(
                `Left as TODO (skipped or unmatched — update client-project-scaffold if sections are missed):\n  ${missed.join('\n  ')}`
              );
            }
          } else {
            await applyInterviewToStubDocs(docsDir, type, answers, brandName);
            console.log('Docs pre-filled from your answers (skipped questions stay as TODOs).');
          }
          console.log(`Raw answers saved to ${path.join(docsDir, 'interview.json')}`);

          const aiConfig = await loadAiConfig();
          if (aiConfig) {
            const meta: ProjectMeta = { projectName: brandName, platform, framework, type };
            const wantFeedback = await confirm({ message: 'Want AI feedback on your plan?', default: true });
            if (wantFeedback) {
              try {
                const feedback = await runFeedback(aiConfig, meta, questionsForType(type), answers);
                console.log(`\n${feedback}\n`);
                const reviewPath = path.join(docsDir, 'ai-review.md');
                await fs.writeFile(
                  reviewPath,
                  `# AI review\n\n_Generated ${new Date().toISOString()} by ${aiConfig.model}_\n\n${feedback}\n`
                );
                console.log(`AI review saved to ${reviewPath}`);

                const wantElaborate = await confirm({ message: 'Also elaborate the docs with AI?', default: false });
                if (wantElaborate) {
                  const targetDocs = usedRealScaffold
                    ? ['docs/PRODUCT.md', 'docs/PRD.md', 'docs/DESIGN.md']
                    : type === 'product'
                      ? ['docs/PRD.md', 'docs/VISION.md', 'docs/product-roadmap.md', 'docs/DESIGN.md']
                      : ['docs/PRD.md', 'docs/scope.md', 'docs/handoff.md', 'docs/DESIGN.md'];
                  const docs: Record<string, string> = {};
                  for (const rel of targetDocs) {
                    try {
                      docs[rel] = await fs.readFile(path.join(targetDir, rel), 'utf8');
                    } catch {
                      // missing doc: skip it from elaboration
                    }
                  }
                  const rewritten = await runElaborate(aiConfig, meta, answers, docs);
                  for (const [rel, content] of Object.entries(rewritten)) {
                    await fs.writeFile(path.join(targetDir, rel), content);
                  }
                  console.log(`AI elaborated ${Object.keys(rewritten).length} doc(s).`);
                }
              } catch (aiErr) {
                if (aiErr instanceof Error && aiErr.name === 'ExitPromptError') throw aiErr;
                console.error(`AI step failed: ${(aiErr as Error).message} — continuing.`);
              }
            }
          }
        }

        const roots = defaultRoots();

        // A spec's skills list is authoritative, including an explicit empty
        // list: "install nothing" is an answer, and re-showing the checklist
        // would break the zero-prompt promise.
        const specSkills = spec?.skills;
        if (specSkills !== undefined) {
          if (specSkills.length > 0) {
            await installSelectedSkills({
              targetDir,
              skillsRoot: roots.skillsRoot,
              agentSkillsDir: roots.agentSkillsDir,
              globalAgentSkillsDir: roots.globalAgentSkillsDir,
              personalSkillNames: [],
              builtinSkillNames: specSkills,
            });
            console.log(`Installed skills from spec: ${specSkills.join(', ')}`);
          }
        } else if (preset?.skills && preset.skills.length > 0) {
          // Preset skills skip the checklist: attempt a real install for each,
          // unresolvable names land in .claude/skills.json as reminders.
          await installSelectedSkills({
            targetDir,
            skillsRoot: roots.skillsRoot,
            agentSkillsDir: roots.agentSkillsDir,
            globalAgentSkillsDir: roots.globalAgentSkillsDir,
            personalSkillNames: [],
            builtinSkillNames: preset.skills,
          });
          console.log(`Installed preset skills: ${preset.skills.join(', ')}`);
        } else {
          const skillChoices: {
            name: string;
            value: { source: 'builtin' | SkillInfo['source']; name: string };
          }[] = [
            ...relevantCatalogSkills(type, platform).map((s) => ({
              name: `${s.name} (built-in)`,
              value: { source: 'builtin' as const, name: s.name },
            })),
            ...(await listSkills(roots)).map((s) => ({
              name: `${s.name} (${s.source})`,
              value: { source: s.source, name: s.name },
            })),
          ];

          if (skillChoices.length > 0) {
            const selected = await checkbox({
              message: 'Recommended skills to install (space to select, enter to confirm):',
              choices: skillChoices,
            });
            if (selected.length > 0) {
              const personalSkillNames = selected.filter((s) => s.source !== 'builtin').map((s) => s.name);
              const builtinSkillNames = selected.filter((s) => s.source === 'builtin').map((s) => s.name);
              await installSelectedSkills({
                targetDir,
                skillsRoot: roots.skillsRoot,
                agentSkillsDir: roots.agentSkillsDir,
                globalAgentSkillsDir: roots.globalAgentSkillsDir,
                personalSkillNames,
                builtinSkillNames,
              });
              console.log(`Installed skills: ${selected.map((s) => s.name).join(', ')}`);
            }
          }
        }

        const mcpSelected =
          spec?.mcp ??
          (await checkbox({
            message: 'MCP servers to configure in .mcp.json (space to select, enter to confirm):',
            choices: MCP_CATALOG.map((s) => ({ name: s.label, value: s.id })),
          }));
        if (mcpSelected.length > 0) {
          const { needsEnv } = await writeMcpConfig(targetDir, mcpSelected);
          console.log(`Configured MCP servers in ${path.join(targetDir, '.mcp.json')}: ${mcpSelected.join(', ')}`);
          if (needsEnv.length > 0) {
            console.log(`Set these env vars before Claude Code can use them: ${needsEnv.join(', ')}`);
          }
        }

        // Record exactly what this run was given. Copy it, change the two names,
        // and `raygent init --from` reproduces the setup with no prompts -- which
        // is how the format gets discovered without anyone reading the docs.
        try {
          const usedSpec: InitSpec = {
            version: 1,
            project: { name: projectName, brand: brandName, type, here: Boolean(here), mode },
            stack: {
              platform,
              kind: isLanding ? 'landing' : 'app',
              framework: framework ?? undefined,
              target: resolvedTarget,
              backend: backend ?? null,
              monorepo: Boolean(monorepo),
              addons: stack,
            },
            agents: agentTools,
            rules: ruleFiles,
            skills: specSkills ?? preset?.skills ?? [],
            mcp: mcpSelected,
            interview: answers ?? {},
          };
          const docsDir = path.join(targetDir, 'docs');
          await fs.mkdir(docsDir, { recursive: true });
          const specOut = path.join(docsDir, 'raygent-init.json');
          await fs.writeFile(specOut, initSpecTemplate(usedSpec));
          console.log(`Init spec saved to ${specOut} — reuse it with: raygent init --from <file>`);
        } catch {
          // Recording the spec is a convenience; never fail a good init over it.
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'ExitPromptError') {
          process.exitCode = 130;
          return;
        }
        console.error((err as Error).message);
        process.exitCode = 1;
      }
    }
  );

await program.parseAsync();
