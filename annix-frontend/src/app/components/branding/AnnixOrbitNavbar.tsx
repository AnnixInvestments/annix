import { AnnixOrbitIcon } from "./AnnixOrbitIcon";
import { ANNIX_FONT_DISPLAY, ANNIX_PALETTE, ANNIX_TRACKING } from "./tokens";

/**
 * Horizontal Annix Orbit lockup for app navbars / headers.
 *
 *   [ orbit-icon ]  ANNIX
 *                  ORBIT
 *
 * Compact: no subtitle, no description, no backdrop. Designed to sit in
 * an existing dark navbar at ~40-56px tall. Typography matches the
 * canonical spec (Exo 2 ExtraBold ANNIX, Exo 2 SemiBold ORBIT, bi-colour X).
 * Pass `onLight` if the navbar background is light.
 */
export function AnnixOrbitNavbar({
  className,
  onLight = false,
  href,
}: {
  className?: string;
  onLight?: boolean;
  /** Optional href — if provided, wraps the lockup in an anchor tag. */
  href?: string;
}) {
  const wordmarkColor = onLight ? ANNIX_PALETTE.navy : ANNIX_PALETTE.white;

  const lockup = (
    <div className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <AnnixOrbitIcon className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" />
      <div className="flex flex-col leading-none">
        <span
          className="inline-flex items-baseline text-lg sm:text-xl"
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
        </span>
        <span
          className="text-[11px] sm:text-sm mt-0.5"
          style={{
            color: ANNIX_PALETTE.orange,
            fontFamily: ANNIX_FONT_DISPLAY,
            fontWeight: 600,
            letterSpacing: ANNIX_TRACKING.orbit,
          }}
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
