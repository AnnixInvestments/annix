import { AnnixOrbitIcon } from "./AnnixOrbitIcon";
import { ANNIX_BG_GRADIENT, ANNIX_FONT_BODY, ANNIX_FONT_DISPLAY, ANNIX_PALETTE } from "./tokens";

/**
 * Full Annix Orbit brand lockup: orbital AN monogram above the ANNIX
 * wordmark, ORBIT eyebrow with orange rules, HIRING • TALENT • COMPLIANCE
 * subtitle, and tagline. Use on the module home / login splash / marketing
 * surfaces — anywhere the brand needs to introduce itself in full.
 *
 * Variants:
 *   - `variant="onDark"`   (default) — assumes a navy / dark backdrop; uses
 *                                      white wordmark + light text
 *   - `variant="onLight"`            — for light backgrounds; uses navy
 *                                      wordmark + dark text
 *   - `variant="transparent"`        — no background, just the artwork
 *
 * `withBackground` (default true except for transparent) paints the navy
 * gradient surface around the lockup.
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
  const subtitleColor = onLight ? ANNIX_PALETTE.slate : ANNIX_PALETTE.silver;
  const taglineColor = onLight ? ANNIX_PALETTE.slate : ANNIX_PALETTE.grey;

  return (
    <div
      className={`flex flex-col items-center text-center ${
        transparent ? "" : "rounded-2xl px-8 py-10"
      } ${className ?? ""}`}
      style={transparent ? undefined : { background: onLight ? "transparent" : ANNIX_BG_GRADIENT }}
    >
      <AnnixOrbitIcon className="w-40 h-40 sm:w-48 sm:h-48" />

      <div
        className="mt-4 text-5xl sm:text-6xl font-extrabold tracking-[0.15em] leading-none"
        style={{ color: wordmarkColor, fontFamily: ANNIX_FONT_DISPLAY }}
      >
        ANNIX
      </div>

      <div className="flex items-center justify-center gap-3 mt-3">
        <span
          className="h-px w-12 sm:w-16"
          style={{ backgroundColor: ANNIX_PALETTE.orange, opacity: 0.7 }}
        />
        <div
          className="text-2xl sm:text-3xl font-bold tracking-[0.4em]"
          style={{ color: ANNIX_PALETTE.orange, fontFamily: ANNIX_FONT_DISPLAY }}
        >
          ORBIT
        </div>
        <span
          className="h-px w-12 sm:w-16"
          style={{ backgroundColor: ANNIX_PALETTE.orange, opacity: 0.7 }}
        />
      </div>

      <div
        className="mt-4 text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase"
        style={{ color: subtitleColor }}
      >
        HIRING <span style={{ color: ANNIX_PALETTE.orange }}>&bull;</span> TALENT{" "}
        <span style={{ color: ANNIX_PALETTE.orange }}>&bull;</span> COMPLIANCE
      </div>

      {showTagline ? (
        <p
          className="mt-5 text-sm sm:text-base max-w-md leading-relaxed"
          style={{ color: taglineColor, fontFamily: ANNIX_FONT_BODY }}
        >
          The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.
        </p>
      ) : null}
    </div>
  );
}
