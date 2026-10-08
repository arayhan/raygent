import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { id } from './id';
import type { Dict, Lang } from './types';

const DICTS: Record<Lang, Dict> = { en, id };
const STORAGE_KEY = 'raygent-lang';

const isLang = (v: unknown): v is Lang => v === 'en' || v === 'id';

/**
 * First language, in order: ?lang= in the URL (a shared link wins), the
 * visitor's saved choice, an Indonesian browser, then English.
 */
export function detectLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // storage blocked: fall through
  }
  const browser = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browser.some((l) => l?.toLowerCase().startsWith('id')) ? 'id' : 'en';
}

interface LanguageContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const Ctx = createContext<LanguageContext>({ lang: 'en', setLang: () => {}, t: en });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const t = DICTS[lang];

  // Keep the document in step: lang attribute, title and description.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description);
  }, [lang, t]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked: the URL still carries the choice
    }
    // English is the default, so it keeps the clean URL; Indonesian is shareable.
    const url = new URL(window.location.href);
    if (next === 'en') url.searchParams.delete('lang');
    else url.searchParams.set('lang', next);
    window.history.replaceState(window.history.state, '', url);
  }, []);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  return useContext(Ctx);
}

/** The current dictionary. */
export function useT(): Dict {
  return useContext(Ctx).t;
}
