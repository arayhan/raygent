import { LINKS } from '../content/links';
import { RingMark } from './RingMark';

const FOOTER_LINKS = [
  { href: LINKS.readme, label: 'Docs' },
  { href: LINKS.repo, label: 'GitHub' },
  { href: LINKS.saweria, label: 'Saweria' },
  { href: LINKS.license, label: 'MIT License' },
];

export function Footer() {
  return (
    <footer className="page-x border-t border-hairline-soft">
      <div className="mx-auto grid max-w-(--container-page) gap-6 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center gap-3">
          <RingMark size={24} />
          <span className="font-display text-[18px] font-bold uppercase tracking-[0.04em]">raygent</span>
        </div>
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap gap-x-7 gap-y-3 p-0">
            {FOOTER_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="link-sweep label pb-1 hover:text-signal-white" target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="m-0 text-small text-signal-mute md:col-span-2">© 2026 Ahmed Rayhan Primadedas. Released under the MIT License.</p>
      </div>
    </footer>
  );
}
