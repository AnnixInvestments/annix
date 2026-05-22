import { AnnixOrbitIcon } from "./AnnixOrbitIcon";

/**
 * Horizontal Annix Orbit lockup for app navbars / headers.
 *
 *   [ orbit-icon ]  [ ANNIX ORBIT wordmark image ]
 *
 * Uses cropped wordmark PNGs sliced from the canonical full-logo PNG with
 * the navy background chroma-keyed to transparent, so the typography
 * (bi-colour X, orange rules around ORBIT, exact font shapes) matches the
 * canonical lockup. Two variants:
 *   - dark surface  → `annix-orbit-wordmark.png`        (white ANNIX)
 *   - light surface → `annix-orbit-wordmark-light.png`  (navy ANNIX)
 * The `onLight` prop picks the right one so the wordmark stays legible on
 * either surface.
 *
 * Compact: no subtitle, no description, no surrounding backdrop. Designed
 * to sit in a navbar at ~40-56 px tall.
 */
// Bump when the crop changes, to bust browser cache.
const WORDMARK_VERSION = 5;

export function AnnixOrbitNavbar({
  className,
  href,
  height = 48,
  onLight = false,
}: {
  className?: string;
  /** Optional href — wraps the lockup in an anchor tag if provided. */
  href?: string;
  /** Lockup height in px. Default 48 (matches a typical navbar). */
  height?: number;
  /** Light navbar surface → use the navy-text wordmark variant. */
  onLight?: boolean;
}) {
  // Wordmark crops are 345 × 78 → aspect ~4.42:1.
  const wordmarkAspect = 345 / 78;
  const wordmarkWidth = Math.round(height * wordmarkAspect);
  const wordmarkSrc = onLight
    ? `/branding/annix-orbit-wordmark-light.png?v=${WORDMARK_VERSION}`
    : `/branding/annix-orbit-wordmark.png?v=${WORDMARK_VERSION}`;

  const lockup = (
    <div className={`inline-flex items-center gap-3 ${className ?? ""}`} style={{ height }}>
      <AnnixOrbitIcon className="flex-shrink-0" style={{ width: height, height }} />
      <img
        src={wordmarkSrc}
        alt="Annix Orbit"
        style={{ height, width: wordmarkWidth, objectFit: "contain" }}
      />
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
