import { useRef } from 'react';
import { CommandChip } from '../components/CommandChip';
import { INSTALL_COMMAND, LINKS } from '../content/links';
import { useReveal } from '../motion/useReveal';

export function Docs() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section id="docs" ref={ref} className="page-x section-y" aria-labelledby="docs-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label m-0">How to use it</p>
          <h2 id="docs-title" className="display-l">
            Three commands to your first conversation
          </h2>
        </div>

        <ol className="plate m-0 grid list-none p-0 lg:grid-cols-3">
          <li className="grid content-start gap-4 p-6 md:p-8" data-reveal>
            <h3 className="title">Install the CLI</h3>
            <CommandChip command={INSTALL_COMMAND} />
            <p className="m-0 text-small text-signal-mute">
              Then <code className="font-mono text-mono-s text-signal-white">raygent doctor</code> checks node, pnpm,
              git, the scaffolder and skills before anything runs.
            </p>
          </li>
          <li className="grid content-start gap-4 border-t border-hairline-soft p-6 md:p-8 lg:border-t-0 lg:border-l" data-reveal>
            <h3 className="title">Install the skill, once per machine</h3>
            <CommandChip command="raygent skill install" />
            <p className="m-0 text-small text-signal-mute">
              Global on purpose: you use it before a project exists, so a project-local copy would be out of reach.
            </p>
          </li>
          <li className="grid content-start gap-4 border-t border-hairline-soft p-6 md:p-8 lg:border-t-0 lg:border-l" data-reveal>
            <h3 className="title">Start in an empty folder</h3>
            <CommandChip command="/raygent init" prompt=">" />
            <p className="m-0 text-small text-signal-mute">
              Type it in your coding agent with one sentence about the idea. Already have docs? Run it in the folder
              that holds them.
            </p>
          </li>
        </ol>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end" data-reveal>
          <p className="prose-measure m-0 text-signal-dim">
            Rather skip the conversation? <code className="font-mono text-mono text-signal-white">raygent init --template</code>{' '}
            prints a commented spec, and <code className="font-mono text-mono text-signal-white">raygent init --from spec.json</code>{' '}
            generates from it with zero prompts.
          </p>
          <nav aria-label="Documentation" className="flex flex-wrap gap-3">
            <a href={LINKS.tutorial} className="btn btn-ghost" target="_blank" rel="noreferrer">
              Tutorial
            </a>
            <a href={LINKS.commands} className="btn btn-ghost" target="_blank" rel="noreferrer">
              Command reference
            </a>
          </nav>
        </div>
      </div>
    </section>
  );
}
