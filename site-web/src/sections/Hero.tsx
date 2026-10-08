import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { CommandChip } from '../components/CommandChip';
import { Icon } from '../components/Icon';
import { RingField } from '../components/RingField';
import { INSTALL_COMMAND } from '../content/links';
import { useT } from '../i18n/LanguageProvider';
import { DUR, EASE_OUT_EXPO, STAGGER, gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const t = useT();

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
          <p className="label eyebrow m-0" data-hero-rest>
            {t.hero.eyebrow}
          </p>
          <h1 id="hero-title" className="display-xl">
            <span className="block" data-hero-line>
              {t.hero.line1}
            </span>
            <span className="block" data-hero-line>
              {t.hero.line2}
            </span>
          </h1>
          <p className="prose-measure m-0 text-body-l text-signal-dim" data-hero-rest>
            {t.hero.body}
          </p>
          <div className="flex flex-wrap items-center gap-4" data-hero-rest>
            <a href="#docs" className="btn btn-primary">
              {t.hero.cta}
              <Icon as={ArrowRight} size={18} />
            </a>
            <CommandChip command={INSTALL_COMMAND} />
          </div>
          <p className="m-0 text-small text-signal-mute" data-hero-rest>
            {t.hero.worksWith}
          </p>
        </div>
        <RingField />
      </div>
    </section>
  );
}
