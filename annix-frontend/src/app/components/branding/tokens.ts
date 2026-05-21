/**
 * Annix design-system tokens.
 *
 * The whole Annix ecosystem (Annix Orbit, future Annix Investments, Insights,
 * Sync, etc.) derives from a shared palette + the orbital-mark motif. Drop
 * these tokens at the top of any new branding component so we don't accumulate
 * a sea of slightly-off hex codes.
 */
export const ANNIX_PALETTE = {
  /** Primary deep navy — backgrounds, dark surfaces, ANNIX wordmark on light bgs */
  navy: "#001B8F",
  /** Darker navy used at the bottom of background gradients for depth */
  navyDark: "#00135F",
  /** Primary orange — orbit ring, ORBIT eyebrow, accent rules */
  orange: "#FF8A00",
  /** Brighter glow orange — orbital particles, hover states */
  orangeLight: "#FFA500",
  /** Pure white — ANNIX wordmark on dark bgs, N letter of monogram */
  white: "#FFFFFF",
  /** Light silver — subtitle text on dark bgs ("HIRING • TALENT • COMPLIANCE") */
  silver: "#E8EDF5",
  /** Medium grey — tagline / supporting text on dark bgs */
  grey: "#A7B0C0",
  /** Dark slate — body text on light bgs */
  slate: "#3B4455",
} as const;

/** CSS gradient used as the navy brand surface. */
export const ANNIX_BG_GRADIENT = `linear-gradient(180deg, ${ANNIX_PALETTE.navy} 0%, ${ANNIX_PALETTE.navyDark} 100%)`;

/** Font stack — load Exo 2 via next/font in app/layout.tsx so it isn't a FOUT. */
export const ANNIX_FONT_DISPLAY = '"Exo 2", "Inter", system-ui, sans-serif';
export const ANNIX_FONT_BODY = '"Inter", system-ui, sans-serif';
