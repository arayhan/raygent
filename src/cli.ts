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
import { loadAiConfig } from './config.js';
import { runFeedback, runElaborate, type ProjectMeta } from './ai-client.js';

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
  .description('List skills available in ~/.raygent/skills and whether installed in this project')
  .action(async () => {
    try {
      const roots = defaultRoots();
      const skills = await listSkills(roots);
      if (skills.length === 0) {
        console.log(`No skills found in ${roots.skillsRoot}`);
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

program
  .command('init')
  .description('Scaffold a new project with AI-context docs')
  .argument('[project-name]', 'name of the project folder to create')
  .option('--platform <platform>', 'web | mobile | cli | desktop | agent-skills')
  .option('--framework <framework>', 'framework valid for the chosen --platform')
  .option('--type <type>', `product | client`)
  .option('--mode <mode>', 'guided (interview to pre-fill docs) | quick (stub docs)')
  .option('-f, --force', 'overwrite existing docs files')
  .action(
    async (
      projectNameArg: string | undefined,
      opts: { platform?: string; framework?: string; type?: string; mode?: string; force?: boolean }
    ) => {
      try {
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
