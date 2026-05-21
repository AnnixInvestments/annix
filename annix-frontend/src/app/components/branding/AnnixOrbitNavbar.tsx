import { AnnixOrbitIcon } from "./AnnixOrbitIcon";
import { ANNIX_FONT_DISPLAY, ANNIX_PALETTE } from "./tokens";

/**
 * Horizontal Annix Orbit lockup for app navbars / headers.
 *
 *   [ orbit-icon ]  ANNIX  ORBIT
 *
 * Compact: no subtitle, no tagline, no background. Designed to sit
 * inside an existing dark navbar at ~40-56px tall. Pass `onLight` if
 * the navbar background is light.
 */
export function AnnixOrbitNavbar({
  className,
  onLight = false,
  href,
}: {
  className?: string;
  onLight?: boolean;
  /** Optional href — if provided, wraps the lockup in a Link-style anchor. */
  href?: string;
}) {
  const wordmarkColor = onLight ? ANNIX_PALETTE.navy : ANNIX_PALETTE.white;

  const lockup = (
    <div className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <AnnixOrbitIcon className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" />
      <div className="flex flex-col leading-none">
        <span
          className="text-lg sm:text-xl font-extrabold tracking-[0.18em]"
          style={{ color: wordmarkColor, fontFamily: ANNIX_FONT_DISPLAY }}
        >
          ANNIX
        </span>
        <span
          className="text-[10px] sm:text-xs font-bold tracking-[0.35em] mt-0.5"
          style={{ color: ANNIX_PALETTE.orange, fontFamily: ANNIX_FONT_DISPLAY }}
        >
          ORBIT
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline">
        {lockup}
      </a>
    );
  }
  return lockup;
}
