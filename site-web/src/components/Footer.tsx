import { LINKS } from '../content/links';
import { RingMark } from './RingMark';
import type { ReactNode } from 'react';
import { BookOpen, Heart, Scale } from 'lucide-react';
import { GitHubMark, Icon } from './Icon';
import { useT } from '../i18n/LanguageProvider';

export function Footer() {
  const t = useT();
  const links: { href: string; label: string; icon: ReactNode }[] = [
    { href: LINKS.readme, label: t.footer.docs, icon: <Icon as={BookOpen} size={14} /> },
    { href: LINKS.repo, label: 'GitHub', icon: <GitHubMark size={14} /> },
    { href: LINKS.saweria, label: 'Saweria', icon: <Icon as={Heart} size={14} /> },
    { href: LINKS.license, label: t.footer.license, icon: <Icon as={Scale} size={14} /> },
  ];
  return (
    <footer className="page-x relative z-10 border-t border-hairline-soft">
      <div className="mx-auto grid max-w-(--container-page) gap-6 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center gap-3">
          <RingMark size={24} />
          <span className="font-display text-[18px] font-semibold tracking-[-0.01em]">raygent</span>
        </div>
        <nav aria-label={t.ui.footerLabel}>
          <ul className="m-0 flex list-none flex-wrap gap-x-7 gap-y-3 p-0">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="link-sweep label inline-flex items-center gap-2 py-2 hover:text-signal-white" target="_blank" rel="noreferrer">
                  {l.icon}
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="m-0 text-small text-signal-mute md:col-span-2">© 2026 Ahmed Rayhan Primadedas. {t.footer.released}</p>
      </div>
    </footer>
  );
}
