import { useT } from '../i18n/LanguageProvider';

export type MarkValue = 'yes' | 'partly' | 'no';

/** Comparison mark: full ring (yes), half ring (partly), dash (no). The word is always read out. */
export function Mark({ value, accent = false }: { value: MarkValue; accent?: boolean }) {
  const t = useT();
  const yes = accent ? 'var(--color-blue)' : 'var(--color-signal-white)';
  return (
    <span className="inline-flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {value === 'yes' && (
          <>
            <circle cx="9" cy="9" r="6.5" fill="none" stroke={yes} strokeWidth="2" />
            <circle cx="9" cy="9" r="2.4" fill={yes} />
          </>
        )}
        {value === 'partly' && (
          <>
            <circle cx="9" cy="9" r="6.5" fill="none" stroke="var(--color-hairline)" strokeWidth="1" />
            <path d="M9 2.5 A6.5 6.5 0 0 0 9 15.5" fill="none" stroke="var(--color-signal-mute)" strokeWidth="2" />
          </>
        )}
        {value === 'no' && <line x1="4.5" y1="9" x2="13.5" y2="9" stroke="var(--color-hairline)" strokeWidth="2" />}
      </svg>
      <span className="sr-only-x">{t.ui.marks[value]}</span>
    </span>
  );
}
