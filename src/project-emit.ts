import fs from 'node:fs/promises';
import path from 'node:path';
import { bundledAssetsDir } from './paths.js';
import { insertStateDocInAgentsMd, insertPhaseZeroInAgentsMd, insertPreferencesInAgentsMd } from './doc-fill.js';
import { PREFERENCES_DOC_PATH, renderPreferencesDoc, type ProjectPreferences } from './preferences.js';

export interface ProjectDataLayerOptions {
  platform?: string;
  kind?: string;
  target?: string;
}

/**
 * Determines if a project includes a data layer.
 * CLI projects and landing pages do not have a data layer.
 */
export function projectHasDataLayer(opts: ProjectDataLayerOptions): boolean {
  if (opts.platform === 'cli') return false;
  if (opts.kind === 'landing') return false;
  return true;
}

export interface EmitOptions {
  targetDir: string;
  hasClaudeCode: boolean;
  force: boolean;
  platform?: string;
  kind?: string;
  target?: string;
  preferences?: ProjectPreferences;
}

export interface EmitResult {
  written: string[];
  skipped: string[]; // already exists, not overwritten
  failed: string[]; // same semantics as `missed` in FillResult
}

export async function emitProjectState(opts: EmitOptions): Promise<EmitResult> {
  const result: EmitResult = {
    written: [],
    skipped: [],
    failed: [],
  };

  const assetsDir = bundledAssetsDir();
  const flag = opts.force ? 'w' : 'wx';

  // 1. Emit docs/STATE.md (for all agent tools)
  const stateSrc = path.join(assetsDir, 'project', 'STATE.md');
  const docsDir = path.join(opts.targetDir, 'docs');
  const stateDest = path.join(docsDir, 'STATE.md');

  try {
    const stateContent = await fs.readFile(stateSrc, 'utf8');
    await fs.mkdir(docsDir, { recursive: true });
    try {
      await fs.writeFile(stateDest, stateContent, { flag });
      result.written.push('docs/STATE.md');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        result.skipped.push('docs/STATE.md');
      } else {
        result.failed.push(`docs/STATE.md: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    result.failed.push(`docs/STATE.md: asset template not found at ${stateSrc}`);
  }

  // 2. Emit .claude/commands/*.md (only when hasClaudeCode is true)
  if (opts.hasClaudeCode) {
    const commands = ['start.md', 'wrap.md'];
    const commandsDir = path.join(opts.targetDir, '.claude', 'commands');
    for (const cmd of commands) {
      const relPath = `.claude/commands/${cmd}`;
      const srcPath = path.join(assetsDir, 'project', 'commands', cmd);
      const destPath = path.join(commandsDir, cmd);
      try {
        const content = await fs.readFile(srcPath, 'utf8');
        await fs.mkdir(commandsDir, { recursive: true });
        try {
          await fs.writeFile(destPath, content, { flag });
          result.written.push(relPath);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
            result.skipped.push(relPath);
          } else {
            result.failed.push(`${relPath}: ${(err as Error).message}`);
          }
        }
      } catch (err) {
        result.failed.push(`${relPath}: asset template not found at ${srcPath}`);
      }
    }
  }

  // 3. Emit docs/tasks/0-*.md
  const tasksDir = path.join(opts.targetDir, 'docs', 'tasks');
  const hasDataLayer = projectHasDataLayer(opts);
  // UI-first holds the data round-trip back until the user has approved the
  // screens, so it moves out of Phase 0 behind a UI review gate.
  const uiFirst = hasDataLayer && opts.preferences?.buildFocus === 'ui-first';

  const taskFiles = uiFirst
    ? [
        '0-step-01-scaffold.md',
        '0-step-02-verify-loop.md',
        '0-step-03-ui-shell.md',
        '0-gate-ui-review.md',
        '0-gate-deploy.md',
        '1-step-01-data-round-trip.md',
      ]
    : [
        '0-step-01-scaffold.md',
        '0-step-02-verify-loop.md',
        ...(hasDataLayer ? ['0-step-03-data-round-trip.md'] : []),
        '0-gate-deploy.md',
      ];

  try {
    await fs.mkdir(tasksDir, { recursive: true });
    for (const taskFile of taskFiles) {
      const relPath = `docs/tasks/${taskFile}`;
      const srcPath = path.join(assetsDir, 'project', 'tasks', taskFile);
      const destPath = path.join(tasksDir, taskFile);

      try {
        let content = await fs.readFile(srcPath, 'utf8');
        // The shared verify-loop asset names the step that follows it; in the
        // UI-first set that step is the UI shell, not the round-trip.
        if (uiFirst && taskFile === '0-step-02-verify-loop.md') {
          content = content.replace('0-step-03-data-round-trip', '0-step-03-ui-shell');
        }
        try {
          await fs.writeFile(destPath, content, { flag });
          result.written.push(relPath);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
            result.skipped.push(relPath);
          } else {
            result.failed.push(`${relPath}: ${(err as Error).message}`);
          }
        }
      } catch (err) {
        result.failed.push(`${relPath}: asset template not found at ${srcPath}`);
      }
    }
  } catch (err) {
    result.failed.push(`docs/tasks: ${(err as Error).message}`);
  }

  // 4. Emit docs/rules/project-preferences.md (only when something was chosen)
  const preferencesDoc = renderPreferencesDoc(opts.preferences ?? {});
  if (preferencesDoc !== null) {
    const destPath = path.join(opts.targetDir, ...PREFERENCES_DOC_PATH.split('/'));
    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, preferencesDoc, { flag });
      result.written.push(PREFERENCES_DOC_PATH);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        result.skipped.push(PREFERENCES_DOC_PATH);
      } else {
        result.failed.push(`${PREFERENCES_DOC_PATH}: ${(err as Error).message}`);
      }
    }
  }

  // 5. Update AGENTS.md Docs table, Phases table and Hard rules (if AGENTS.md exists)
  const agentsMdPath = path.join(opts.targetDir, 'AGENTS.md');
  try {
    let agentsContent = await fs.readFile(agentsMdPath, 'utf8');
    let modified = false;

    // Docs table insert
    const stateDocRes = insertStateDocInAgentsMd(agentsContent);
    if (!stateDocRes.didInsert) {
      result.failed.push('AGENTS.md: Docs table (PROGRESS.md row not found — update client-project-scaffold template)');
    } else if (stateDocRes.text !== agentsContent) {
      agentsContent = stateDocRes.text;
      modified = true;
    }

    // Phases table insert (Phase 0)
    const phaseZeroRes = insertPhaseZeroInAgentsMd(agentsContent);
    if (!phaseZeroRes.didInsert) {
      result.failed.push('AGENTS.md: Phases table (Phase 1 row not found — update client-project-scaffold template)');
    } else if (phaseZeroRes.text !== agentsContent) {
      agentsContent = phaseZeroRes.text;
      modified = true;
    }

    // Hard rules pointer, only when there is a preferences doc to point at
    if (preferencesDoc !== null) {
      const prefsRes = insertPreferencesInAgentsMd(agentsContent);
      if (!prefsRes.didInsert) {
        result.failed.push('AGENTS.md: Hard rules (Project-specific rules anchor not found — update client-project-scaffold template)');
      } else if (prefsRes.text !== agentsContent) {
        agentsContent = prefsRes.text;
        modified = true;
      }
    }

    if (modified) {
      await fs.writeFile(agentsMdPath, agentsContent);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      result.failed.push(`AGENTS.md: ${(err as Error).message}`);
    }
  }

  return result;
}
