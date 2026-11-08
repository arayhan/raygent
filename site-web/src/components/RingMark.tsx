/**
 * The raygent mark: a friendly dragon bust in void, rising out of an
 * electric-blue tile, with a signal-white eye. At 32px and below the horns
 * thicken, the eye grows and the nostril drops, so it still reads.
 */
export function RingMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  const small = size <= 32;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="16" fill="var(--color-blue)" />
      <path
        d="M17 64 C13 52 12 38 15 28 C18 21 24 18 31 20 L46 24 C52 26 53 34 47 36 L36 39 C32 41 31 48 32 64 Z"
        fill="var(--color-void)"
        stroke="var(--color-void)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g fill="none" stroke="var(--color-void)" strokeWidth={small ? 6.5 : 5.5} strokeLinecap="round">
        <path d="M20 22 C15 18 11 17 6 18" />
        <path d="M27 19 C25 14 22 12 17 11" />
      </g>
      <circle cx="27" cy="29" r={small ? 4.5 : 4} fill="var(--color-signal-white)" />
      {!small && <circle cx="46" cy="29.5" r="1.8" fill="var(--color-blue)" />}
    </svg>
  );
}
