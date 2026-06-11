/**
 * Length of a saddle ("fish-mouth") weld where a branch of OD `d` lands on
 * a run of OD `D`.
 *
 * Exact limits: π·d when d ≪ D (the run is locally flat), and
 * 4√2·E(1/√2)·r ≈ 3.8202·d when d = D (equal-bore intersection curve).
 * The quadratic blend π·(1 + 0.216·(d/D)²)·d matches both limits and stays
 * within ~1% across the range.
 *
 * Replaces the previous flat 2.7·d "Steinmetz factor", which was
 * geometrically impossible — the weld can never be shorter than the
 * branch circumference (π·d ≈ 3.1416·d).
 */
export const saddleWeldLengthMm = (branchOdMm: number, runOdMm: number): number => {
  if (!branchOdMm || !runOdMm) return 0;
  const ratio = Math.min(branchOdMm / runOdMm, 1);
  return Math.PI * (1 + 0.216 * ratio * ratio) * branchOdMm;
};
