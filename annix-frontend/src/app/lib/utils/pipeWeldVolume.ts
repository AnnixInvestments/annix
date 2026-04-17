/**
 * Weld Volume Calculations
 *
 * Extracted from pipeCalculations.ts (issue #191, Phase 7 megacomponent split).
 * Handles fillet/butt/saddle weld cross-section and volume computation for
 * pipe fabrication. Output volumes feed into weld metal weight estimation.
 */

import { STEEL_DENSITY_KG_CM3 } from "@annix/product-data/steel";

export interface WeldVolumeConfig {
  filletLegSizeMm?: number;
  rootGapMm?: number;
  grooveAngleDeg?: number;
  reinforcementMm?: number;
}

export interface WeldVolumeResult {
  filletVolumeMm3: number;
  filletVolumeCm3: number;
  buttWeldVolumeMm3: number;
  buttWeldVolumeCm3: number;
  totalVolumeMm3: number;
  totalVolumeCm3: number;
  weldMetalWeightKg: number;
}

const DEFAULT_WELD_CONFIG: Required<WeldVolumeConfig> = {
  filletLegSizeMm: 6,
  rootGapMm: 3,
  grooveAngleDeg: 60,
  reinforcementMm: 2,
};

function filletWeldCrossSectionMm2(legSizeMm: number): number {
  return 0.5 * legSizeMm * legSizeMm;
}

function buttWeldCrossSectionMm2(
  wallThicknessMm: number,
  rootGapMm: number,
  grooveAngleDeg: number,
  reinforcementMm: number,
): number {
  const halfAngleRad = (grooveAngleDeg / 2) * (Math.PI / 180);
  const rootArea = wallThicknessMm * rootGapMm;
  const grooveArea = wallThicknessMm * wallThicknessMm * Math.tan(halfAngleRad);
  const capArea = reinforcementMm * wallThicknessMm * 0.5;
  return rootArea + grooveArea + capArea;
}

function calculateFilletWeldLegSize(wallThicknessMm: number): number {
  const legSize = wallThicknessMm * 0.7;
  return Math.max(3, Math.min(12, legSize));
}

export function calculateFlangeWeldVolume(params: {
  outsideDiameterMm: number;
  wallThicknessMm: number;
  numberOfFlangeWelds: number;
  config?: WeldVolumeConfig;
}): { volumeMm3: number; volumeCm3: number; legSizeMm: number; weldLengthMm: number } {
  const { outsideDiameterMm, wallThicknessMm, numberOfFlangeWelds, config } = params;
  const rawFilletLegSizeMm = config?.filletLegSizeMm;
  const legSizeMm = rawFilletLegSizeMm || calculateFilletWeldLegSize(wallThicknessMm);
  const circumferenceMm = Math.PI * outsideDiameterMm;
  const crossSectionMm2 = filletWeldCrossSectionMm2(legSizeMm);
  const weldLengthMm = circumferenceMm * 2 * numberOfFlangeWelds;
  const volumeMm3 = crossSectionMm2 * weldLengthMm;
  const volumeCm3 = volumeMm3 / 1000;

  return { volumeMm3, volumeCm3, legSizeMm, weldLengthMm };
}

export function calculateButtWeldVolume(params: {
  outsideDiameterMm: number;
  wallThicknessMm: number;
  numberOfButtWelds: number;
  config?: WeldVolumeConfig;
}): { volumeMm3: number; volumeCm3: number; weldLengthMm: number } {
  const { outsideDiameterMm, wallThicknessMm, numberOfButtWelds, config } = params;
  const rawRootGapMm = config?.rootGapMm;
  const rootGapMm = rawRootGapMm || DEFAULT_WELD_CONFIG.rootGapMm;
  const rawGrooveAngleDeg = config?.grooveAngleDeg;
  const grooveAngleDeg = rawGrooveAngleDeg || DEFAULT_WELD_CONFIG.grooveAngleDeg;
  const rawReinforcementMm = config?.reinforcementMm;
  const reinforcementMm = rawReinforcementMm || DEFAULT_WELD_CONFIG.reinforcementMm;

  const circumferenceMm = Math.PI * outsideDiameterMm;
  const crossSectionMm2 = buttWeldCrossSectionMm2(
    wallThicknessMm,
    rootGapMm,
    grooveAngleDeg,
    reinforcementMm,
  );
  const weldLengthMm = circumferenceMm * numberOfButtWelds;
  const volumeMm3 = crossSectionMm2 * weldLengthMm;
  const volumeCm3 = volumeMm3 / 1000;

  return { volumeMm3, volumeCm3, weldLengthMm };
}

