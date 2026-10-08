import { LINKS } from '../content/links';
import { RingMark } from './RingMark';

const NAV = [
  { href: '#flagship', label: 'Flagship' },
  { href: '#features', label: 'Features' },
  { href: '#compare', label: 'Compare' },
  { href: '#docs', label: 'Docs' },
  { href: '#examples', label: 'Examples' },
];

export function Header() {
  return (
    <header
      className="page-x sticky z-20 border-b border-hairline-soft bg-void/85"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-(--container-page) items-center justify-between gap-6 py-4">
        <a href="#top" className="flex items-center gap-3 no-underline" aria-label="raygent, back to top">
          <RingMark size={28} />
          <span className="font-display text-[22px] font-bold uppercase tracking-[0.04em]">raygent</span>
        </a>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="m-0 flex list-none gap-7 p-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="link-sweep label inline-block py-2 hover:text-signal-white">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={LINKS.repo} className="btn btn-ghost px-4 py-2" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </header>
  );
}
