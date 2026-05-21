/**
 * Annix Orbit branding components.
 *
 * Two surfaces:
 *   - <AnnixOrbitImage>   — renders the rendered JPEG/PNG logo from
 *                           /public. Use this on the hub card and the
 *                           module splash — it's pixel-perfect to the
 *                           generated artwork.
 *   - <AnnixOrbitMark>    — compact SVG monogram (orbit + AN). Use this
 *                           where the rendered image would be too heavy
 *                           or where we need a transparent vector (nav
 *                           badges, favicons, small icons).
 *
 * The JPEG lives at `annix-frontend/public/annix-orbit-logo.jpeg`. If
 * the file is missing the <img> tag will silently 404; swap in the SVG
 * mark by passing `fallback` if you want a guaranteed visual.
 *
 * Colours are locked to the Annix palette (#001B8F navy, #FF8A00 →
 * #FFA500 orange) so the brand stays consistent across hub, module,
 * and future surfaces.
 */

const ANNIX_NAVY = "#001B8F";
const ANNIX_NAVY_DARK = "#00135F";
const ANNIX_ORANGE = "#FF8A00";
const ANNIX_ORANGE_LIGHT = "#FFA500";

const LOGO_SRC = "/annix-orbit-logo.jpeg";

/**
 * Rendered JPEG/PNG logo from /public. Use this on the hub card and any
 * surface where the full brand lockup belongs. Plain `<img>` (not
 * next/image) so the file can be swapped without rebuild and a missing
 * file degrades to a broken-image icon rather than a build error.
 */
export function AnnixOrbitImage({
  className,
  alt = "Annix Orbit — Hiring, Talent, Compliance",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={className}
      style={{ objectFit: "contain" }}
      // biome-ignore lint/performance/noImgElement: deliberate, see comment above
    />
  );
}

/**
 * Compact orbit-ring + AN monogram in SVG. Use where the rendered
 * image would be wasteful (favicons, small badges) or where a
 * transparent vector is needed. Both letters of the AN monogram are
 * drawn explicitly so they stay visible at any size.
 */
export function AnnixOrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 200"
      className={className}
      aria-label="Annix Orbit"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Annix Orbit</title>
      <defs>
        <radialGradient id="annix-orbit-glow-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD9A8" />
          <stop offset="60%" stopColor={ANNIX_ORANGE_LIGHT} />
          <stop offset="100%" stopColor={ANNIX_ORANGE} />
        </radialGradient>
        <radialGradient id="annix-orbit-side-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ANNIX_ORANGE_LIGHT} />
          <stop offset="100%" stopColor={ANNIX_ORANGE} />
        </radialGradient>
        <filter id="annix-orbit-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Orbital ring */}
      <circle
        cx="110"
        cy="100"
        r="92"
        fill="none"
        stroke={ANNIX_ORANGE}
        strokeWidth="4"
        opacity="0.9"
      />

      {/* Orange A — three strokes forming the iconic angular shape */}
      <g
        stroke={ANNIX_ORANGE}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <line x1="78" y1="42" x2="36" y2="166" />
        <line x1="78" y1="42" x2="120" y2="166" />
        <line x1="56" y1="122" x2="100" y2="122" strokeWidth="13" />
      </g>

      {/* White N — sits to the right of the A, both visible */}
      <g stroke="#FFFFFF" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="132" y1="44" x2="132" y2="166" />
        <line x1="132" y1="44" x2="188" y2="166" />
        <line x1="188" y1="44" x2="188" y2="166" />
      </g>

      {/* Glowing orbiting particle — top right */}
      <circle
        cx="200"
        cy="48"
        r="10"
        fill="url(#annix-orbit-glow-dot)"
        filter="url(#annix-orbit-glow)"
      />

      {/* Smaller orbiting particle — bottom left */}
      <circle cx="20" cy="152" r="7" fill="url(#annix-orbit-side-dot)" />
    </svg>
  );
}

/**
 * Full lockup combining the rendered image with the navy brand
 * background. Use on the module home / login splash. The image carries
 * the typography + tagline already, so the wrapper just provides the
 * navy gradient context.
 */
export function AnnixOrbitLogo({
  className,
  transparent = false,
}: {
  className?: string;
  transparent?: boolean;
}) {
  const containerStyle = transparent
    ? undefined
    : {
        background: `linear-gradient(180deg, ${ANNIX_NAVY} 0%, ${ANNIX_NAVY_DARK} 100%)`,
      };

  return (
    <div
      className={`flex items-center justify-center px-6 py-8 ${
        transparent ? "" : "rounded-2xl"
      } ${className ?? ""}`}
      style={containerStyle}
    >
      <AnnixOrbitImage className="max-w-md w-full h-auto" />
    </div>
  );
}

export const ANNIX_BRAND = {
  navy: ANNIX_NAVY,
  navyDark: ANNIX_NAVY_DARK,
  orange: ANNIX_ORANGE,
  orangeLight: ANNIX_ORANGE_LIGHT,
  logoPath: LOGO_SRC,
} as const;
