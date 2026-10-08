import { useRef } from 'react';
import { LINKS } from '../content/links';
import { useReveal } from '../motion/useReveal';
import { GitHubMark } from '../components/Icon';
import { useT } from '../i18n/LanguageProvider';

export function Founder() {
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  useReveal(ref);

  return (
    <section id="creator" ref={ref} className="page-x section-y" aria-labelledby="creator-title">
      <div className="plate mx-auto grid max-w-(--container-page) overflow-hidden md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="border-b border-hairline-soft md:border-r md:border-b-0" data-reveal>
          <img
            src={`${import.meta.env.BASE_URL}raygent-avatar.jpg`}
            alt={t.creator.alt}
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className="block aspect-square h-auto w-full max-w-full object-cover"
          />
        </div>
        <div className="grid content-center gap-5 p-6 md:p-12" data-reveal>
          <p className="label eyebrow m-0">{t.creator.eyebrow}</p>
          <h2 id="creator-title" className="display-l">
            Ahmed Rayhan Primadedas
          </h2>
          <p className="prose-measure m-0 text-body-l text-signal-dim">{t.creator.bio}</p>
          <p className="prose-measure m-0 text-signal-dim">{t.creator.mark}</p>
          <div>
            <a href={LINKS.author} className="btn btn-ghost" target="_blank" rel="noreferrer">
              <GitHubMark />
              github.com/arayhan
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
