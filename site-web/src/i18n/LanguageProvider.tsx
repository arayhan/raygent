import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import type { Dict, Lang } from './types';

const DICTS: Partial<Record<Lang, Dict>> = { en };

interface LanguageContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const Ctx = createContext<LanguageContext>({ lang: 'en', setLang: () => {}, t: en });

export function LanguageProvider({ children, dicts = DICTS, initial }: {
  children: ReactNode;
  dicts?: Partial<Record<Lang, Dict>>;
  initial: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(dicts[initial] ? initial : 'en');
  const t = dicts[lang] ?? en;

  // Keep the document in step with the language: lang attribute, title and
  // description, so a shared link and a screen reader both get the right one.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description);
  }, [lang, t]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
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
