#!/usr/bin/env node
import path from 'node:path';
import { createRequire } from 'node:module';
import { Command } from 'commander';
import { input, select, checkbox } from '@inquirer/prompts';
import { defaultRoots } from './paths.js';
import { listSkills, addSkill, removeSkill } from './skill-lib.js';
import { initProject, installSelectedSkills, PLATFORMS, FRAMEWORKS_BY_PLATFORM, PROJECT_TYPES } from './init-lib.js';
import { relevantCatalogSkills } from './skill-catalog.js';

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
        console.log(`${s.installed ? '[installed]' : '[available]'} ${s.name}`);
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
  .option('-f, --force', 'overwrite existing docs files')
  .action(
    async (
      projectNameArg: string | undefined,
      opts: { platform?: string; framework?: string; type?: string; force?: boolean }
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

        const { targetDir, docsDir } = await initProject({
          projectName,
          platform,
          framework: framework as string,
          type,
          force: opts.force,
        });
        console.log(`Initialized ${type} ${platform}/${framework} project '${projectName}' with docs in ${docsDir}`);

        const roots = defaultRoots();
        const skillChoices: { name: string; value: { source: 'builtin' | 'personal'; name: string } }[] = [
          ...relevantCatalogSkills(type, platform).map((s) => ({
            name: `${s.name} (built-in)`,
            value: { source: 'builtin' as const, name: s.name },
          })),
          ...(await listSkills(roots)).map((s) => ({
            name: `${s.name} (personal)`,
            value: { source: 'personal' as const, name: s.name },
          })),
        ];

        if (skillChoices.length > 0) {
          const selected = await checkbox({
            message: 'Recommended skills to install (space to select, enter to confirm):',
            choices: skillChoices,
          });
          if (selected.length > 0) {
            const personalSkillNames = selected.filter((s) => s.source === 'personal').map((s) => s.name);
            const builtinSkillNames = selected.filter((s) => s.source === 'builtin').map((s) => s.name);
            await installSelectedSkills({
              targetDir,
              skillsRoot: roots.skillsRoot,
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
