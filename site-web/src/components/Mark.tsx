export type MarkValue = 'yes' | 'partly' | 'no';

/** Comparison mark: full ring (yes), half ring (partly), dash (no). The word is always read out. */
export function Mark({ value }: { value: MarkValue }) {
  return (
    <span className="inline-flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {value === 'yes' && (
          <>
            <circle cx="9" cy="9" r="6.5" fill="none" stroke="var(--color-cyan)" strokeWidth="2" />
            <circle cx="9" cy="9" r="2.4" fill="var(--color-cyan)" />
          </>
        )}
        {value === 'partly' && (
          <>
            <circle cx="9" cy="9" r="6.5" fill="none" stroke="var(--color-hairline)" strokeWidth="1" />
            <path d="M9 2.5 A6.5 6.5 0 0 0 9 15.5" fill="none" stroke="var(--color-cyan-dim)" strokeWidth="2" />
          </>
        )}
        {value === 'no' && <line x1="4.5" y1="9" x2="13.5" y2="9" stroke="var(--color-signal-mute)" strokeWidth="2" />}
      </svg>
      <span className="sr-only-x">{value === 'yes' ? 'yes' : value === 'partly' ? 'partly' : 'no'}</span>
    </span>
  );
}
