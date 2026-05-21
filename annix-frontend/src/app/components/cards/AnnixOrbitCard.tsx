import Link from "next/link";
import { AnnixOrbitLogo } from "../branding/AnnixOrbitLogo";
import { ANNIX_BG_GRADIENT, ANNIX_FONT_BODY, ANNIX_PALETTE } from "../branding/tokens";

/**
 * Full Annix Orbit launcher card — the canonical onboarding-card lockup
 * framed in the navy brand surface, with a "Get started" CTA. Faithful
 * reproduction of the brand-guidelines card on Annix Hub.
 *
 * Variants:
 *   - `dark`        (default) — navy gradient backdrop
 *   - `light`                 — light surface
 *   - `transparent`           — no backdrop, inherits page background
 *
 * Sizing is controlled by the caller via `className` (give it width /
 * height / aspect-ratio classes). The card centers its content.
 */
type CardVariant = "dark" | "light" | "transparent";

export function AnnixOrbitCard({
  className,
  variant = "dark",
  showTagline = true,
  ctaHref,
  ctaLabel = "Get started",
}: {
  className?: string;
  variant?: CardVariant;
  showTagline?: boolean;
  /** Optional CTA destination. If omitted, no CTA is rendered. */
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const logoVariant: "onDark" | "onLight" | "transparent" =
    variant === "dark" ? "onDark" : variant === "light" ? "onLight" : "transparent";

  const surfaceStyle =
    variant === "dark"
      ? { background: ANNIX_BG_GRADIENT, color: ANNIX_PALETTE.white }
      : variant === "light"
        ? { background: "#FFFFFF", color: ANNIX_PALETTE.slate }
        : undefined;

  const borderColor = variant === "dark" ? "rgba(255, 138, 0, 0.25)" : "rgba(0, 27, 143, 0.18)";

  return (
    <div
      className={`flex flex-col items-center justify-between rounded-2xl shadow-xl border-2 overflow-hidden ${
        className ?? ""
      }`}
      style={{ ...surfaceStyle, borderColor }}
    >
      <AnnixOrbitLogo variant={logoVariant} showTagline={showTagline} className="w-full" />

      {ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-2 mb-8 inline-flex items-center gap-1 text-sm font-semibold hover:translate-x-1 transition-transform"
          style={{
            color: variant === "light" ? ANNIX_PALETTE.orange : ANNIX_PALETTE.orangeLight,
            fontFamily: ANNIX_FONT_BODY,
          }}
        >
          {ctaLabel}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}
