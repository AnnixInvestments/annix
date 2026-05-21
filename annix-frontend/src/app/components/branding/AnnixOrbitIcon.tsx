import { ANNIX_PALETTE } from "./tokens";

/**
 * Square orbital AN monogram — the Annix Orbit icon.
 *
 * Use on buttons, badges, hero cards, app icons. The full lockup (with
 * ANNIX ORBIT typography + tagline) lives in `AnnixOrbitLogo`; the
 * horizontal navbar variant in `AnnixOrbitNavbar`.
 *
 * Renders as a transparent square that fills its parent; the size is
 * controlled entirely by the caller's `className` (e.g. `w-32 h-32`).
 * Pass `withBackground` if you want the navy brand surface baked in.
 */
export function AnnixOrbitIcon({
  className,
  withBackground = false,
  title = "Annix Orbit",
}: {
  className?: string;
  withBackground?: boolean;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2000 2000"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="ao-icon-glow-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE8B8" />
          <stop offset="35%" stopColor={ANNIX_PALETTE.orangeLight} />
          <stop offset="100%" stopColor={ANNIX_PALETTE.orange} />
        </radialGradient>
        <radialGradient id="ao-icon-side-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ANNIX_PALETTE.orangeLight} />
          <stop offset="100%" stopColor={ANNIX_PALETTE.orange} />
        </radialGradient>
        <linearGradient id="ao-icon-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={ANNIX_PALETTE.navy} />
          <stop offset="100%" stopColor={ANNIX_PALETTE.navyDark} />
        </linearGradient>
        <filter id="ao-icon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {withBackground ? (
        <rect x="0" y="0" width="2000" height="2000" rx="180" fill="url(#ao-icon-bg)" />
      ) : null}

      {/* Orbital ring */}
      <circle
        cx="1000"
        cy="1000"
        r="860"
        fill="none"
        stroke={ANNIX_PALETTE.orange}
        strokeWidth="32"
        opacity="0.85"
      />

      {/* Orange A — three angular strokes */}
      <g
        stroke={ANNIX_PALETTE.orange}
        strokeWidth="140"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <line x1="830" y1="340" x2="490" y2="1640" />
        <line x1="830" y1="340" x2="1170" y2="1640" />
        <line x1="680" y1="1170" x2="980" y2="1170" strokeWidth="100" />
      </g>

      {/* White N — two verticals + diagonal, sits to the right of the A */}
      <g
        stroke={ANNIX_PALETTE.white}
        strokeWidth="130"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <line x1="1270" y1="380" x2="1270" y2="1640" />
        <line x1="1270" y1="380" x2="1700" y2="1640" />
        <line x1="1700" y1="380" x2="1700" y2="1640" />
      </g>

      {/* Glowing particle (top right) — visual anchor, suggests motion */}
      <circle cx="1820" cy="360" r="75" fill="url(#ao-icon-glow-dot)" filter="url(#ao-icon-glow)" />

      {/* Smaller particle (bottom left) — balances the composition */}
      <circle cx="180" cy="1680" r="55" fill="url(#ao-icon-side-dot)" />
    </svg>
  );
}
