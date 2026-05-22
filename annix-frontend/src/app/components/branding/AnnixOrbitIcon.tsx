import { ANNIX_PALETTE } from "./tokens";

/**
 * Annix Orbit icon — square orbital AN monogram.
 *
 * Renders the canonical artwork from
 * `public/branding/annix-orbit-icon.png` (a square crop of the full
 * brand lockup). That JPEG IS the brand mark — no SVG approximation.
 *
 * Browsers handle scaling cleanly from a 440×440 source down to favicon
 * sizes (16-32 px) and up to hero sizes (192 px+). The icon's corners
 * are slightly rounded (iOS/Android app-icon style) so it reads as a
 * unified shape rather than a hard-edged photo rectangle.
 *
 * Sizing is controlled by the caller via `className` (e.g. `w-32 h-32`).
 * Pass `withBackground` to wrap the mark in the navy rounded-square
 * brand surface (favicon-with-backdrop / app-icon contexts).
 * Pass `square` to disable the rounded corners (e.g. preview snapshots).
 */
export function AnnixOrbitIcon({
  className,
  style,
  withBackground = false,
  square = false,
  title = "Annix Orbit",
}: {
  className?: string;
  style?: React.CSSProperties;
  withBackground?: boolean;
  /** Disable the default rounded corners. */
  square?: boolean;
  title?: string;
}) {
  // Use a relative corner radius so it scales with the icon — 18 % of the
  // shorter side is roughly the iOS app-icon proportion (squircle-ish).
  const cornerStyle: React.CSSProperties = square ? {} : { borderRadius: "18%" };

  if (withBackground) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className ?? ""}`}
        style={{ backgroundColor: ANNIX_PALETTE.orange, ...cornerStyle, ...style }}
      >
        <img
          src="/branding/annix-orbit-icon.png"
          alt={title}
          className="w-[98%] h-[98%] object-contain"
          style={cornerStyle}
        />
      </span>
    );
  }

  return (
    <img
      src="/branding/annix-orbit-icon.png"
      alt={title}
      className={className}
      style={{ objectFit: "contain", ...cornerStyle, ...style }}
    />
  );
}