// Steinmetz factor: Arc length of bicylindric curve for equal diameter cylinders at 90°
// L = 4r × ∫₀^(π/2) √[1 + sin²(θ)] dθ ≈ 2.701 × OD
const STEINMETZ_FACTOR = 2.7;

export function calculateSaddleWeldVolume(params: {
  branchOdMm: number;
  mainOdMm: number;
  wallThicknessMm: number;
  config?: WeldVolumeConfig;
}): { volumeMm3: number; volumeCm3: number; legSizeMm: number; weldLengthMm: number } {
  const { branchOdMm, mainOdMm, wallThicknessMm, config } = params;

  // For equal diameters: weld length = 2.7 × OD (Steinmetz factor)
  // For unequal diameters: L ≈ π × d × √[1 + (d/D)²] where d=branch, D=main
  const diameterRatio = branchOdMm / mainOdMm;
  const weldLengthMm =
    diameterRatio >= 0.95
      ? STEINMETZ_FACTOR * branchOdMm
      : Math.PI * branchOdMm * Math.sqrt(1 + diameterRatio * diameterRatio);

  const rawFilletLegSizeMm2 = config?.filletLegSizeMm;

  const legSizeMm = rawFilletLegSizeMm2 || calculateFilletWeldLegSize(wallThicknessMm);
  const crossSectionMm2 = filletWeldCrossSectionMm2(legSizeMm);
  const volumeMm3 = crossSectionMm2 * weldLengthMm;
  const volumeCm3 = volumeMm3 / 1000;

  return { volumeMm3, volumeCm3, legSizeMm, weldLengthMm };
}

export function calculateTotalWeldVolume(params: {
  outsideDiameterMm: number;
  wallThicknessMm: number;
  numberOfFlangeWelds: number;
  numberOfButtWelds: number;
  config?: WeldVolumeConfig;
}): WeldVolumeResult {
  const flangeWeld = calculateFlangeWeldVolume({
    outsideDiameterMm: params.outsideDiameterMm,
    wallThicknessMm: params.wallThicknessMm,
    numberOfFlangeWelds: params.numberOfFlangeWelds,
    config: params.config,
  });

  const buttWeld = calculateButtWeldVolume({
    outsideDiameterMm: params.outsideDiameterMm,
    wallThicknessMm: params.wallThicknessMm,
    numberOfButtWelds: params.numberOfButtWelds,
    config: params.config,
  });

  const totalVolumeMm3 = flangeWeld.volumeMm3 + buttWeld.volumeMm3;
  const totalVolumeCm3 = flangeWeld.volumeCm3 + buttWeld.volumeCm3;
  const WELD_METAL_DENSITY_KG_CM3 = STEEL_DENSITY_KG_CM3;
  const weldMetalWeightKg = totalVolumeCm3 * WELD_METAL_DENSITY_KG_CM3;

  return {
    filletVolumeMm3: flangeWeld.volumeMm3,
    filletVolumeCm3: flangeWeld.volumeCm3,
    buttWeldVolumeMm3: buttWeld.volumeMm3,
    buttWeldVolumeCm3: buttWeld.volumeCm3,
    totalVolumeMm3,
    totalVolumeCm3,
    weldMetalWeightKg,
  };
}

