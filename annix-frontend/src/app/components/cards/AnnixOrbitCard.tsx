"use client";

import { brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import { ANNIX_BG_GRADIENT, ANNIX_FONT_BODY, ANNIX_PALETTE } from "../branding/tokens";

/**
 * Full Annix Orbit launcher card.
 *
 * Renders the canonical brand artwork directly from the rendered JPEG at
 * `public/branding/annix-orbit-logo.png`. That file IS the brand — the
 * SVG approximations under `components/branding/` are kept as fallbacks
 * for icon-only contexts (favicons, navbar) where an exact pixel
 * reproduction isn't worth the effort, but for the hub card we want the
 * actual generated artwork.
 *
 * ACTION REQUIRED to make this card show the brand: save your
 * "Annix Orbit Logo.jpeg" at
 *   annix-frontend/public/branding/annix-orbit-logo.png
 * If the file is missing, the card will show a broken-image icon — that's
 * intentional: a missing brand asset should be visibly missing, not
 * silently replaced with a worse approximation.
 *
 * Variants:
 *   - `dark`        (default) — navy gradient backdrop wrapping the image
 *   - `light`                 — light backdrop, image still tells the brand story
 *   - `transparent`           — no backdrop, inherits page background
 */
type CardVariant = "dark" | "light" | "transparent";

export function AnnixOrbitCard({
  className,
  variant = "dark",
  ctaHref,
  ctaLabel = "Get started",
  description,
}: {
  className?: string;
  variant?: CardVariant;
  /** If provided, a CTA pill is shown. Navigation is owned by the wrapping Link, not the card. */
  ctaHref?: string;
  ctaLabel?: string;
  /** Optional one-line description rendered below the logo. */
  description?: string;
}) {
  const surfaceStyle =
    variant === "dark"
      ? { background: ANNIX_BG_GRADIENT, color: ANNIX_PALETTE.white }
      : variant === "light"
        ? { background: "#FFFFFF", color: ANNIX_PALETTE.slate }
        : undefined;

  const borderColor = variant === "dark" ? "rgba(255, 138, 0, 0.25)" : "rgba(0, 27, 143, 0.18)";
  const descriptionColor = variant === "light" ? ANNIX_PALETTE.slate : "rgba(255, 255, 255, 0.7)";

  const brandingQuery = useBranding("annix-orbit");
  const brandingData = brandingQuery.data;
  const branding = brandingData || brandingFallback("annix-orbit");
  const lockupUrl = resolveBrandAssetUrl("logoLockup", branding);

  return (
    <div
      className={`flex flex-col items-center justify-between rounded-2xl shadow-xl border-2 overflow-hidden ${
        className ?? ""
      }`}
      style={{ ...surfaceStyle, borderColor }}
    >
      <img
        src={lockupUrl}
        alt="Annix Orbit — Hiring, Talent, Compliance. The intelligent workforce ecosystem for modern hiring, talent growth, and compliance."
        className="w-full h-auto block"
        style={{ objectFit: "contain" }}
      />

      {description ? (
        <p
          className="px-8 mt-2 text-sm text-center leading-relaxed"
          style={{ color: descriptionColor, fontFamily: ANNIX_FONT_BODY }}
        >
          {description}
        </p>
      ) : null}

      {ctaHref ? (
        <span
          className="mt-4 mb-8 inline-flex items-center gap-1 text-sm font-semibold group-hover:translate-x-1 transition-transform"
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
        </span>
      ) : null}
    </div>
  );
}
