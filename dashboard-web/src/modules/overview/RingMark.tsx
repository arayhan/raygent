// The raygent mark (site-web/MASTER.md, Components > Mark): a friendly dragon
// bust in void on an electric-blue tile. The eye carries the pulse, so the
// page's one authored ambient motion reads as the dragon's eye glowing (see
// styles.css). At 32px and below it draws the small version.
export function RingMark({ size = 36 }: { size?: number }) {
  const small = size <= 32;
  return (
    <svg className="ring-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#5b8cff" />
      <path
        d="M17 64 C13 52 12 38 15 28 C18 21 24 18 31 20 L46 24 C52 26 53 34 47 36 L36 39 C32 41 31 48 32 64 Z"
        fill="#0a0d12"
        stroke="#0a0d12"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g fill="none" stroke="#0a0d12" strokeWidth={small ? 6.5 : 5.5} strokeLinecap="round">
        <path d="M20 22 C15 18 11 17 6 18" />
        <path d="M27 19 C25 14 22 12 17 11" />
      </g>
      <circle className="pulse" cx="27" cy="29" r={small ? 4.5 : 4} fill="#e7edf5" />
      {!small && <circle cx="46" cy="29.5" r="1.8" fill="#5b8cff" />}
    </svg>
  );
}
