// PVC pipe pricing + pipe-length helpers. Mirrors the HDPE
// `pricing.ts` shape so the consolidation pipeline can reuse the
// joint-count / waste / optimal-config logic without per-material
// branching.

import type { PvcPressureClass } from "./index";

export type StandardPvcPipeLength = 5.8 | 6.0;

export interface PvcPipeLengthInfo {
  lengthM: number;
  description: string;
  /**
   * Inclusive DN range over which this length is the SA convention
   * across the major manufacturers. Source: Flo-Tek, Marley, Macneil
   * catalogues — DN 20 → 250 ships in 6.0 m effective length, DN 315
   * → 500 in 5.8 m (the difference is a 100 mm × 2 socket allowance
   * factored into the larger sizes).
   */
  dnRange: { minMm: number; maxMm: number };
}

export const PVC_STANDARD_PIPE_LENGTHS: PvcPipeLengthInfo[] = [
  {
    lengthM: 6.0,
    description: "Standard 6 m effective length (DN 20–250)",
    dnRange: { minMm: 20, maxMm: 250 },
  },
  {
    lengthM: 5.8,
    description: "Standard 5.8 m effective length (DN 315–630)",
    dnRange: { minMm: 315, maxMm: 630 },
  },
];

// PVC is never coiled — straight lengths only across all DNs.
export const PVC_COILS_AVAILABLE = false;

export const standardPvcPipeLengthForDn = (dnMm: number): StandardPvcPipeLength => {
  const match = PVC_STANDARD_PIPE_LENGTHS.find(
    (l) => dnMm >= l.dnRange.minMm && dnMm <= l.dnRange.maxMm,
  );
  return (match?.lengthM as StandardPvcPipeLength) ?? 6.0;
};

export interface PvcJointCountResult {
  pipeLengthsNeeded: number;
  standardLengthM: number;
  jointCount: number;
  wasteM: number;
  wastePct: number;
}

export const calculatePvcJointCount = (
  totalLengthM: number,
  standardLengthM: StandardPvcPipeLength = 6.0,
): PvcJointCountResult => {
  if (totalLengthM <= 0) {
    return {
      pipeLengthsNeeded: 0,
      standardLengthM,
      jointCount: 0,
      wasteM: 0,
      wastePct: 0,
    };
  }
  const pipeLengthsNeeded = Math.ceil(totalLengthM / standardLengthM);
  const jointCount = pipeLengthsNeeded > 0 ? pipeLengthsNeeded - 1 : 0;
  const actualLengthM = pipeLengthsNeeded * standardLengthM;
  const wasteM = actualLengthM - totalLengthM;
  const wastePct = totalLengthM > 0 ? (wasteM / actualLengthM) * 100 : 0;
  return {
    pipeLengthsNeeded,
    standardLengthM,
    jointCount,
    wasteM: Math.round(wasteM * 100) / 100,
    wastePct: Math.round(wastePct * 10) / 10,
  };
};

// Default pressure class to assume when a project's working pressure
// is unstated. Class 16 covers ~85 % of SA pressure-water reticulation
// jobs and is the most-stocked class across the catalogues.
export const DEFAULT_PVC_PRESSURE_CLASS: PvcPressureClass = 16;
