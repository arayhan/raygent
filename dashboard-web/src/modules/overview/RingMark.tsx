// Small authored motif echoing raygent-avatar.jpg's glowing tech-rings --
// never the dragon itself, just its circuitry. Used in the header, the
// standby row, and (large, near-invisible) as a header watermark via CSS.
// The pulse is the page's one authored ambient motion (see styles.css).
export function RingMark({ size = 36 }: { size?: number }) {
  return (
    <svg className="ring-mark" width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="15.5" stroke="#2a3542" strokeWidth="1" />
      <circle className="pulse" cx="18" cy="18" r="6" stroke="#4fd3e8" strokeWidth="1.2" />
      <circle className="pulse" cx="18" cy="18" r="1.6" fill="#4fd3e8" />
    </svg>
  );
}