export function calculateBendWeldVolume(params: {
  mainOdMm: number;
  mainWallThicknessMm: number;
  numberOfFlangeWelds: number;
  numberOfMitreWelds: number;
  hasSweepTeeSaddleWeld?: boolean;
  stubs?: Array<{
    odMm: number;
    wallThicknessMm: number;
    hasFlangeWeld: boolean;
  }>;
  config?: WeldVolumeConfig;
}): WeldVolumeResult & {
  stubWeldVolumeMm3: number;
  stubWeldVolumeCm3: number;
  saddleWeldVolumeMm3: number;
  saddleWeldVolumeCm3: number;
} {
  const mainFlangeWeld = calculateFlangeWeldVolume({
    outsideDiameterMm: params.mainOdMm,
    wallThicknessMm: params.mainWallThicknessMm,
    numberOfFlangeWelds: params.numberOfFlangeWelds,
    config: params.config,
  });

  const mitreWeld = calculateButtWeldVolume({
    outsideDiameterMm: params.mainOdMm,
    wallThicknessMm: params.mainWallThicknessMm,
    numberOfButtWelds: params.numberOfMitreWelds,
    config: params.config,
  });

  // Sweep tee saddle weld (Steinmetz curve at 90° intersection)
  let saddleWeldVolumeMm3 = 0;
  let saddleWeldVolumeCm3 = 0;
  if (params.hasSweepTeeSaddleWeld) {
    const saddleWeld = calculateSaddleWeldVolume({
      // Equal diameter for sweep tees
      branchOdMm: params.mainOdMm,
      mainOdMm: params.mainOdMm,
      wallThicknessMm: params.mainWallThicknessMm,
      config: params.config,
    });
    saddleWeldVolumeMm3 = saddleWeld.volumeMm3;
    saddleWeldVolumeCm3 = saddleWeld.volumeCm3;
  }

  let stubWeldVolumeMm3 = 0;
  if (params.stubs) {
    params.stubs
      .filter((stub) => stub.hasFlangeWeld)
      .forEach((stub) => {
        const stubWeld = calculateFlangeWeldVolume({
          outsideDiameterMm: stub.odMm,
          wallThicknessMm: stub.wallThicknessMm,
          numberOfFlangeWelds: 1,
          config: params.config,
        });
        stubWeldVolumeMm3 += stubWeld.volumeMm3;
      });
  }
  const stubWeldVolumeCm3 = stubWeldVolumeMm3 / 1000;

  const totalVolumeMm3 =
    mainFlangeWeld.volumeMm3 + mitreWeld.volumeMm3 + stubWeldVolumeMm3 + saddleWeldVolumeMm3;
  const totalVolumeCm3 = totalVolumeMm3 / 1000;
  const WELD_METAL_DENSITY_KG_CM3 = STEEL_DENSITY_KG_CM3;
  const weldMetalWeightKg = totalVolumeCm3 * WELD_METAL_DENSITY_KG_CM3;

  return {
    filletVolumeMm3: mainFlangeWeld.volumeMm3 + stubWeldVolumeMm3 + saddleWeldVolumeMm3,
    filletVolumeCm3: (mainFlangeWeld.volumeMm3 + stubWeldVolumeMm3 + saddleWeldVolumeMm3) / 1000,
    buttWeldVolumeMm3: mitreWeld.volumeMm3,
    buttWeldVolumeCm3: mitreWeld.volumeCm3,
    stubWeldVolumeMm3,
    stubWeldVolumeCm3,
    saddleWeldVolumeMm3,
    saddleWeldVolumeCm3,
    totalVolumeMm3,
    totalVolumeCm3,
    weldMetalWeightKg,
  };
}

