// The raygent mark (site-web/MASTER.md, Components > Mark): the agent prompt
// chevron on the blue tile, its cursor a yellow dot. The dot carries the
// pulse, so the page's one authored ambient motion reads as a blinking
// cursor (see styles.css). At 32px and below it draws the heavy version.
export function RingMark({ size = 36 }: { size?: number }) {
  const small = size <= 32;
  return (
    <svg className="ring-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#3d6bf0" />
      <path
        d={small ? 'M20 19 L33 32 L20 45' : 'M20 20 L32 32 L20 44'}
        fill="none"
        stroke="#ffffff"
        strokeWidth={small ? 9.5 : 7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="pulse" cx={small ? 45 : 44} cy={small ? 45 : 44} r={small ? 6.5 : 5} fill="#f5c431" />
    </svg>
  );
}
