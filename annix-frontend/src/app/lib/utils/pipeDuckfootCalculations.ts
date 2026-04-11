/**
 * Duckfoot Steelwork Calculations
 *
 * Extracted from pipeCalculations.ts (issue #191, Phase 7 megacomponent split).
 * Handles thrust force, bending moment, gusset sizing, and total steelwork
 * weight estimation for duckfoot fittings used to anchor large-bore pipe bends.
 */

import { STEEL_DENSITY_KG_CM3 } from "@annix/product-data/steel";

export interface DuckfootGussetConfig {
  nominalBoreMm: number;
  designPressureBar: number;
  basePlateXMm: number;
  basePlateYMm: number;
  ribHeightMm: number;
  gussetCount?: number;
  gussetThicknessMm?: number;
  plateThicknessMm?: number;
  ribThicknessMm?: number;
}

export interface DuckfootGussetResult {
  gussetCount: number;
  gussetThicknessMm: number;
  thrustForceKn: number;
  bendingMomentKnm: number;
  basePlateWeightKg: number;
  ribWeightKg: number;
  gussetWeightKg: number;
  totalSteelworkWeightKg: number;
  gussetWeldLengthMm: number;
  placementType: "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE";
}

export function calculateDuckfootThrustForce(params: {
  nominalBoreMm: number;
  designPressureBar: number;
}): { thrustForceN: number; thrustForceKn: number } {
  const insideDiameterM = params.nominalBoreMm / 1000;
  const pressurePa = params.designPressureBar * 100000;
  const areaM2 = (Math.PI * insideDiameterM ** 2) / 4;
  const thrustForceN = areaM2 * pressurePa;
  const thrustForceKn = thrustForceN / 1000;

  return { thrustForceN, thrustForceKn };
}

export function calculateDuckfootBendingMoment(params: {
  thrustForceKn: number;
  leverArmMm: number;
}): { bendingMomentNm: number; bendingMomentKnm: number } {
  const leverArmM = params.leverArmMm / 1000;
  const thrustForceN = params.thrustForceKn * 1000;
  const bendingMomentNm = thrustForceN * leverArmM;
  const bendingMomentKnm = bendingMomentNm / 1000;

  return { bendingMomentNm, bendingMomentKnm };
}

export function calculateDuckfootGussetThickness(params: {
  bendingMomentNm: number;
  gussetHeightMm: number;
  gussetBaseWidthMm: number;
  allowableStressMpa?: number;
}): number {
  const allowableStressPa = (params.allowableStressMpa ?? 250) * 1000000;
  const heightM = params.gussetHeightMm / 1000;
  const baseWidthM = params.gussetBaseWidthMm / 1000;

  const thicknessM = Math.sqrt(
    (6 * params.bendingMomentNm) / (allowableStressPa * heightM * baseWidthM),
  );
  const thicknessMm = thicknessM * 1000;

  return Math.ceil(thicknessMm / 2) * 2;
}

export function recommendDuckfootGussetCount(nominalBoreMm: number): {
  count: number;
  placementType: "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE";
} {
  if (nominalBoreMm <= 200) {
    return { count: 2, placementType: "HEEL_ONLY" };
  } else if (nominalBoreMm <= 500) {
    return { count: 4, placementType: "SYMMETRICAL" };
  } else {
    return { count: 6, placementType: "FULL_COVERAGE" };
  }
}

export function recommendDuckfootGussetThickness(params: {
  nominalBoreMm: number;
  designPressureBar: number;
}): number {
  const { nominalBoreMm, designPressureBar } = params;

  if (nominalBoreMm <= 100) {
    return designPressureBar <= 10 ? 6 : 8;
  } else if (nominalBoreMm <= 200) {
    return designPressureBar <= 10 ? 8 : 10;
  } else if (nominalBoreMm <= 350) {
    return designPressureBar <= 10 ? 12 : 14;
  } else if (nominalBoreMm <= 500) {
    return designPressureBar <= 16 ? 14 : 16;
  } else if (nominalBoreMm <= 700) {
    return designPressureBar <= 16 ? 18 : 20;
  } else if (nominalBoreMm <= 900) {
    return designPressureBar <= 20 ? 22 : 25;
  } else {
    return 25;
  }
}

export function calculateDuckfootSteelworkWeight(
  params: DuckfootGussetConfig,
): DuckfootGussetResult {
  const { nominalBoreMm, designPressureBar, basePlateXMm, basePlateYMm, ribHeightMm } = params;

  const { count: recommendedCount, placementType } = recommendDuckfootGussetCount(nominalBoreMm);
  const gussetCount = params.gussetCount ?? recommendedCount;

  const recommendedThickness = recommendDuckfootGussetThickness({
    nominalBoreMm,
    designPressureBar,
  });
  const gussetThicknessMm = params.gussetThicknessMm ?? recommendedThickness;

  const plateThicknessMm = params.plateThicknessMm ?? Math.max(10, gussetThicknessMm * 0.8);
  const ribThicknessMm = params.ribThicknessMm ?? Math.max(8, gussetThicknessMm * 0.6);

  const { thrustForceKn } = calculateDuckfootThrustForce({
    nominalBoreMm,
    designPressureBar,
  });

  const leverArmMm = nominalBoreMm * 0.7;
  const { bendingMomentKnm } = calculateDuckfootBendingMoment({
    thrustForceKn,
    leverArmMm,
  });

  const basePlateVolumeMm3 = basePlateXMm * basePlateYMm * plateThicknessMm;
  const basePlateVolumeCm3 = basePlateVolumeMm3 / 1000;
  const basePlateWeightKg = basePlateVolumeCm3 * STEEL_DENSITY_KG_CM3;

  const ribVolumeMm3 = basePlateXMm * ribHeightMm * ribThicknessMm;
  const ribVolumeCm3 = ribVolumeMm3 / 1000;
  const ribWeightKg = ribVolumeCm3 * STEEL_DENSITY_KG_CM3;

  const gussetBaseMm = Math.min(basePlateXMm, basePlateYMm) * 0.4;
  const gussetHeightMm = ribHeightMm * 0.8;
  const singleGussetAreaMm2 = (gussetBaseMm * gussetHeightMm) / 2;
  const singleGussetVolumeMm3 = singleGussetAreaMm2 * gussetThicknessMm;
  const singleGussetVolumeCm3 = singleGussetVolumeMm3 / 1000;
  const singleGussetWeightKg = singleGussetVolumeCm3 * STEEL_DENSITY_KG_CM3;
  const gussetWeightKg = singleGussetWeightKg * gussetCount;

  const totalSteelworkWeightKg = basePlateWeightKg + ribWeightKg + gussetWeightKg;

  const gussetHypotenuseMm = Math.sqrt(gussetBaseMm ** 2 + gussetHeightMm ** 2);
  const singleGussetWeldLengthMm = gussetBaseMm + gussetHeightMm + gussetHypotenuseMm;
  const gussetWeldLengthMm = singleGussetWeldLengthMm * gussetCount;

  return {
    gussetCount,
    gussetThicknessMm,
    thrustForceKn,
    bendingMomentKnm,
    basePlateWeightKg,
    ribWeightKg,
    gussetWeightKg,
    totalSteelworkWeightKg,
    gussetWeldLengthMm,
    placementType,
  };
}
