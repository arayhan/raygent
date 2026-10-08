import { useRef } from 'react';
import { CommandChip } from '../components/CommandChip';
import { INSTALL_COMMAND, LINKS } from '../content/links';
import { useReveal } from '../motion/useReveal';
import { Icon } from '../components/Icon';
import { BookOpen, Download, ListTree, Puzzle, SquareTerminal } from 'lucide-react';
import { useT } from '../i18n/LanguageProvider';

export function Docs() {
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  useReveal(ref);

  return (
    <section id="docs" ref={ref} className="page-x section-y" aria-labelledby="docs-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label eyebrow m-0">{t.docs.eyebrow}</p>
          <h2 id="docs-title" className="display-l">
            {t.docs.title}
          </h2>
        </div>

        <ol className="plate m-0 grid list-none p-0 lg:grid-cols-3">
          <li className="grid content-start gap-4 p-6 md:p-8" data-reveal>
            <h3 className="title icon-row">
              <Icon as={Download} className="text-blue" />
              {t.docs.steps[0].title}
            </h3>
            <CommandChip command={INSTALL_COMMAND} />
            <p className="m-0 text-small text-signal-mute">{t.docs.steps[0].note}</p>
          </li>
          <li className="grid content-start gap-4 border-t border-hairline-soft p-6 md:p-8 lg:border-t-0 lg:border-l" data-reveal>
            <h3 className="title icon-row">
              <Icon as={Puzzle} className="text-blue" />
              {t.docs.steps[1].title}
            </h3>
            <CommandChip command="raygent skill install" />
            <p className="m-0 text-small text-signal-mute">{t.docs.steps[1].note}</p>
          </li>
          <li className="grid content-start gap-4 border-t border-hairline-soft p-6 md:p-8 lg:border-t-0 lg:border-l" data-reveal>
            <h3 className="title icon-row">
              <Icon as={SquareTerminal} className="text-blue" />
              {t.docs.steps[2].title}
            </h3>
            <CommandChip command="/raygent init" prompt=">" />
            <p className="m-0 text-small text-signal-mute">{t.docs.steps[2].note}</p>
          </li>
        </ol>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end" data-reveal>
          <p className="prose-measure m-0 text-signal-dim">{t.docs.skip}</p>
          <nav aria-label={t.docs.navLabel} className="flex flex-wrap gap-3">
            <a href={LINKS.tutorial} className="btn btn-ghost" target="_blank" rel="noreferrer">
              <Icon as={BookOpen} size={18} />
              {t.docs.tutorial}
            </a>
            <a href={LINKS.commands} className="btn btn-ghost" target="_blank" rel="noreferrer">
              <Icon as={ListTree} size={18} />
              {t.docs.reference}
            </a>
          </nav>
        </div>
      </div>
    </section>
  );
}
