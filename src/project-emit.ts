import fs from 'node:fs/promises';
import path from 'node:path';
import { bundledAssetsDir } from './paths.js';
import { insertStateDocInAgentsMd } from './doc-fill.js';

export interface EmitOptions {
  targetDir: string;
  hasClaudeCode: boolean;
  force: boolean;
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

  // 3. Update AGENTS.md Docs table (if AGENTS.md exists)
  const agentsMdPath = path.join(opts.targetDir, 'AGENTS.md');
  try {
    const agentsContent = await fs.readFile(agentsMdPath, 'utf8');
    const { text, didInsert } = insertStateDocInAgentsMd(agentsContent);
    if (!didInsert) {
      result.failed.push('AGENTS.md: Docs table (PROGRESS.md row not found — update client-project-scaffold template)');
    } else if (text !== agentsContent) {
      await fs.writeFile(agentsMdPath, text);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      result.failed.push(`AGENTS.md: ${(err as Error).message}`);
    }
  }

  return result;
}
