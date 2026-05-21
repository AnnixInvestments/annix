import { AnnixOrbitIcon } from "./AnnixOrbitIcon";
import {
  ANNIX_BG_GRADIENT,
  ANNIX_FONT_BODY,
  ANNIX_FONT_DISPLAY,
  ANNIX_PALETTE,
  ANNIX_TRACKING,
} from "./tokens";

/**
 * Full Annix Orbit brand lockup — the canonical onboarding-card design.
 *
 *   [orbital AN icon]
 *      ANNIX        (Exo 2 ExtraBold, white,   +12 tracking)
 *   ─  ORBIT  ─     (Exo 2 SemiBold,  orange,  +10 tracking, +30% scale)
 *   HIRING • TALENT • COMPLIANCE   (Inter Medium, white 80%)
 *   The intelligent workforce ecosystem for modern hiring, talent growth,
 *   and compliance. AI screening, reference checks, and job matching.
 *                                  (Inter Regular, white 70%)
 *
 * Variants:
 *   - `onDark`        (default) — navy gradient backdrop
 *   - `onLight`                 — white surface, navy wordmark
 *   - `transparent`             — no backdrop, inherits page background
 */
type LogoVariant = "onDark" | "onLight" | "transparent";

export function AnnixOrbitLogo({
  className,
  variant = "onDark",
  showTagline = true,
}: {
  className?: string;
  variant?: LogoVariant;
  showTagline?: boolean;
}) {
  const onLight = variant === "onLight";
  const transparent = variant === "transparent";

  const wordmarkColor = onLight ? ANNIX_PALETTE.navy : ANNIX_PALETTE.white;
  const subtitleColor = onLight ? ANNIX_PALETTE.slate : ANNIX_PALETTE.white80;
  const taglineColor = onLight ? ANNIX_PALETTE.slate : ANNIX_PALETTE.white70;

  return (
    <div
      className={`flex flex-col items-center text-center ${
        transparent ? "" : "rounded-2xl px-8 py-10"
      } ${className ?? ""}`}
      style={transparent ? undefined : { background: onLight ? "#FFFFFF" : ANNIX_BG_GRADIENT }}
    >
      <AnnixOrbitIcon className="w-40 h-40 sm:w-48 sm:h-48" />

      {/* ANNIX — Exo 2 ExtraBold, tracking +12. Bi-colour X overlay paints
          the right diagonal in brand orange. Gap to icon reduced ~20% via
          `mt-3` (was `mt-4`). */}
      <div
        className="mt-3 inline-flex items-baseline text-5xl sm:text-6xl leading-none"
        style={{
          color: wordmarkColor,
          fontFamily: ANNIX_FONT_DISPLAY,
          fontWeight: 800,
          letterSpacing: ANNIX_TRACKING.annix,
        }}
      >
        <span>ANNI</span>
        <span className="relative">
          <span>X</span>
          <span
            aria-hidden
            className="absolute inset-0 overflow-hidden"
            style={{
              color: ANNIX_PALETTE.orange,
              clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
            }}
          >
            X
          </span>
        </span>
      </div>

      {/* ORBIT — Exo 2 SemiBold, orange, +10 tracking, scaled ~30% larger
          than previous (3xl/4xl → 4xl/5xl). Orange rules flank it. */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <span
          className="h-px w-14 sm:w-20"
          style={{ backgroundColor: ANNIX_PALETTE.orange, opacity: 0.9 }}
        />
        <div
          className="text-4xl sm:text-5xl"
          style={{
            color: ANNIX_PALETTE.orange,
            fontFamily: ANNIX_FONT_DISPLAY,
            fontWeight: 600,
            letterSpacing: ANNIX_TRACKING.orbit,
          }}
        >
          ORBIT
        </div>
        <span
          className="h-px w-14 sm:w-20"
          style={{ backgroundColor: ANNIX_PALETTE.orange, opacity: 0.9 }}
        />
      </div>

      {/* HIRING • TALENT • COMPLIANCE — Inter Medium, white 80%. */}
      <div
        className="mt-4 text-xs sm:text-sm uppercase"
        style={{
          color: subtitleColor,
          fontFamily: ANNIX_FONT_BODY,
          fontWeight: 500,
          letterSpacing: ANNIX_TRACKING.subtitle,
        }}
      >
        HIRING <span style={{ color: ANNIX_PALETTE.orange }}>&bull;</span> TALENT{" "}
        <span style={{ color: ANNIX_PALETTE.orange }}>&bull;</span> COMPLIANCE
      </div>

      {/* Description — Inter Regular, white 70%. Full canonical wording. */}
      {showTagline ? (
        <p
          className="mt-5 text-sm sm:text-base max-w-md leading-relaxed"
          style={{ color: taglineColor, fontFamily: ANNIX_FONT_BODY, fontWeight: 400 }}
        >
          The intelligent workforce ecosystem for modern hiring, talent growth, and compliance. AI
          screening, reference checks, and job matching.
        </p>
      ) : null}
    </div>
  );
}
