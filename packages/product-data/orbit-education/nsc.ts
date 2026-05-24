/**
 * South African NSC (National Senior Certificate) achievement scale — the
 * substrate every SA university scoring scheme builds on.
 *
 * Source: DBE/Umalusi 7-level achievement scale (corroborated via Nuffic SA
 * education system). Confidence: HIGH. Re-verify the band edges against the
 * current DBE NSC policy before each admissions cycle.
 *
 * CRITICAL: institutions diverge on whether they consume the raw PERCENTAGE
 * (UCT FPS, Stellenbosch aggregate) or the LEVEL (Wits APS). This module
 * exposes both directions so a scoring strategy can pick what it needs.
 */

export interface NscAchievementLevel {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  minPercent: number;
  maxPercent: number;
  descriptor: string;
}

export const NSC_ACHIEVEMENT_LEVELS: readonly NscAchievementLevel[] = [
  { level: 7, minPercent: 80, maxPercent: 100, descriptor: "Outstanding achievement" },
  { level: 6, minPercent: 70, maxPercent: 79, descriptor: "Meritorious achievement" },
  { level: 5, minPercent: 60, maxPercent: 69, descriptor: "Substantial achievement" },
  { level: 4, minPercent: 50, maxPercent: 59, descriptor: "Adequate achievement" },
  { level: 3, minPercent: 40, maxPercent: 49, descriptor: "Moderate achievement" },
  { level: 2, minPercent: 30, maxPercent: 39, descriptor: "Elementary achievement" },
  { level: 1, minPercent: 0, maxPercent: 29, descriptor: "Not achieved" },
] as const;

export type NscLevel = NscAchievementLevel["level"];

/** Map a raw subject percentage to its NSC achievement level (1–7). */
export function nscLevelForPercent(percent: number): NscLevel {
  const clamped = Math.max(0, Math.min(100, percent));
  const match = NSC_ACHIEVEMENT_LEVELS.find(
    (band) => clamped >= band.minPercent && clamped <= band.maxPercent,
  );
  // The bands are exhaustive over 0–100, so a match always exists.
  return match ? match.level : 1;
}

export function nscBandForLevel(level: NscLevel): NscAchievementLevel {
  const match = NSC_ACHIEVEMENT_LEVELS.find((band) => band.level === level);
  if (!match) {
    throw new Error(`Invalid NSC level: ${level}`);
  }
  return match;
}
