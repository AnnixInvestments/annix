/**
 * One row per Annix brand (annix-investments, annix-orbit, annix-insights,
 * annix-rep, annix-sentinel). Holds the full theming set so each brand's pages can
 * be re-skinned at runtime. Brands that don't use a given field simply ignore
 * it.
 */
export class AppBranding {
  brandCode: string;

  navbarColor: string;

  navbarColorLight: string;

  backgroundLight: string;

  backgroundDark: string;

  accentOrange: string;

  accentOrangeLight: string;

  accentOrangeDark: string;

  gradientFrom: string;

  gradientVia: string;

  gradientTo: string;

  tagline: string;

  description: string;

  heroWords: string;

  fontDisplay: string;

  fontHeadings: string;

  fontBody: string;

  logoIconPath: string | null;

  logoLockupPath: string | null;

  wordmarkPath: string | null;

  faviconPath: string | null;

  watermarkPath: string | null;

  textCropPath: string | null;

  subMarkPath: string | null;

  flashLinePath: string | null;

  heroImagePath: string | null;

  logoIconPathDark: string | null;

  logoLockupPathDark: string | null;

  wordmarkPathDark: string | null;

  faviconPathDark: string | null;

  watermarkPathDark: string | null;

  textCropPathDark: string | null;

  subMarkPathDark: string | null;

  flashLinePathDark: string | null;

  heroImagePathDark: string | null;

  loginCardPath: string | null;

  loginCardPathDark: string | null;

  pageBackgroundPath: string | null;

  pageBackgroundPathDark: string | null;

  heroTopPath: string | null;

  heroTopPathDark: string | null;

  heroBottomPath: string | null;

  heroBottomPathDark: string | null;

  watermarkEnabled: boolean;

  watermarkOpacity: number;

  watermarkMaxSizePx: number;

  loadingAnimation: string;

  heroTopHeightPct: number;

  heroBottomHeightPct: number;

  heroTopFadePct: number;

  heroBottomFadePct: number;

  inheritedFields: string[];

  createdAt: Date;

  updatedAt: Date;
}