export function calculateFittingWeldVolume(params: {
  mainOdMm: number;
  mainWallThicknessMm: number;
  branchOdMm?: number;
  branchWallThicknessMm?: number;
  numberOfMainFlangeWelds: number;
  numberOfBranchFlangeWelds: number;
  hasTeeJunctionWeld: boolean;
  gussetSectionMm?: number;
  gussetWallThicknessMm?: number;
  config?: WeldVolumeConfig;
}): WeldVolumeResult & {
  teeJunctionVolumeMm3: number;
  teeJunctionVolumeCm3: number;
  gussetWeldVolumeMm3: number;
  gussetWeldVolumeCm3: number;
  gussetWeldLengthMm: number;
} {
  const mainFlangeWeld = calculateFlangeWeldVolume({
    outsideDiameterMm: params.mainOdMm,
    wallThicknessMm: params.mainWallThicknessMm,
    numberOfFlangeWelds: params.numberOfMainFlangeWelds,
    config: params.config,
  });

  let branchFlangeVolumeMm3 = 0;
  if (params.branchOdMm && params.branchWallThicknessMm && params.numberOfBranchFlangeWelds > 0) {
    const branchFlangeWeld = calculateFlangeWeldVolume({
      outsideDiameterMm: params.branchOdMm,
      wallThicknessMm: params.branchWallThicknessMm,
      numberOfFlangeWelds: params.numberOfBranchFlangeWelds,
      config: params.config,
    });
    branchFlangeVolumeMm3 = branchFlangeWeld.volumeMm3;
  }

  let teeJunctionVolumeMm3 = 0;
  if (params.hasTeeJunctionWeld && params.branchOdMm && params.branchWallThicknessMm) {
    const branchCircumferenceMm = Math.PI * params.branchOdMm;
    const legSize = calculateFilletWeldLegSize(params.branchWallThicknessMm);
    const crossSection = filletWeldCrossSectionMm2(legSize);
    teeJunctionVolumeMm3 = crossSection * branchCircumferenceMm;
  }
  const teeJunctionVolumeCm3 = teeJunctionVolumeMm3 / 1000;

  let gussetWeldVolumeMm3 = 0;
  let gussetWeldLengthMm = 0;
  if (params.gussetSectionMm && params.gussetWallThicknessMm && params.gussetSectionMm > 0) {
    const gussetLegMm = params.gussetSectionMm;
    const hypotenuseMm = gussetLegMm * Math.SQRT2;
    const singleGussetWeldLengthMm = hypotenuseMm + 2 * gussetLegMm;
    gussetWeldLengthMm = 2 * singleGussetWeldLengthMm;
    const legSize = calculateFilletWeldLegSize(params.gussetWallThicknessMm);
    const crossSection = filletWeldCrossSectionMm2(legSize);
    gussetWeldVolumeMm3 = crossSection * gussetWeldLengthMm;
  }
  const gussetWeldVolumeCm3 = gussetWeldVolumeMm3 / 1000;

  const totalFilletVolumeMm3 =
    mainFlangeWeld.volumeMm3 + branchFlangeVolumeMm3 + teeJunctionVolumeMm3 + gussetWeldVolumeMm3;
  const totalVolumeMm3 = totalFilletVolumeMm3;
  const totalVolumeCm3 = totalVolumeMm3 / 1000;
  const WELD_METAL_DENSITY_KG_CM3 = STEEL_DENSITY_KG_CM3;
  const weldMetalWeightKg = totalVolumeCm3 * WELD_METAL_DENSITY_KG_CM3;

  return {
    filletVolumeMm3: totalFilletVolumeMm3,
    filletVolumeCm3: totalFilletVolumeMm3 / 1000,
    buttWeldVolumeMm3: 0,
    buttWeldVolumeCm3: 0,
    teeJunctionVolumeMm3,
    teeJunctionVolumeCm3,
    gussetWeldVolumeMm3,
    gussetWeldVolumeCm3,
    gussetWeldLengthMm,
    totalVolumeMm3,
    totalVolumeCm3,
    weldMetalWeightKg,
  };
}
