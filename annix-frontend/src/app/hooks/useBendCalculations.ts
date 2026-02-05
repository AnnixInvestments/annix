'use client';

import { useMemo } from 'react';
import {
  BEND_END_OPTIONS,
  flangeCountPerBend as getFlangeCountPerBend,
  flangeWeldCountPerBend as getFlangeWeldCountPerBend,
  flangeCountPerFitting as getFlangeCountPerFitting,
  flangeWeldCountPerFitting as getFlangeWeldCountPerFitting,
  fittingFlangeConfig as getFittingFlangeConfig,
  tackWeldWeight as getTackWeldWeight,
  closureWeight as getClosureWeight,
  FITTING_CLASS_WALL_THICKNESS,
} from '@/app/lib/config/rfq';
import {
  NB_TO_OD_LOOKUP,
  flangeWeightSync as getFlangeWeight,
  blankFlangeWeightSync as getBlankFlangeWeight,
  sansBlankFlangeWeightSync as sansBlankFlangeWeight,
} from '@/app/lib/hooks/useFlangeWeights';
import { roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';
import { calculateBendWeldVolume } from '@/app/lib/utils/pipeCalculations';

const STEEL_DENSITY_KG_M3 = 7850;
const STEINMETZ_FACTOR = 2.7;

export interface BendEntry {
  id: string;
  specs: {
    nominalBoreMm?: number;
    scheduleNumber?: string;
    steelSpecificationId?: number;
    numberOfSegments?: number;
    bendStyle?: string;
    bendItemType?: string;
    bendEndConfiguration?: string;
    centerToFaceMm?: number;
    bendRadiusMm?: number;
    tangentLengths?: number[];
    numberOfTangents?: number;
    numberOfStubs?: number;
    stubs?: Array<{
      nominalBoreMm?: number;
      lengthMm?: number;
      length?: number;
      steelSpecificationId?: number;
      hasFlange?: boolean;
    }>;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string;
    blankFlangePositions?: string[];
    closureLengthMm?: number;
    sweepTeePipeALengthMm?: number;
    quantityValue?: number;
    duckfootBasePlateXMm?: number;
    duckfootBasePlateYMm?: number;
    duckfootGussetPointDDegrees?: number;
    duckfootGussetPointCDegrees?: number;
  };
  calculation?: {
    wallThicknessMm?: number;
    bendWeight?: number;
    flangeWeightPerUnit?: number;
    totalWeldLengthMm?: number;
  };
}

export interface GlobalSpecs {
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
}

export interface MasterData {
  flangeStandards?: Array<{ id: number; code: string }>;
  pressureClasses?: Array<{ id: number; designation: string }>;
  steelSpecs?: Array<{ id: number; steelSpecName: string }>;
}

export interface FlangeCountsResult {
  bendFlangeCount: number;
  bendFlangeWeldCount: number;
  stub1FlangeCount: number;
  stub2FlangeCount: number;
  totalFlanges: number;
}

export interface WeightBreakdownResult {
  bendWeightOnly: number;
  tangentWeight: number;
  pipeAWeight: number;
  stub1PipeWeight: number;
  stub2PipeWeight: number;
  mainFlangesWeight: number;
  stub1FlangesWeight: number;
  stub2FlangesWeight: number;
  totalFlangeWeight: number;
  totalBlankFlangeWeight: number;
  tackWeldTotalWeight: number;
  closureTotalWeight: number;
  totalWeight: number;
}

export interface WeldVolumeData {
  filletVolumeMm3: number;
  filletVolumeCm3: number;
  buttWeldVolumeMm3: number;
  buttWeldVolumeCm3: number;
  totalVolumeMm3: number;
  totalVolumeCm3: number;
  weldMetalWeightKg: number;
  stubWeldVolumeMm3: number;
  stubWeldVolumeCm3: number;
  saddleWeldVolumeMm3: number;
  saddleWeldVolumeCm3: number;
}

export interface WeldAnalysisResult {
  mitreWeldCount: number;
  mitreWeldLinear: number;
  mainFlangeWeldLinear: number;
  stub1FlangeWeldLinear: number;
  stub2FlangeWeldLinear: number;
  branchFlangeWeldLinear: number;
  totalFlangeWeldLinear: number;
  totalFlangeWeldCount: number;
  buttWeldCount: number;
  buttWeldLinear: number;
  saddleWeldLinear: number;
  teeWeldLinear: number;
  totalWeldLinearMm: number;
  weldVolume: WeldVolumeData | null;
}

export interface DimensionsResult {
  cfDisplay: string;
  mainBendLength: number;
  mainLengthDisplay: string;
  stubLengthDisplay: string;
  mainOdMm: number;
  mainIdMm: number;
  mainCircumference: number;
  effectiveWt: number | null;
}

export interface UseBendCalculationsResult {
  flangeCounts: FlangeCountsResult;
  weightBreakdown: WeightBreakdownResult;
  weldAnalysis: WeldAnalysisResult;
  dimensions: DimensionsResult;
  isSweepTee: boolean;
  isPulledBend: boolean;
  isSABS719: boolean;
}

export function useBendCalculations(
  entry: BendEntry,
  globalSpecs: GlobalSpecs,
  masterData: MasterData
): UseBendCalculationsResult {
  return useMemo(() => {
    const specs = entry.specs;
    const calculation = entry.calculation;

    const dn = specs?.nominalBoreMm;
    const schedule = specs?.scheduleNumber || '';
    const pipeWallThickness = calculation?.wallThicknessMm;
    const steelSpecId =
      specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
    const isSABS719 = steelSpecId === 8;

    const scheduleUpper = schedule.toUpperCase();
    const isStdSchedule =
      scheduleUpper.includes('40') || scheduleUpper === 'STD';
    const isXhSchedule =
      scheduleUpper.includes('80') ||
      scheduleUpper === 'XS' ||
      scheduleUpper === 'XH';
    const isXxhSchedule =
      scheduleUpper.includes('160') ||
      scheduleUpper === 'XXS' ||
      scheduleUpper === 'XXH';

    let fittingClass: 'STD' | 'XH' | 'XXH' | '' = '';
    if (isXxhSchedule) fittingClass = 'XXH';
    else if (isXhSchedule) fittingClass = 'XH';
    else if (isStdSchedule) fittingClass = 'STD';

    const fittingWt =
      isSABS719 || !fittingClass
        ? null
        : dn
          ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn]
          : null;
    const rawEffectiveWt = fittingWt || pipeWallThickness;
    const effectiveWt = rawEffectiveWt
      ? roundToWeldIncrement(rawEffectiveWt)
      : null;

    const mainOdMm = dn ? NB_TO_OD_LOOKUP[dn] || dn * 1.05 : 0;
    const mainIdMm = mainOdMm - 2 * (pipeWallThickness || 0);
    const mainCircumference = mainOdMm > 0 ? Math.PI * mainOdMm : 0;
    const mainCrossSection =
      mainOdMm > 0
        ? (Math.PI * (mainOdMm * mainOdMm - mainIdMm * mainIdMm)) / 4
        : 0;

    const bendEndConfig = specs?.bendEndConfiguration || 'PE';
    const isSweepTee = specs?.bendItemType === 'SWEEP_TEE';
    const isPulledBend =
      specs?.bendStyle === 'pulled' || (!specs?.bendStyle && !isSABS719);

    const stubs = specs?.stubs || [];
    const stub1NB = stubs[0]?.nominalBoreMm;
    const stub2NB = stubs[1]?.nominalBoreMm;
    const stub1Length = stubs[0]?.lengthMm || stubs[0]?.length || 0;
    const stub2Length = stubs[1]?.lengthMm || stubs[1]?.length || 0;
    const stub1HasFlange = !!stub1NB;
    const stub2HasFlange = !!stub2NB;
    const numStubs = specs?.numberOfStubs || 0;

    const bendFlangeCount = isSweepTee
      ? getFlangeCountPerFitting(bendEndConfig)
      : getFlangeCountPerBend(bendEndConfig);
    const bendFlangeWeldCount = isSweepTee
      ? getFlangeWeldCountPerFitting(bendEndConfig)
      : getFlangeWeldCountPerBend(bendEndConfig);
    const stub1FlangeCount = stub1HasFlange ? 1 : 0;
    const stub2FlangeCount = stub2HasFlange ? 1 : 0;
    const totalFlanges = bendFlangeCount + stub1FlangeCount + stub2FlangeCount;

    const flangeCounts: FlangeCountsResult = {
      bendFlangeCount,
      bendFlangeWeldCount,
      stub1FlangeCount,
      stub2FlangeCount,
      totalFlanges,
    };

    const flangeStandardId =
      specs?.flangeStandardId || globalSpecs?.flangeStandardId;
    const flangePressureClassId =
      specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
    const flangeStandard = masterData.flangeStandards?.find(
      (s) => s.id === flangeStandardId
    );
    const flangeStandardCode = flangeStandard?.code || '';
    const pressureClass = masterData.pressureClasses?.find(
      (p) => p.id === flangePressureClassId
    );
    const pressureClassDesignation = pressureClass?.designation || '';
    const flangeTypeCode =
      specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

    const mainFlangeWeightPerUnit =
      dn && pressureClassDesignation
        ? getFlangeWeight(
            dn,
            pressureClassDesignation,
            flangeStandardCode,
            flangeTypeCode
          )
        : calculation?.flangeWeightPerUnit || 0;
    const mainFlangesWeight = bendFlangeCount * mainFlangeWeightPerUnit;

    const stub1FlangeWeightPerUnit =
      stub1NB && pressureClassDesignation
        ? getFlangeWeight(
            stub1NB,
            pressureClassDesignation,
            flangeStandardCode,
            flangeTypeCode
          )
        : 0;
    const stub1FlangesWeight = stub1FlangeCount * stub1FlangeWeightPerUnit;

    const stub2FlangeWeightPerUnit =
      stub2NB && pressureClassDesignation
        ? getFlangeWeight(
            stub2NB,
            pressureClassDesignation,
            flangeStandardCode,
            flangeTypeCode
          )
        : 0;
    const stub2FlangesWeight = stub2FlangeCount * stub2FlangeWeightPerUnit;

    const totalFlangeWeight =
      mainFlangesWeight + stub1FlangesWeight + stub2FlangesWeight;

    const bendQuantity = specs?.quantityValue || 1;
    const blankPositions = specs?.blankFlangePositions || [];
    const blankFlangeCount = blankPositions.length * bendQuantity;
    const isSans1123 =
      flangeStandardCode.includes('SABS 1123') ||
      flangeStandardCode.includes('SANS 1123');
    const blankWeightPerUnit =
      dn && pressureClassDesignation
        ? isSans1123
          ? sansBlankFlangeWeight(dn, pressureClassDesignation)
          : getBlankFlangeWeight(dn, pressureClassDesignation)
        : 0;
    const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

    const bendEndOption = BEND_END_OPTIONS.find(
      (o) => o.value === specs?.bendEndConfiguration
    );
    const tackWeldEnds = (bendEndOption as any)?.tackWeldEnds || 0;
    const tackWeldTotalWeight =
      dn && tackWeldEnds > 0
        ? getTackWeldWeight(dn, tackWeldEnds) * bendQuantity
        : 0;

    const closureLengthMm = specs?.closureLengthMm || 0;
    const closureWallThickness = pipeWallThickness || 5;
    const closureTotalWeight =
      dn && closureLengthMm > 0 && closureWallThickness > 0
        ? getClosureWeight(dn, closureLengthMm, closureWallThickness) *
          bendQuantity
        : 0;

    const stub1OD = stub1NB ? NB_TO_OD_LOOKUP[stub1NB] || stub1NB * 1.05 : 0;
    const stub1ID = stub1OD - 2 * (pipeWallThickness || 0);
    const stub1CrossSection =
      stub1OD > 0
        ? (Math.PI * (stub1OD * stub1OD - stub1ID * stub1ID)) / 4
        : 0;
    const stub1PipeWeight =
      stub1CrossSection > 0 && stub1Length > 0
        ? (stub1CrossSection / 1000000) *
          (stub1Length / 1000) *
          STEEL_DENSITY_KG_M3
        : 0;

    const stub2OD = stub2NB ? NB_TO_OD_LOOKUP[stub2NB] || stub2NB * 1.05 : 0;
    const stub2ID = stub2OD - 2 * (pipeWallThickness || 0);
    const stub2CrossSection =
      stub2OD > 0
        ? (Math.PI * (stub2OD * stub2OD - stub2ID * stub2ID)) / 4
        : 0;
    const stub2PipeWeight =
      stub2CrossSection > 0 && stub2Length > 0
        ? (stub2CrossSection / 1000000) *
          (stub2Length / 1000) *
          STEEL_DENSITY_KG_M3
        : 0;

    const tangent1 = specs?.tangentLengths?.[0] || 0;
    const tangent2 = specs?.tangentLengths?.[1] || 0;
    const tangentTotalLength = tangent1 + tangent2;
    const tangentWeight =
      mainCrossSection > 0 && tangentTotalLength > 0
        ? (mainCrossSection / 1000000) *
          (tangentTotalLength / 1000) *
          STEEL_DENSITY_KG_M3
        : 0;

    const pipeALengthMm = isSweepTee
      ? specs?.sweepTeePipeALengthMm || 0
      : 0;
    const pipeAWeight =
      mainCrossSection > 0 && pipeALengthMm > 0
        ? (mainCrossSection / 1000000) *
          (pipeALengthMm / 1000) *
          STEEL_DENSITY_KG_M3
        : 0;

    const bendWeightFromCalc = calculation?.bendWeight || 0;
    const bendWeightOnly =
      bendWeightFromCalc > tangentWeight
        ? bendWeightFromCalc - tangentWeight
        : bendWeightFromCalc;
    const totalWeight =
      bendWeightFromCalc +
      stub1PipeWeight +
      stub2PipeWeight +
      totalFlangeWeight +
      totalBlankFlangeWeight +
      tackWeldTotalWeight +
      closureTotalWeight +
      pipeAWeight;

    const weightBreakdown: WeightBreakdownResult = {
      bendWeightOnly,
      tangentWeight,
      pipeAWeight,
      stub1PipeWeight,
      stub2PipeWeight,
      mainFlangesWeight,
      stub1FlangesWeight,
      stub2FlangesWeight,
      totalFlangeWeight,
      totalBlankFlangeWeight,
      tackWeldTotalWeight,
      closureTotalWeight,
      totalWeight,
    };

    const numSegments = specs?.numberOfSegments || 0;
    const mitreWeldCount = numSegments > 1 ? numSegments - 1 : 0;
    const mitreWeldLinear = mitreWeldCount * mainCircumference;

    const mainFlangeWeldLinear = bendFlangeWeldCount * 2 * mainCircumference;
    const stub1Circ = stub1OD > 0 ? Math.PI * stub1OD : 0;
    const stub2Circ = stub2OD > 0 ? Math.PI * stub2OD : 0;
    const stub1FlangeWeldLinear = stub1FlangeCount * 2 * stub1Circ;
    const stub2FlangeWeldLinear = stub2FlangeCount * 2 * stub2Circ;

    const hasBranchConnection = (specs?.sweepTeePipeALengthMm || 0) > 0;
    const branchFlangeConfig = hasBranchConnection
      ? getFittingFlangeConfig(bendEndConfig)
      : null;
    const branchHasWeldableFlange =
      branchFlangeConfig?.hasBranch &&
      branchFlangeConfig?.branchType !== 'loose';
    const branchFlangeWeldCount = branchHasWeldableFlange ? 1 : 0;
    const branchFlangeWeldLinear =
      branchFlangeWeldCount * 2 * mainCircumference;
    const totalFlangeWeldLinear =
      mainFlangeWeldLinear +
      stub1FlangeWeldLinear +
      stub2FlangeWeldLinear +
      branchFlangeWeldLinear;
    const totalFlangeWeldCount =
      bendFlangeWeldCount +
      stub1FlangeCount +
      stub2FlangeCount +
      branchFlangeWeldCount;

    const tangent1HasLength = tangent1 > 0;
    const tangent2HasLength = tangent2 > 0;
    const buttWeldCount = isPulledBend
      ? (tangent1HasLength ? 1 : 0) + (tangent2HasLength ? 1 : 0)
      : 0;
    const buttWeldLinear = buttWeldCount * mainCircumference;

    const saddleWeldLinear =
      isSweepTee && mainOdMm > 0 ? STEINMETZ_FACTOR * mainOdMm : 0;

    const teeStub1Circ = stub1NB ? Math.PI * stub1OD : 0;
    const teeStub2Circ = stub2NB ? Math.PI * stub2OD : 0;
    const teeWeldLinear =
      (numStubs >= 1 && stub1NB ? teeStub1Circ : 0) +
      (numStubs >= 2 && stub2NB ? teeStub2Circ : 0);

    const totalWeldLinearMm =
      mitreWeldLinear +
      totalFlangeWeldLinear +
      buttWeldLinear +
      saddleWeldLinear +
      teeWeldLinear;

    const baseWeldVolume =
      mainOdMm && pipeWallThickness
        ? calculateBendWeldVolume({
            mainOdMm,
            mainWallThicknessMm: pipeWallThickness,
            numberOfFlangeWelds: bendFlangeWeldCount,
            numberOfMitreWelds: mitreWeldCount + buttWeldCount,
            hasSweepTeeSaddleWeld: isSweepTee,
            stubs: [
              stub1NB && stub1HasFlange
                ? {
                    odMm: stub1OD,
                    wallThicknessMm: pipeWallThickness,
                    hasFlangeWeld: true,
                  }
                : null,
              stub2NB && stub2HasFlange
                ? {
                    odMm: stub2OD,
                    wallThicknessMm: pipeWallThickness,
                    hasFlangeWeld: true,
                  }
                : null,
            ].filter(Boolean) as Array<{
              odMm: number;
              wallThicknessMm: number;
              hasFlangeWeld: boolean;
            }>,
          })
        : null;

    const FILLET_LEG_RATIO = 0.7;
    const tee1LegSize = pipeWallThickness ? pipeWallThickness * FILLET_LEG_RATIO : 0;
    const tee2LegSize = pipeWallThickness ? pipeWallThickness * FILLET_LEG_RATIO : 0;
    const teeWeld1VolMm3 =
      numStubs >= 1 && stub1OD > 0
        ? 0.5 * tee1LegSize * tee1LegSize * Math.PI * stub1OD
        : 0;
    const teeWeld2VolMm3 =
      numStubs >= 2 && stub2OD > 0
        ? 0.5 * tee2LegSize * tee2LegSize * Math.PI * stub2OD
        : 0;
    const teeWeldTotalVolCm3 = (teeWeld1VolMm3 + teeWeld2VolMm3) / 1000;

    const weldVolume = baseWeldVolume
      ? {
          ...baseWeldVolume,
          totalVolumeCm3: baseWeldVolume.totalVolumeCm3 + teeWeldTotalVolCm3,
        }
      : null;

    const weldAnalysis: WeldAnalysisResult = {
      mitreWeldCount,
      mitreWeldLinear,
      mainFlangeWeldLinear,
      stub1FlangeWeldLinear,
      stub2FlangeWeldLinear,
      branchFlangeWeldLinear,
      totalFlangeWeldLinear,
      totalFlangeWeldCount,
      buttWeldCount,
      buttWeldLinear,
      saddleWeldLinear,
      teeWeldLinear,
      totalWeldLinearMm,
      weldVolume,
    };

    const cf = Number(specs?.centerToFaceMm) || 0;
    const numTangents = specs?.numberOfTangents || 0;
    const end1 = cf + tangent1;
    const end2 = cf + tangent2;

    let cfDisplay = '';
    if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
      if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
        cfDisplay = `${end1.toFixed(0)}x${end2.toFixed(0)}`;
      } else if (tangent1 > 0) {
        cfDisplay = `${end1.toFixed(0)}x${cf.toFixed(0)}`;
      } else if (tangent2 > 0) {
        cfDisplay = `${cf.toFixed(0)}x${end2.toFixed(0)}`;
      }
    } else {
      cfDisplay = `${cf.toFixed(0)}`;
    }

    const mainBendLength = cf * 2 + tangent1 + tangent2;
    const mainLengthDisplay = `${mainBendLength.toFixed(0)}mm @ ${dn}NB`;

    let stubLengthDisplay = '';
    if (numStubs >= 1 && stub1Length > 0 && stub1NB) {
      const stubsSameNBAndSpec =
        stub1NB &&
        stub2NB &&
        stub1NB === stub2NB &&
        stubs[0]?.steelSpecificationId === stubs[1]?.steelSpecificationId;
      if (numStubs >= 2 && stub2Length > 0 && stub2NB && stubsSameNBAndSpec) {
        stubLengthDisplay = `${stub1Length + stub2Length}mm @ ${stub1NB}NB`;
      } else {
        stubLengthDisplay = `${stub1Length}mm @ ${stub1NB}NB`;
        if (numStubs >= 2 && stub2Length > 0 && stub2NB) {
          stubLengthDisplay += ` + ${stub2Length}mm @ ${stub2NB}NB`;
        }
      }
    }

    const dimensions: DimensionsResult = {
      cfDisplay,
      mainBendLength,
      mainLengthDisplay,
      stubLengthDisplay,
      mainOdMm,
      mainIdMm,
      mainCircumference,
      effectiveWt,
    };

    return {
      flangeCounts,
      weightBreakdown,
      weldAnalysis,
      dimensions,
      isSweepTee,
      isPulledBend,
      isSABS719,
    };
  }, [entry, globalSpecs, masterData]);
}
