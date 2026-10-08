import { useRef } from 'react';
import { Bot, MessageSquareWarning, ShieldCheck, Split } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/LanguageProvider';
import { useReveal } from '../motion/useReveal';

const ICONS = [Bot, Split, MessageSquareWarning, ShieldCheck];
// Hairline grid: right rule on the left column, top rule from the second row.
const CELL = [
  'border-hairline-soft md:border-r',
  'border-t border-hairline-soft md:border-t-0',
  'border-t border-hairline-soft md:border-r',
  'border-t border-hairline-soft',
];

export function Why() {
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  useReveal(ref);

  return (
    <section id="why" ref={ref} className="page-x section-y" aria-labelledby="why-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label eyebrow m-0">{t.why.eyebrow}</p>
          <h2 id="why-title" className="display-l">
            {t.why.title}
          </h2>
        </div>

        <ul className="plate m-0 grid list-none p-0 md:grid-cols-2">
          {t.why.items.map((item, i) => (
            <li key={i} className={`grid gap-3 p-6 md:p-8 ${CELL[i]}`} data-reveal>
              <h3 className="title icon-row">
                <Icon as={ICONS[i]} className="text-blue" />
                {item.title}
              </h3>
              <p className="m-0 text-signal-dim">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
