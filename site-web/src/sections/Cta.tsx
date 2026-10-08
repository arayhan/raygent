import { useRef } from 'react';
import { CommandChip } from '../components/CommandChip';
import { RingMark } from '../components/RingMark';
import { INSTALL_COMMAND, LINKS } from '../content/links';
import { useReveal } from '../motion/useReveal';

export function Cta() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section id="start" ref={ref} className="page-x section-y" aria-labelledby="start-title">
      <div className="mx-auto grid max-w-(--container-page) justify-items-start gap-8">
        <span data-reveal>
          <RingMark size={44} />
        </span>
        <h2 id="start-title" className="display-xl max-w-[14ch]" data-reveal>
          Your next idea, argued and built
        </h2>
        <div className="flex flex-wrap items-center gap-4" data-reveal>
          <CommandChip command={INSTALL_COMMAND} />
          <a href={LINKS.repo} className="btn btn-ghost" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>

        <div
          id="support"
          className="plate mt-8 grid w-full gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8"
          data-reveal
        >
          <div className="grid gap-2">
            <h3 className="title">Support raygent</h3>
            <p className="prose-measure m-0 text-signal-dim">
              raygent is free and MIT-licensed. If it saves you a week of setup, you can support its development on
              Saweria.
            </p>
          </div>
          <a href={LINKS.saweria} className="btn btn-primary justify-self-start" target="_blank" rel="noreferrer">
            Support on Saweria
          </a>
        </div>
      </div>
    </section>
  );
}
