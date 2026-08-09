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
      console.log(`Removed skill '${name}' from ${roots.projectSkillsDir}/${name}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program.parse();
