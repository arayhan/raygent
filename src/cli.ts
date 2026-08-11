#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Command } from 'commander';
import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { defaultRoots } from './paths.js';
import { listSkills, addSkill, removeSkill } from './skill-lib.js';
import {
  initProject,
  installSelectedSkills,
  assertValidProjectName,
  PLATFORMS,
  FRAMEWORKS_BY_PLATFORM,
  PROJECT_TYPES,
} from './init-lib.js';
import { relevantCatalogSkills } from './skill-catalog.js';
import { supportsRealScaffold, runClientProjectScaffold } from './scaffold-tools.js';
import { questionsForType, runInterview, type InterviewAnswers } from './interview.js';
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

skill
  .command('add <name>')
  .description('Install a skill from ~/.raygent/skills into ./.claude/skills')
  .option('-f, --force', 'overwrite if already installed')
  .action(async (name: string, opts: { force?: boolean }) => {
    try {
      const roots = defaultRoots();
      await addSkill(name, roots, { force: opts.force });
      console.log(`Installed skill '${name}' to ${path.join(roots.projectSkillsDir, name)}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

skill
  .command('list')
  .description('List available skills and whether they are installed in this project')
  .option('--source <source>', 'filter by source: personal | project | global')
  .option('--installed', 'only show skills installed in this project')
  .action(async (opts: { source?: string; installed?: boolean }) => {
    try {
      const roots = defaultRoots();
      let skills = await listSkills(roots);
      if (opts.source) {
        if (!['personal', 'project', 'global'].includes(opts.source)) {
          throw new Error(`invalid source '${opts.source}' (expected one of: personal, project, global)`);
        }
        skills = skills.filter((s) => s.source === opts.source);
      }
      if (opts.installed) skills = skills.filter((s) => s.installed);
      if (skills.length === 0) {
        console.log('No skills matched.');
        return;
      }
      for (const s of skills) {
        console.log(`${s.installed ? '[installed]' : '[available]'} ${s.name} (${s.source})`);
      }
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

skill
  .command('remove <name>')
  .description('Remove a skill from ./.claude/skills in this project')
  .action(async (name: string) => {
    try {
      const roots = defaultRoots();
      await removeSkill(name, roots);
      console.log(`Removed skill '${name}' from ${path.join(roots.projectSkillsDir, name)}`);
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

program
  .command('init')
  .description('Scaffold a new project with AI-context docs')
  .argument('[project-name]', 'name of the project folder to create')
  .option('--platform <platform>', 'web | mobile | cli | desktop | agent-skills')
  .option('--framework <framework>', 'framework valid for the chosen --platform')
  .option('--type <type>', `product | client`)
  .option('--mode <mode>', 'guided (interview to pre-fill docs) | quick (stub docs)')
  .option('--preset <name>', 'apply a preset from ~/.raygent/config.json (flags still override)')
  .option('-f, --force', 'overwrite existing docs files')
  .action(
    async (
      projectNameArg: string | undefined,
      opts: { platform?: string; framework?: string; type?: string; mode?: string; preset?: string; force?: boolean }
    ) => {
      try {
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
        }
        const projectName =
          projectNameArg ??
          (await input({
            message: 'Project name:',
            validate: (value) =>
              /^[A-Za-z0-9._-]+$/.test(value) && value !== '.' && value !== '..'
                ? true
                : 'use only letters, digits, ".", "_", "-"',
          }));
        const platform =
          opts.platform ?? (await select({ message: 'Platform:', choices: PLATFORMS.map((p) => ({ name: p, value: p })) }));
        const frameworkChoices = (FRAMEWORKS_BY_PLATFORM as Record<string, readonly string[]>)[platform] ?? [];
        const framework =
          opts.framework ??
          (frameworkChoices.length > 0
            ? await select({ message: 'Framework:', choices: frameworkChoices.map((f) => ({ name: f, value: f })) })
            : undefined);
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
          console.log('Guided setup — press Enter on any question to skip it.');
          answers = await runInterview(questionsForType(type), (q) => input({ message: q.message }));
        }

        let targetDir: string;
        let usedRealScaffold = false;
        if (supportsRealScaffold(platform, framework as string)) {
          assertValidProjectName(projectName);
          targetDir = path.join(process.cwd(), projectName);
          usedRealScaffold = true;
          await runClientProjectScaffold({ projectName, targetDir, frontend: framework as string, type });
          console.log(`Scaffolded ${type} ${platform}/${framework} project '${projectName}' at ${targetDir}`);
        } else {
          const result = await initProject({
            projectName,
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
            name: projectName,
            platform,
            framework,
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
          await writeInterviewJson(docsDir, { projectName, platform, framework, type }, answers);

          if (usedRealScaffold) {
            const { filled, missed } = await applyInterviewToScaffoldDocs(targetDir, type, answers);
            if (filled.length > 0) console.log(`Pre-filled ${filled.length} doc section(s) from your answers.`);
            if (missed.length > 0) {
              console.log(
                `Left as TODO (skipped or unmatched — update client-project-scaffold if sections are missed):\n  ${missed.join('\n  ')}`
              );
            }
          } else {
            await applyInterviewToStubDocs(docsDir, type, answers, projectName);
            console.log('Docs pre-filled from your answers (skipped questions stay as TODOs).');
          }
          console.log(`Raw answers saved to ${path.join(docsDir, 'interview.json')}`);

          const aiConfig = await loadAiConfig();
          if (aiConfig) {
            const meta: ProjectMeta = { projectName, platform, framework, type };
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

        if (preset?.skills && preset.skills.length > 0) {
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
          return;
        }

        const skillChoices: { name: string; value: { source: 'builtin' | 'personal' | 'project' | 'global'; name: string } }[] = [
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
