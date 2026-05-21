import { ANNIX_PALETTE } from "./tokens";

/**
 * Square orbital AN monogram — the Annix Orbit icon.
 *
 * Faithful reproduction of the canonical onboarding-card spec:
 *   - Thin white orbital ring (one ring, behind A, crossing N via z-order)
 *   - Orange filled A (block letterform with crossbar) on the left
 *   - White filled N (block letterform) on the right
 *   - Single bright orange satellite at the top-right of the ring with glow
 *
 * Use on buttons, badges, hero cards, app icons. The full lockup lives in
 * `AnnixOrbitLogo`; the horizontal navbar lockup in `AnnixOrbitNavbar`.
 *
 * Size is controlled by the caller via `className` (e.g. `w-32 h-32`).
 * Pass `withBackground` to render the navy rounded-square surface.
 */
export function AnnixOrbitIcon({
  className,
  style,
  withBackground = false,
  title = "Annix Orbit",
}: {
  className?: string;
  style?: React.CSSProperties;
  withBackground?: boolean;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2000 2000"
      className={className}
      style={style}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="ao-icon-particle-bright" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF0CC" />
          <stop offset="35%" stopColor={ANNIX_PALETTE.orangeLight} />
          <stop offset="100%" stopColor={ANNIX_PALETTE.orange} />
        </radialGradient>
        <linearGradient id="ao-icon-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={ANNIX_PALETTE.navy} />
          <stop offset="100%" stopColor={ANNIX_PALETTE.navyDark} />
        </linearGradient>
        <filter id="ao-icon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {withBackground ? (
        <rect x="0" y="0" width="2000" height="2000" rx="200" fill="url(#ao-icon-bg)" />
      ) : null}

      {/* Orbit ring (BEHIND A) — drawn before the letters so A occludes it. */}
      <circle
        cx="1000"
        cy="1000"
        r="800"
        fill="none"
        stroke={ANNIX_PALETTE.white}
        strokeWidth="32"
        opacity="0.95"
      />

      {/* Orange A — block letterform with crossbar near lower third */}
      <path
        d="M 900 240
           L 580 1740
           L 760 1740
           L 820 1450
           L 1080 1450
           L 1140 1740
           L 1320 1740
           L 1000 240 Z
           M 850 1280
           L 1050 1280
           L 950 800 Z"
        fill={ANNIX_PALETTE.orange}
        fillRule="evenodd"
      />

      {/* White N — block letterform with diagonal connector */}
      <path
        d="M 1380 280
           L 1580 280
           L 1580 920
           L 1780 280
           L 1980 280
           L 1980 1740
           L 1780 1740
           L 1780 1100
           L 1580 1740
           L 1380 1740 Z"
        fill={ANNIX_PALETTE.white}
      />

      {/* Orbit ARC re-drawn ON TOP of the N so the ring visibly crosses it
          (the "one orbit crossing N" half of the spec). */}
      <path
        d="M 1700 380 A 800 800 0 0 1 1700 1620"
        fill="none"
        stroke={ANNIX_PALETTE.white}
        strokeWidth="32"
        opacity="0.95"
      />

      {/* Bright top-right satellite with glow halo */}
      <circle
        cx="1580"
        cy="420"
        r="62"
        fill="url(#ao-icon-particle-bright)"
        filter="url(#ao-icon-glow)"
      />
    </svg>
  );
}
