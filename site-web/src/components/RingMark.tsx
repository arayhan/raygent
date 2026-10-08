/** The dashboard's ring motif: a static outer ring, a segmented mid ring, a core. */
export function RingMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={className}
    >
      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-signal-white)" strokeOpacity="0.55" strokeWidth="1" />
      <circle
        cx="18"
        cy="18"
        r="11"
        fill="none"
        stroke="var(--color-signal-white)"
        strokeWidth="2"
        strokeDasharray="12 5.3"
        transform="rotate(-90 18 18)"
      />
      <circle cx="18" cy="18" r="3.2" fill="var(--color-blue)" />
    </svg>
  );
}
