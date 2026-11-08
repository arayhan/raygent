/**
 * The raygent mark: the agent prompt chevron on the blue tile, its cursor a
 * yellow dot. At 32px and below it draws the heavy version so it still reads.
 */
export function RingMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  const small = size <= 32;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="16" fill="var(--color-tile)" />
      <path
        d={small ? 'M20 19 L33 32 L20 45' : 'M20 20 L32 32 L20 44'}
        fill="none"
        stroke="var(--color-signal-white)"
        strokeWidth={small ? 9.5 : 7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={small ? 45 : 44} cy={small ? 45 : 44} r={small ? 6.5 : 5} fill="var(--color-yellow)" />
    </svg>
  );
}
