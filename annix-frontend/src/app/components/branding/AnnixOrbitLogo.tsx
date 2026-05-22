import { ANNIX_BG_GRADIENT } from "./tokens";

/**
 * Full Annix Orbit brand lockup.
 *
 * Renders the canonical PNG at `public/branding/annix-orbit-logo.png` —
 * the same artwork the launcher card uses. The lockup (icon + ANNIX
 * wordmark with bi-colour X + ORBIT eyebrow with orange rules +
 * HIRING • TALENT • COMPLIANCE row + tagline + "Get started" CTA) is
 * all baked into the image; the component just provides the surrounding
 * surface.
 *
 * Variants control the surface around the PNG:
 *   - `onDark`        (default) — navy gradient backdrop wraps the PNG
 *   - `onLight`                 — white surface wraps the PNG
 *   - `transparent`             — no backdrop, PNG floats on whatever's behind
 *
 * Use this anywhere you want the full brand lockup. For the hub launcher
 * card with the orange "Get started" CTA underneath, use `AnnixOrbitCard`
 * which adds the link.
 */
type LogoVariant = "onDark" | "onLight" | "transparent";

export function AnnixOrbitLogo({
  className,
  variant = "onDark",
}: {
  className?: string;
  variant?: LogoVariant;
  /** Kept for API compatibility — the canonical PNG always includes the
   *  tagline so this prop is now a no-op. */
  showTagline?: boolean;
}) {
  const onLight = variant === "onLight";
  const transparent = variant === "transparent";

  const surfaceStyle = transparent
    ? undefined
    : { background: onLight ? "#FFFFFF" : ANNIX_BG_GRADIENT };

  return (
    <div
      className={`flex flex-col items-center overflow-hidden ${
        transparent ? "" : "rounded-2xl"
      } ${className ?? ""}`}
      style={surfaceStyle}
    >
      <img
        src="/branding/annix-orbit-logo.png"
        alt="Annix Orbit — Hiring, Talent, Compliance. The intelligent workforce ecosystem for modern hiring, talent growth, and compliance."
        className="w-full h-auto block"
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
