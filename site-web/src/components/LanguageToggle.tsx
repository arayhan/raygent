import { useLanguage } from '../i18n/LanguageProvider';
import type { Lang } from '../i18n/types';

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: 'en', label: 'EN', name: 'English' },
  { lang: 'id', label: 'ID', name: 'Bahasa Indonesia' },
];

/** EN | ID switch. Each option names its language in that language. */
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div role="group" aria-label={t.ui.language} className="flex items-center">
      {OPTIONS.map((o, i) => (
        <span key={o.lang} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1 text-hairline">
              |
            </span>
          )}
          <button
            type="button"
            lang={o.lang}
            aria-label={o.name}
            aria-pressed={lang === o.lang}
            onClick={() => setLang(o.lang)}
            className="tab px-2"
          >
            {o.label}
          </button>
        </span>
      ))}
    </div>
  );
}
