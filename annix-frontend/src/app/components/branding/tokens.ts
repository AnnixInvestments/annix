/**
 * Annix Orbit design tokens — the canonical brand palette.
 *
 * Hex values are the OFFICIAL brand reference per the onboarding-card spec.
 * Do not "improve" or shift them. Sibling Annix products derive from these.
 */
export const ANNIX_PALETTE = {
  /** Primary Navy — the brand backdrop. */
  navy: "#001B8F",
  /** Dark Navy — bottom of vertical gradient for depth. */
  navyDark: "#00135F",
  /** Primary Orange — orbit ring, A monogram, ORBIT wordmark, accent rules. */
  orange: "#FF8A00",
  /** Glow Orange — orbiting satellite, hover states. */
  orangeLight: "#FFA500",
  /** Deeper orange used only inside the bright-satellite radial gradient. */
  orangeDeep: "#C9560A",
  /** Pure white — N monogram, ANNIX wordmark, headlines on dark. */
  white: "#FFFFFF",
  /** White at 80% — HIRING • TALENT • COMPLIANCE on dark (per spec). */
  white80: "rgba(255, 255, 255, 0.80)",
  /** White at 70% — description paragraph on dark (per spec). */
  white70: "rgba(255, 255, 255, 0.70)",
  /** Light silver — alternative subtitle colour. */
  silver: "#E8EDF5",
  /** Medium grey — supporting text on dark. */
  grey: "#A7B0C0",
  /** Dark slate — body text when rendered on light surfaces. */
  slate: "#3B4455",
} as const;

/** CSS gradient used as the navy brand surface. */
export const ANNIX_BG_GRADIENT = `linear-gradient(180deg, ${ANNIX_PALETTE.navy} 0%, ${ANNIX_PALETTE.navyDark} 100%)`;

/**
 * Font stacks — Exo 2 + Inter are loaded via next/font in the root layout
 * (annix-frontend/src/app/layout.tsx) and exposed as CSS variables. Using
 * the variable first guarantees the loaded weight is used; we fall back to
 * the bare family name in case the variable hasn't propagated yet, and
 * finally to a system stack.
 */
export const ANNIX_FONT_DISPLAY = 'var(--font-exo-2), "Exo 2", "Inter", system-ui, sans-serif';
export const ANNIX_FONT_BODY = 'var(--font-inter), "Inter", system-ui, sans-serif';

/**
 * Tailwind letter-spacing values mapped to the spec sheet:
 *   ANNIX  +12  →  0.12em
 *   ORBIT  +10  →  0.10em base, widened to 0.40em visually with em-dashes
 */
export const ANNIX_TRACKING = {
  annix: "0.12em",
  orbit: "0.40em",
  subtitle: "0.30em",
} as const;
