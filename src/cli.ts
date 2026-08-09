#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import { input, select } from '@inquirer/prompts';
import { defaultRoots } from './paths.js';
import { listSkills, addSkill, removeSkill } from './skill-lib.js';
import { initProject, FRAMEWORKS, PROJECT_TYPES } from './init-lib.js';

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
  .option('--framework <framework>', `next | node | python`)
  .option('--type <type>', `product | client`)
  .option('-f, --force', 'overwrite existing docs files')
  .action(async (projectNameArg: string | undefined, opts: { framework?: string; type?: string; force?: boolean }) => {
    try {
      const projectName = projectNameArg ?? (await input({ message: 'Project name:' }));
      const framework =
        opts.framework ?? (await select({ message: 'Framework:', choices: FRAMEWORKS.map((f) => ({ name: f, value: f })) }));
      const type =
        opts.type ?? (await select({ message: 'Type:', choices: PROJECT_TYPES.map((t) => ({ name: t, value: t })) }));

      const { docsDir } = await initProject({ projectName, framework, type, force: opts.force });
      console.log(`Initialized ${type} project '${projectName}' with docs in ${docsDir}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

await program.parseAsync();
