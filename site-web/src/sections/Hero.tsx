import { useRef } from 'react';
import { CommandChip } from '../components/CommandChip';
import { RingField } from '../components/RingField';
import { INSTALL_COMMAND } from '../content/links';
import { DUR, EASE_OUT_EXPO, STAGGER, gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  // The page-load sequence: headline lines fade in, then the rest, all 500ms
  // on the 60ms stagger. Opacity only.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: EASE_OUT_EXPO, duration: DUR.enter } });
      tl.from('[data-hero-line]', { opacity: 0, stagger: STAGGER }).from(
        '[data-hero-rest]',
        { opacity: 0, stagger: STAGGER },
        '-=0.3'
      );
    },
    { scope: ref }
  );

  return (
    <section id="top" ref={ref} className="page-x" aria-labelledby="hero-title">
      <div className="mx-auto grid max-w-(--container-page) items-center gap-10 pt-16 pb-24 md:pt-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-32">
        <div className="grid gap-8">
          <p className="label m-0" data-hero-rest>
            Open-source CLI and agent skill
          </p>
          <h1 id="hero-title" className="display-xl">
            <span className="block" data-hero-line>
              From raw idea
            </span>
            <span className="block" data-hero-line>
              to runnable repo
            </span>
          </h1>
          <p className="prose-measure m-0 text-body-l text-signal-dim" data-hero-rest>
            raygent interviews you, argues with the weak parts of your plan, cuts phase 1, picks a stack and says why.
            Then it generates a real project with the docs, rules and task plan your coding agent picks up on its first
            session.
          </p>
          <div className="flex flex-wrap items-center gap-4" data-hero-rest>
            <a href="#docs" className="btn btn-primary">
              Get started
            </a>
            <CommandChip command={INSTALL_COMMAND} />
          </div>
          <p className="m-0 text-small text-signal-mute" data-hero-rest>
            Works with Claude Code, opencode and Antigravity. Node.js 20 or newer.
          </p>
        </div>
        <RingField />
      </div>
    </section>
  );
}
