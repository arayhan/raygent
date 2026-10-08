import { LINKS } from '../content/links';
import { RingMark } from './RingMark';
import { GitHubMark } from './Icon';
import { useT } from '../i18n/LanguageProvider';

const NAV = [
  { href: '#flagship', key: 'flagship' },
  { href: '#features', key: 'features' },
  { href: '#compare', key: 'compare' },
  { href: '#docs', key: 'docs' },
  { href: '#examples', key: 'examples' },
] as const;

export function Header() {
  const t = useT();
  return (
    <header
      className="page-x sticky z-20 border-b border-hairline-soft bg-void/85"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-(--container-page) items-center justify-between gap-6 py-4">
        <a href="#top" className="flex items-center gap-3 no-underline" aria-label={t.ui.backToTop}>
          <RingMark size={28} />
          <span className="font-display text-[22px] font-semibold tracking-[-0.01em]">raygent</span>
        </a>
        <nav aria-label={t.ui.navLabel} className="hidden md:block">
          <ul className="m-0 flex list-none gap-7 p-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="link-sweep label inline-block py-2 hover:text-signal-white">
                  {t.nav[item.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={LINKS.repo} className="btn btn-ghost px-4 py-2" target="_blank" rel="noreferrer">
          <GitHubMark size={16} />
          GitHub
        </a>
      </div>
    </header>
  );
}
