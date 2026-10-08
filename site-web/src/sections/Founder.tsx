import { useRef } from 'react';
import { LINKS } from '../content/links';
import { useReveal } from '../motion/useReveal';

export function Founder() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section id="creator" ref={ref} className="page-x section-y" aria-labelledby="creator-title">
      <div className="plate mx-auto grid max-w-(--container-page) overflow-hidden md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="border-b border-hairline-soft md:border-r md:border-b-0" data-reveal>
          <img
            src={`${import.meta.env.BASE_URL}raygent-avatar.jpg`}
            alt="The raygent mark: an armored dragon on a plinth inside glowing tech-rings"
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className="block aspect-square h-auto w-full max-w-full object-cover grayscale"
          />
        </div>
        <div className="grid content-center gap-5 p-6 md:p-12" data-reveal>
          <p className="label m-0">Creator</p>
          <h2 id="creator-title" className="display-l">
            Ahmed Rayhan Primadedas
          </h2>
          <p className="prose-measure m-0 text-body-l text-signal-dim">
            raygent started as Ahmed's own tool for starting products and client work: one conversation from an idea to
            a repo the coding agents can work in, then a local dashboard to watch what ships.
          </p>
          <p className="prose-measure m-0 text-signal-dim">
            The guardian dragon is the project's mark. Its tech-rings are the ones turning in the hero.
          </p>
          <div>
            <a href={LINKS.author} className="btn btn-ghost" target="_blank" rel="noreferrer">
              github.com/arayhan
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
