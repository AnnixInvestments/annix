"use client";

import { toPairs as entries } from "es-toolkit/compat";
import {
  FITTING_CLASS_WALL_THICKNESS,
  closureWeight as getClosureWeight,
  fittingFlangeConfig as getFittingFlangeConfig,
  tackWeldWeight as getTackWeldWeight,
  hasLooseFlange,
} from "@/app/lib/config/rfq";
import { flangeWeight, retainingRingWeightLookup } from "@/app/lib/query/hooks";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import {
  calculateComprehensiveSurfaceArea,
  calculateFittingWeldVolume,
  calculatePipeWeightPerMeter,
} from "@/app/lib/utils/pipeCalculations";
import {
  calculateBlankFlangeWeight,
  flangeWeightOr,
  scheduleToFittingClass,
} from "@/app/lib/utils/rfqFlangeCalculations";
import { getGussetSection } from "@/app/lib/utils/sabs719TeeData";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import type { FlangeStandardItem, PressureClassItem, SteelSpecItem } from "../shared";
import { SurfaceAreaDisplay, WeldSummaryCard } from "../shared";

interface StubCalcData {
  stubNB: number;
  stubLengthMm: number;
  stubOdMm: number;
  stubPipeWeight: number;
  stubFlangeWeight: number;
  stubBlankWeight: number;
  stubHasFlange: boolean;
  hasBlankFlange: boolean;
  stubToMainWeldMm: number;
  stubFlangeWeldMm: number;
  stubCircMm: number;
}

export interface FittingCalcResultsProps {
  specs: any;
  entry: any;
  globalSpecs: GlobalSpecs;
  masterData: MasterData;
  nbToOdMap: Record<number, number>;
  allWeights: any[];
  allRetainingRings: any[];
  flangeResolution: {
    flangeStandardCode: string;
    pressureClassDesignation: string;
    flangeTypeCode: string | undefined;
  };
  requiredProducts: string[];
}

function ReducerCalcResults(props: FittingCalcResultsProps) {
  const { specs, entry, globalSpecs, masterData, nbToOdMap, allWeights } = props;

  const rawFittingType = specs.fittingType;
  const fittingType = rawFittingType || "Tee";
  const rawNominalDiameterMm = specs.nominalDiameterMm;
  const rawNominalBoreMm = specs.nominalBoreMm;
  const nominalBore = rawNominalDiameterMm || rawNominalBoreMm || 0;

  const largeNB = nominalBore;
  const rawSmallNominalDiameterMm = specs.smallNominalDiameterMm;
  const smallNB = rawSmallNominalDiameterMm || largeNB / 2;
  const rawReducerLengthMm = specs.reducerLengthMm;
  const reducerLengthMm = rawReducerLengthMm || 280;
  const rawQuantityValue = specs.quantityValue;
  const quantity = rawQuantityValue || 1;
  const rawHasReducerStub = specs.hasReducerStub;
  const hasStub = rawHasReducerStub || false;
  const rawReducerStubNbMm = specs.reducerStubNbMm;
  const stubNB = rawReducerStubNbMm || 50;
  const stubLocationMm = reducerLengthMm / 2;

  const rawSteelSpecificationId = specs.steelSpecificationId;
  const steelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const steelSpec = masterData?.steelSpecs?.find((s: SteelSpecItem) => s.id === steelSpecId);
  const _rawSteelSpecName = steelSpec?.steelSpecName;

  const rawFlangeStandardId = specs.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || globalSpecs?.flangeStandardId;
  const rawFlangePressureClassId = specs.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeStandard = masterData.flangeStandards?.find(
    (s: FlangeStandardItem) => s.id === flangeStandardId,
  );
  const rawCode = flangeStandard?.code;
  const flangeStandardCode = rawCode || "";
  const pressureClass = masterData.pressureClasses?.find(
    (p: PressureClassItem) => p.id === flangePressureClassId,
  );
  const rawDesignation = pressureClass?.designation;
  const pressureClassDesignation = rawDesignation || "";
  const rawFlangeTypeCode = specs.flangeTypeCode;
  const flangeTypeCode = rawFlangeTypeCode || globalSpecs?.flangeTypeCode;

  const rawPipeEndConfiguration = specs.pipeEndConfiguration;
  const endConfig = rawPipeEndConfiguration || "PE";
  const hasLargeFlange =
    endConfig === "FBE" ||
    endConfig === "FOE" ||
    endConfig === "2X_RF" ||
    endConfig === "2X_LF" ||
    endConfig === "FOE_RF" ||
    endConfig === "FOE_LF" ||
    endConfig === "RF_LF";
  const hasSmallFlange =
    endConfig === "FBE" ||
    endConfig === "2X_RF" ||
    endConfig === "2X_LF" ||
    endConfig === "FOE_RF" ||
    endConfig === "FOE_LF" ||
    endConfig === "RF_LF";

  const rawLargeNB = nbToOdMap[largeNB];
  const largeOD = rawLargeNB || largeNB * 1.05;
  const rawSmallNB = nbToOdMap[smallNB];
  const smallOD = rawSmallNB || smallNB * 1.05;
  const rawWallThicknessMm = entry.calculation?.wallThicknessMm;
  const wallThickness = rawWallThicknessMm || 6;

  const avgOD = (largeOD + smallOD) / 2;
  const reducerLengthM = reducerLengthMm / 1000;
  const reducerPipeWeight = calculatePipeWeightPerMeter(avgOD, wallThickness) * reducerLengthM;

  const largeFlangeWeight =
    hasLargeFlange && pressureClassDesignation
      ? flangeWeight(
          allWeights,
          largeNB,
          pressureClassDesignation,
          flangeStandardCode,
          flangeTypeCode,
        )
      : 0;
  const smallFlangeWeight =
    hasSmallFlange && pressureClassDesignation
      ? flangeWeight(
          allWeights,
          smallNB,
          pressureClassDesignation,
          flangeStandardCode,
          flangeTypeCode,
        )
      : 0;
  const numFlanges = (hasLargeFlange ? 1 : 0) + (hasSmallFlange ? 1 : 0);

  const rawStubNBOd = nbToOdMap[stubNB];
  const stubOD = hasStub ? rawStubNBOd || stubNB * 1.05 : 0;
  const rawStubWT = FITTING_CLASS_WALL_THICKNESS["STD"][stubNB];
  const stubWT = hasStub ? rawStubWT || wallThickness : 0;
  const stubLengthMm = 150;
  const stubPipeWeight = hasStub
    ? calculatePipeWeightPerMeter(stubOD, stubWT) * (stubLengthMm / 1000)
    : 0;
  const stubFlangeWeight = hasStub
    ? flangeWeight(allWeights, stubNB, pressureClassDesignation, flangeStandardCode, flangeTypeCode)
    : 0;

  const totalWeight =
    (reducerPipeWeight +
      largeFlangeWeight +
      smallFlangeWeight +
      stubPipeWeight +
      stubFlangeWeight) *
    quantity;

  const largeCircMm = Math.PI * largeOD;
  const smallCircMm = Math.PI * smallOD;
  const stubCircMm = hasStub ? Math.PI * stubOD : 0;
  const STEINMETZ_FACTOR = 2.7;

  const largeEndWeldMm = hasLargeFlange ? 2 * largeCircMm : largeCircMm;
  const smallEndWeldMm = hasSmallFlange ? 2 * smallCircMm : smallCircMm;
  const stubJunctionWeldMm = hasStub ? STEINMETZ_FACTOR * stubOD : 0;
  const stubFlangeWeldMm = hasStub ? 2 * stubCircMm : 0;
  const totalWeldMm = largeEndWeldMm + smallEndWeldMm + stubJunctionWeldMm + stubFlangeWeldMm;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
    >
      <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
        <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
        <p className="text-lg font-bold text-blue-900">
          {quantity} × {fittingType === "CON_REDUCER" ? "Concentric" : "Eccentric"}
        </p>
        <div className="mt-1 space-y-0.5 text-xs text-blue-700">
          <p>Large: {largeNB}NB</p>
          <p>Small: {smallNB}NB</p>
          <p>Length: {reducerLengthMm}mm</p>
          {hasStub && (
            <p className="text-orange-700">
              Stub: {stubNB}NB @ {stubLocationMm}mm
            </p>
          )}
        </div>
      </div>

      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Weight Breakdown</p>
        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
          {totalWeight.toFixed(2)}kg
        </p>
        <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
          <p>Reducer: {(reducerPipeWeight * quantity).toFixed(2)}kg</p>
          {hasLargeFlange && largeFlangeWeight > 0 && (
            <p>
              {largeNB}NB Flange: {(largeFlangeWeight * quantity).toFixed(2)}kg
            </p>
          )}
          {hasSmallFlange && smallFlangeWeight > 0 && (
            <p>
              {smallNB}NB Flange: {(smallFlangeWeight * quantity).toFixed(2)}kg
            </p>
          )}
          {hasStub && stubPipeWeight > 0 && (
            <p className="text-orange-600">Stub Pipe: {(stubPipeWeight * quantity).toFixed(2)}kg</p>
          )}
          {hasStub && stubFlangeWeight > 0 && (
            <p className="text-orange-600">
              Stub Flange: {(stubFlangeWeight * quantity).toFixed(2)}kg
            </p>
          )}
        </div>
      </div>

      {numFlanges + (hasStub ? 1 : 0) > 0 && (
        <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
          <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
          <p className="text-lg font-bold text-amber-900">{numFlanges + (hasStub ? 1 : 0)}</p>
          <div className="mt-1 text-xs text-amber-700">
            {hasLargeFlange && <p>1 × {largeNB}NB (Large)</p>}
            {hasSmallFlange && <p>1 × {smallNB}NB (Small)</p>}
            {hasStub && <p className="text-orange-700">1 × {stubNB}NB (Stub)</p>}
          </div>
          {pressureClassDesignation && (
            <p className="text-xs text-amber-600 mt-1 font-medium">{pressureClassDesignation}</p>
          )}
        </div>
      )}

      <WeldSummaryCard totalLinearMm={totalWeldMm}>
        <p>Large End: {largeEndWeldMm.toFixed(0)}mm</p>
        <p>Small End: {smallEndWeldMm.toFixed(0)}mm</p>
        {hasStub && stubJunctionWeldMm > 0 && (
          <p className="text-orange-600">Stub Junction: {stubJunctionWeldMm.toFixed(0)}mm</p>
        )}
        {hasStub && stubFlangeWeldMm > 0 && (
          <p className="text-orange-600">Stub Flange: {stubFlangeWeldMm.toFixed(0)}mm</p>
        )}
      </WeldSummaryCard>
    </div>
  );
}

function OffsetBendCalcResults(props: FittingCalcResultsProps) {
  const { specs, entry, globalSpecs, masterData, nbToOdMap, allWeights } = props;

  const rawNominalDiameterMm = specs.nominalDiameterMm;
  const rawNominalBoreMm = specs.nominalBoreMm;
  const nominalBore = rawNominalDiameterMm || rawNominalBoreMm || 0;

  const rawOffsetLengthA = specs.offsetLengthA;
  const lengthA = rawOffsetLengthA || 0;
  const rawOffsetLengthB = specs.offsetLengthB;
  const lengthB = rawOffsetLengthB || 0;
  const rawOffsetLengthC = specs.offsetLengthC;
  const lengthC = rawOffsetLengthC || 0;
  const rawOffsetAngleDegrees = specs.offsetAngleDegrees;
  const offsetAngle = rawOffsetAngleDegrees || 45;
  const rawQuantityValue = specs.quantityValue;
  const quantity = rawQuantityValue || 1;

  const rawSteelSpecificationId = specs.steelSpecificationId;
  const steelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const steelSpec = masterData?.steelSpecs?.find((s: SteelSpecItem) => s.id === steelSpecId);
  const _rawSteelSpecName = steelSpec?.steelSpecName;

  const rawFlangeStandardId = specs.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || globalSpecs?.flangeStandardId;
  const rawFlangePressureClassId = specs.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeStandard = masterData.flangeStandards?.find(
    (s: FlangeStandardItem) => s.id === flangeStandardId,
  );
  const rawCode = flangeStandard?.code;
  const flangeStandardCode = rawCode || "";
  const pressureClass = masterData.pressureClasses?.find(
    (p: PressureClassItem) => p.id === flangePressureClassId,
  );
  const rawDesignation = pressureClass?.designation;
  const pressureClassDesignation = rawDesignation || "";
  const rawFlangeTypeCode = specs.flangeTypeCode;
  const flangeTypeCode = rawFlangeTypeCode || globalSpecs?.flangeTypeCode;

  const rawPipeEndConfiguration = specs.pipeEndConfiguration;
  const endConfig = rawPipeEndConfiguration || "PE";
  const hasStartFlange =
    endConfig === "FBE" || endConfig === "FOE" || endConfig === "2X_RF" || endConfig === "2X_LF";
  const hasEndFlange = endConfig === "FBE" || endConfig === "2X_RF" || endConfig === "2X_LF";

  const rawNominalBoreOd = nbToOdMap[nominalBore];
  const pipeOD = rawNominalBoreOd || nominalBore * 1.05;
  const rawWallThicknessMm = entry.calculation?.wallThicknessMm;
  const wallThickness = rawWallThicknessMm || 6;

  const totalPipeLengthMm = lengthA + lengthB + lengthC;
  const totalPipeLengthM = totalPipeLengthMm / 1000;
  const pipeWeight = calculatePipeWeightPerMeter(pipeOD, wallThickness) * totalPipeLengthM;

  const flangeWeightKg = pressureClassDesignation
    ? flangeWeight(
        allWeights,
        nominalBore,
        pressureClassDesignation,
        flangeStandardCode,
        flangeTypeCode,
      )
    : 0;
  const numFlanges = (hasStartFlange ? 1 : 0) + (hasEndFlange ? 1 : 0);
  const totalFlangeWeight = flangeWeightKg * numFlanges;

  const totalWeight = (pipeWeight + totalFlangeWeight) * quantity;

  const pipeCircMm = Math.PI * pipeOD;

  const numMitreWelds = 2;
  const mitreWeldMm = numMitreWelds * pipeCircMm;
  const flangeWeldMm = numFlanges * 2 * pipeCircMm;
  const totalWeldMm = mitreWeldMm + flangeWeldMm;

  const angleRad = (offsetAngle * Math.PI) / 180;
  const offsetHeight = Math.round(lengthB * Math.sin(angleRad));

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
    >
      <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
        <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
        <p className="text-lg font-bold text-blue-900">{quantity} × Offset Bend</p>
        <div className="mt-1 space-y-0.5 text-xs text-blue-700">
          <p>NB: {nominalBore}mm</p>
          <p>
            A: {lengthA}mm | B: {lengthB}mm | C: {lengthC}mm
          </p>
          <p>Total Length: {totalPipeLengthMm}mm</p>
          <p className="text-purple-700">
            Angle: {offsetAngle}° | Offset: {offsetHeight}mm
          </p>
        </div>
      </div>

      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Weight Breakdown</p>
        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
          {totalWeight.toFixed(2)}kg
        </p>
        <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
          <p>Pipe: {(pipeWeight * quantity).toFixed(2)}kg</p>
          {numFlanges > 0 && totalFlangeWeight > 0 && (
            <p>
              Flanges ({numFlanges}): {(totalFlangeWeight * quantity).toFixed(2)}kg
            </p>
          )}
        </div>
      </div>

      {numFlanges > 0 && (
        <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
          <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
          <p className="text-lg font-bold text-amber-900">{numFlanges}</p>
          <div className="mt-1 text-xs text-amber-700">
            <p>
              {numFlanges} × {nominalBore}NB
            </p>
          </div>
          {pressureClassDesignation && (
            <p className="text-xs text-amber-600 mt-1 font-medium">{pressureClassDesignation}</p>
          )}
        </div>
      )}

      <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded text-center">
        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Weld Summary</p>
        <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
          {(totalWeldMm / 1000).toFixed(2)} l/m
        </p>
        <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
          <p>
            Mitre ({numMitreWelds}): {mitreWeldMm.toFixed(0)}mm
          </p>
          {numFlanges > 0 && (
            <p>
              Flange ({numFlanges * 2}): {flangeWeldMm.toFixed(0)}mm
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeeFittingCalcResults(props: FittingCalcResultsProps) {
  const {
    specs,
    entry,
    globalSpecs,
    masterData,
    nbToOdMap,
    allWeights,
    allRetainingRings,
    flangeResolution,
    requiredProducts,
  } = props;

  const rawFittingType = specs.fittingType;
  const fittingType = rawFittingType || "Tee";
  const rawNominalDiameterMm = specs.nominalDiameterMm;
  const rawNominalBoreMm = specs.nominalBoreMm;
  const nominalBore = rawNominalDiameterMm || rawNominalBoreMm || 0;

  const isUnequalTeeCalc = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(fittingType);
  const isGussetTee = [
    "GUSSET_TEE",
    "UNEQUAL_GUSSET_TEE",
    "GUSSET_REDUCING_TEE",
    "GUSSETTED_TEE",
  ].includes(fittingType);
  const rawBranchNominalDiameterMm = specs.branchNominalDiameterMm;
  const rawBranchNominalBoreMm = specs.branchNominalBoreMm;
  const rawTeeNominalDiameterMm = specs.teeNominalDiameterMm;
  const branchNB =
    rawBranchNominalDiameterMm || rawBranchNominalBoreMm || rawTeeNominalDiameterMm || nominalBore;
  const rawPipeLengthAMm = specs.pipeLengthAMm;
  const pipeALength = rawPipeLengthAMm || 0;
  const rawPipeLengthBMm = specs.pipeLengthBMm;
  const pipeBLength = rawPipeLengthBMm || 0;
  const rawTeeHeightMm = specs.teeHeightMm;
  const teeHeight = rawTeeHeightMm || 0;
  const rawQuantityValue = specs.quantityValue;
  const quantity = rawQuantityValue || 1;

  const rawPipeEndConfiguration = specs.pipeEndConfiguration;
  const flangeConfig = getFittingFlangeConfig(rawPipeEndConfiguration || "PE", specs.foePosition);
  const numFlanges =
    (flangeConfig.hasInlet ? 1 : 0) +
    (flangeConfig.hasOutlet ? 1 : 0) +
    (flangeConfig.hasBranch ? 1 : 0);

  const rawScheduleNumber = specs.scheduleNumber;
  const schedule = rawScheduleNumber || "";
  const pipeWallThickness = entry.calculation?.wallThicknessMm;

  const rawSteelSpecificationId = specs.steelSpecificationId;
  const steelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const steelSpec = masterData?.steelSpecs?.find((s: SteelSpecItem) => s.id === steelSpecId);
  const rawSteelSpecName = steelSpec?.steelSpecName;
  const steelSpecName = rawSteelSpecName || "";
  const isSABS719 = steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");

  const fittingClass = scheduleToFittingClass(schedule);
  const fittingClassWt = fittingClass ? FITTING_CLASS_WALL_THICKNESS[fittingClass] : undefined;

  const rawFittingClassNB = fittingClassWt?.[nominalBore];
  const fittingRawThickness =
    isSABS719 || !fittingClass
      ? pipeWallThickness || 6
      : rawFittingClassNB || pipeWallThickness || 6;
  const fittingWeldThickness = roundToWeldIncrement(fittingRawThickness);
  const rawBranchClassNB = fittingClassWt?.[branchNB];
  const branchRawThickness =
    isSABS719 || !fittingClass
      ? pipeWallThickness || 6
      : rawBranchClassNB || pipeWallThickness || 6;
  const branchWeldThickness = roundToWeldIncrement(branchRawThickness);

  const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
  const rawNominalBoreOd = nbToOdMap[nominalBore];
  const mainOdMm =
    rawOutsideDiameterMm || (nominalBore ? rawNominalBoreOd || nominalBore * 1.05 : 0);
  const rawBranchOd = nbToOdMap[branchNB];
  const branchOdMm = branchNB ? rawBranchOd || branchNB * 1.05 : 0;
  const rawPipeEndConfiguration2 = specs.pipeEndConfiguration;
  const rawFoePosition = specs.foePosition;
  const flangeConfigCalc = getFittingFlangeConfig(rawPipeEndConfiguration2 || "PE", rawFoePosition);
  const flangeHasInlet = flangeConfigCalc.hasInlet;
  const flangeInletType = flangeConfigCalc.inletType;
  const flangeHasOutlet = flangeConfigCalc.hasOutlet;
  const flangeOutletType = flangeConfigCalc.outletType;
  const flangeHasBranch = flangeConfigCalc.hasBranch;
  const flangeBranchType = flangeConfigCalc.branchType;
  const mainFlangeWeldCount =
    (flangeHasInlet && flangeInletType !== "loose" ? 1 : 0) +
    (flangeHasOutlet && flangeOutletType !== "loose" ? 1 : 0);
  const branchFlangeWeldCount = flangeHasBranch && flangeBranchType !== "loose" ? 1 : 0;
  const rawCalcGussetSectionMm = entry.calculation?.gussetSectionMm;
  const gussetSectionMm = isGussetTee
    ? getGussetSection(nominalBore) || rawCalcGussetSectionMm || 0
    : 0;
  const gussetAreaMm2 = 0.5 * gussetSectionMm * gussetSectionMm;
  const gussetVolumeDm3 = (gussetAreaMm2 * (pipeWallThickness || 0)) / 1e6;
  const singleGussetWeight = gussetVolumeDm3 * 7.85;
  const calculatedGussetWeight = 2 * singleGussetWeight * quantity;
  const rawGussetWeight = entry.calculation?.gussetWeight;
  const gussetWeight = isGussetTee ? rawGussetWeight || calculatedGussetWeight : 0;
  const fittingWeldVolume =
    mainOdMm && pipeWallThickness
      ? calculateFittingWeldVolume({
          mainOdMm,
          mainWallThicknessMm: pipeWallThickness,
          branchOdMm: branchOdMm || undefined,
          branchWallThicknessMm: pipeWallThickness,
          numberOfMainFlangeWelds: mainFlangeWeldCount,
          numberOfBranchFlangeWelds: branchFlangeWeldCount,
          hasTeeJunctionWeld: true,
          gussetSectionMm: gussetSectionMm > 0 ? gussetSectionMm : undefined,
          gussetWallThicknessMm: gussetSectionMm > 0 ? pipeWallThickness : undefined,
        })
      : null;

  const mainRingWeight =
    flangeConfig.inletType === "rotating" || flangeConfig.outletType === "rotating"
      ? retainingRingWeightLookup(
          allRetainingRings,
          nominalBore,
          entry.calculation?.outsideDiameterMm,
          nbToOdMap,
        )
      : 0;
  const branchRingWeight =
    flangeConfig.branchType === "rotating"
      ? retainingRingWeightLookup(allRetainingRings, branchNB, undefined, nbToOdMap)
      : 0;

  const mainRingsCount =
    (flangeConfig.inletType === "rotating" ? 1 : 0) +
    (flangeConfig.outletType === "rotating" ? 1 : 0);
  const totalRingWeight =
    mainRingsCount * mainRingWeight +
    (flangeConfig.branchType === "rotating" ? branchRingWeight : 0);

  const { flangeStandardCode, pressureClassDesignation } = flangeResolution;
  const rawFlangeTypeCode2 = flangeResolution.flangeTypeCode;
  const flangeTypeCode = rawFlangeTypeCode2 || "";

  const mainFlangeWeightPerUnit = flangeWeightOr(
    allWeights,
    nominalBore,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
  );
  const branchFlangeWeightPerUnit = flangeWeightOr(
    allWeights,
    branchNB,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
  );

  const mainFlangeCount = (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
  const branchFlangeCount = flangeConfig.hasBranch ? 1 : 0;
  const dynamicTotalFlangeWeight =
    mainFlangeCount * mainFlangeWeightPerUnit + branchFlangeCount * branchFlangeWeightPerUnit;

  const rawBlankFlangePositions = specs.blankFlangePositions;
  const blankPositions = rawBlankFlangePositions || [];
  const blankFlangeCount = blankPositions.length;
  const blankWeightPerUnit = calculateBlankFlangeWeight(
    allWeights,
    nominalBore,
    pressureClassDesignation,
    flangeStandardCode,
  );
  const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

  const rawPipeEndConfiguration3 = entry.specs.pipeEndConfiguration;
  const hasLooseFlangeConfig = hasLooseFlange(rawPipeEndConfiguration3 || "");
  const tackWeldEnds = hasLooseFlangeConfig ? 1 : 0;
  const tackWeldTotalWeight =
    nominalBore && tackWeldEnds > 0 ? getTackWeldWeight(nominalBore, tackWeldEnds) : 0;

  const rawClosureLengthMm = specs.closureLengthMm;
  const closureLengthMm = rawClosureLengthMm || 0;
  const rawWallThicknessMm = specs.wallThicknessMm;
  const rawCalcWallThicknessMm = entry.calculation?.wallThicknessMm;
  const closureWallThickness =
    rawWallThicknessMm || rawCalcWallThicknessMm || pipeWallThickness || 5;
  const closureTotalWeight =
    nominalBore && closureLengthMm > 0 && closureWallThickness > 0
      ? getClosureWeight(nominalBore, closureLengthMm, closureWallThickness, nbToOdMap)
      : 0;

  const rawStubs = specs.stubs;
  const stubsData: StubCalcData[] = (rawStubs || []).map((stub: any) => {
    const rawNominalBoreMm = stub.nominalBoreMm;
    const sNB = rawNominalBoreMm || 50;
    const rawSNBOd = nbToOdMap[sNB];
    const sOdMm = rawSNBOd || sNB * 1.05;
    const rawSWT = FITTING_CLASS_WALL_THICKNESS["STD"][sNB];
    const sWallThickness = rawSWT || pipeWallThickness || 5;
    const rawStubLengthMm = stub.stubLengthMm;
    const sLengthMm = rawStubLengthMm || 150;
    const sLengthM = sLengthMm / 1000;
    const sPipeWeight = calculatePipeWeightPerMeter(sOdMm, sWallThickness) * sLengthM;
    const sHasFlange = stub.endConfiguration === "flanged" || stub.endConfiguration === "rf";
    const sFlangeWeight = sHasFlange
      ? flangeWeight(allWeights, sNB, pressureClassDesignation, flangeStandardCode, flangeTypeCode)
      : 0;
    const sBlankWeight =
      sHasFlange && stub.hasBlankFlange
        ? calculateBlankFlangeWeight(allWeights, sNB, pressureClassDesignation, flangeStandardCode)
        : 0;
    const sCircMm = Math.PI * sOdMm;
    const STEINMETZ_FACTOR = 2.7;
    const sToMainWeldMm = STEINMETZ_FACTOR * sOdMm;
    const sFlangeWeldMm = sHasFlange ? 2 * sCircMm : 0;
    const rawHasBlankFlange = stub.hasBlankFlange;
    return {
      stubNB: sNB,
      stubLengthMm: sLengthMm,
      stubOdMm: sOdMm,
      stubPipeWeight: sPipeWeight,
      stubFlangeWeight: sFlangeWeight,
      stubBlankWeight: sBlankWeight,
      stubHasFlange: sHasFlange,
      hasBlankFlange: rawHasBlankFlange || false,
      stubToMainWeldMm: sToMainWeldMm,
      stubFlangeWeldMm: sFlangeWeldMm,
      stubCircMm: sCircMm,
    };
  });

  const totalStubPipeWeight = stubsData.reduce(
    (sum: number, s: StubCalcData) => sum + s.stubPipeWeight,
    0,
  );
  const totalStubFlangeWeight = stubsData.reduce(
    (sum: number, s: StubCalcData) => sum + s.stubFlangeWeight,
    0,
  );
  const totalStubBlankWeight = stubsData.reduce(
    (sum: number, s: StubCalcData) => sum + s.stubBlankWeight,
    0,
  );
  const stubFlangeCount = stubsData.filter((s: StubCalcData) => s.stubHasFlange).length;
  const totalStubToMainWeldMm = stubsData.reduce(
    (sum: number, s: StubCalcData) => sum + s.stubToMainWeldMm,
    0,
  );
  const totalStubFlangeWeldMm = stubsData.reduce(
    (sum: number, s: StubCalcData) => sum + s.stubFlangeWeldMm,
    0,
  );

  const rawFittingWeight = entry.calculation.fittingWeight;
  const rawPipeWeight = entry.calculation.pipeWeight;

  const baseWeight =
    (rawFittingWeight || 0) + (rawPipeWeight || 0) + dynamicTotalFlangeWeight + gussetWeight;

  const totalWeight =
    baseWeight +
    totalRingWeight +
    totalBlankFlangeWeight +
    tackWeldTotalWeight +
    closureTotalWeight +
    totalStubPipeWeight +
    totalStubFlangeWeight +
    totalStubBlankWeight;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
    >
      <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
        <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
        <p className="text-lg font-bold text-blue-900">
          {quantity} × {fittingType.replace(/_/g, " ")}
        </p>
        <div className="mt-1 space-y-0.5 text-xs text-blue-700">
          <p>Main: {nominalBore}NB</p>
          {branchNB !== nominalBore && (
            <p>
              {isUnequalTeeCalc ? "Tee" : "Branch"}: {branchNB}NB
            </p>
          )}
          {pipeALength > 0 && <p>Pipe A: {pipeALength}mm</p>}
          {pipeBLength > 0 && <p>Pipe B: {pipeBLength}mm</p>}
          {teeHeight > 0 && <p>Height: {teeHeight}mm</p>}
          {stubsData.map((stub: StubCalcData, idx: number) => (
            <p key={idx} className="text-orange-700">
              Stub {idx + 1}: {stub.stubLengthMm}mm @ {stub.stubNB}NB
            </p>
          ))}
        </div>
      </div>
      {(() => {
        const rawPipeWeight2 = entry.calculation.pipeWeight;
        const totalPipeWeight = rawPipeWeight2 || 0;
        const totalPipeLength = pipeALength + pipeBLength;
        const pipeAWeight =
          totalPipeLength > 0 ? (totalPipeWeight * pipeALength) / totalPipeLength : 0;
        const pipeBWeight =
          totalPipeLength > 0 ? (totalPipeWeight * pipeBLength) / totalPipeLength : 0;

        const mainFlangeCountInner =
          (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
        const branchFlangeCountCalc = flangeConfig.hasBranch ? 1 : 0;
        const allSameNB = branchNB === nominalBore;

        const rawFittingWeight2 = entry.calculation.fittingWeight;

        return (
          <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Weight Breakdown
            </p>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {totalWeight.toFixed(2)}kg
            </p>
            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
              {(rawFittingWeight2 || 0) > 0 && (
                <p>Tee Fitting: {entry.calculation.fittingWeight.toFixed(2)}kg</p>
              )}
              {pipeAWeight > 0 && (
                <p>
                  Pipe A {nominalBore}NB ({pipeALength}mm): {pipeAWeight.toFixed(2)}kg
                </p>
              )}
              {pipeBWeight > 0 && (
                <p>
                  Pipe B {branchNB}NB ({pipeBLength}mm): {pipeBWeight.toFixed(2)}
                  kg
                </p>
              )}
              {allSameNB && numFlanges > 0 && mainFlangeWeightPerUnit > 0 && (
                <p>
                  {numFlanges} × {nominalBore}NB Flange @ {mainFlangeWeightPerUnit.toFixed(2)}kg
                </p>
              )}
              {!allSameNB && mainFlangeCountInner > 0 && mainFlangeWeightPerUnit > 0 && (
                <p>
                  {mainFlangeCountInner} × {nominalBore}NB Flange @{" "}
                  {mainFlangeWeightPerUnit.toFixed(2)}kg
                </p>
              )}
              {!allSameNB && branchFlangeCountCalc > 0 && branchFlangeWeightPerUnit > 0 && (
                <p>
                  1 × {branchNB}NB Flange @ {branchFlangeWeightPerUnit.toFixed(2)}
                  kg
                </p>
              )}
              {totalRingWeight > 0 && <p>R/F Rings: {totalRingWeight.toFixed(2)}kg</p>}
              {totalBlankFlangeWeight > 0 && <p>Blanks: {totalBlankFlangeWeight.toFixed(2)}kg</p>}
              {tackWeldTotalWeight > 0 && <p>Tack Welds: {tackWeldTotalWeight.toFixed(2)}kg</p>}
              {closureTotalWeight > 0 && <p>Closures: {closureTotalWeight.toFixed(2)}kg</p>}
              {isGussetTee && gussetWeight > 0 && (
                <>
                  <p className="font-medium mt-1">
                    2 × Gusset ({getGussetSection(nominalBore)}mm): {gussetWeight.toFixed(2)}kg
                  </p>
                  <p className="text-[10px]">({(gussetWeight / 2).toFixed(2)}kg each)</p>
                </>
              )}
              {stubsData
                .filter((s: StubCalcData) => s.stubPipeWeight > 0)
                .map((stub: StubCalcData, idx: number) => (
                  <p key={`stub-pipe-${idx}`} className="text-orange-600">
                    Stub {stub.stubNB}NB Pipe: {stub.stubPipeWeight.toFixed(2)}kg
                  </p>
                ))}
              {stubsData
                .filter((s: StubCalcData) => s.stubHasFlange)
                .map((stub: StubCalcData, idx: number) => (
                  <p key={`stub-flange-${idx}`} className="text-orange-600">
                    Stub {stub.stubNB}NB Flange: {stub.stubFlangeWeight.toFixed(2)}kg
                  </p>
                ))}
              {stubsData
                .filter((s: StubCalcData) => s.stubBlankWeight > 0)
                .map((stub: StubCalcData, idx: number) => (
                  <p key={`stub-blank-${idx}`} className="text-orange-600">
                    Stub {stub.stubNB}NB Blank: {stub.stubBlankWeight.toFixed(2)}
                    kg
                  </p>
                ))}
            </div>
          </div>
        );
      })()}
      {(() => {
        const mainFlangeCountDisplay =
          (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
        const branchFlangeCountDisplay = flangeConfig.hasBranch ? 1 : 0;
        const allSameNBDisplay = branchNB === nominalBore;
        const baseFlangeCount = mainFlangeCountDisplay + branchFlangeCountDisplay;
        const totalFlangeCountWithStubs = baseFlangeCount + stubFlangeCount;
        const totalFlangeWeightWithStubs = dynamicTotalFlangeWeight + totalStubFlangeWeight;

        if (totalFlangeCountWithStubs === 0) return null;

        const stubFlangesByNB = stubsData
          .filter((s: StubCalcData) => s.stubHasFlange)
          .reduce((acc: Record<number, number>, s: StubCalcData) => {
            const rawVal = acc[s.stubNB];
            acc[s.stubNB] = (rawVal || 0) + 1;
            return acc;
          }, {});

        return (
          <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
            <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
            <p className="text-lg font-bold text-amber-900">{totalFlangeCountWithStubs}</p>
            <div className="mt-1 text-xs text-amber-700">
              {allSameNBDisplay && baseFlangeCount > 0 && (
                <p>
                  {baseFlangeCount} × {nominalBore}NB Flange
                </p>
              )}
              {!allSameNBDisplay && mainFlangeCountDisplay > 0 && (
                <p>
                  {mainFlangeCountDisplay} × {nominalBore}NB Flange
                </p>
              )}
              {!allSameNBDisplay && branchFlangeCountDisplay > 0 && (
                <p>
                  1 × {branchNB}NB {isUnequalTeeCalc ? "Tee " : ""}Flange
                </p>
              )}
              {entries(stubFlangesByNB).map(([nb, count]) => (
                <p key={nb} className="text-orange-700">
                  {count as number} × {nb}NB Stub Flange
                </p>
              ))}
            </div>
            {pressureClassDesignation && (
              <p className="text-xs text-amber-600 mt-1 font-medium">{pressureClassDesignation}</p>
            )}
            {totalFlangeWeightWithStubs > 0 && (
              <p className="text-xs text-amber-500 mt-1 font-semibold">
                {totalFlangeWeightWithStubs.toFixed(2)}kg total
              </p>
            )}
          </div>
        );
      })()}
      {(() => {
        const STEINMETZ_FACTOR = 2.7;
        const mainCircMm = Math.PI * mainOdMm;
        const totalFlangeWeldMm = numFlanges * 2 * mainCircMm;
        const rawCalcGussetSection = entry.calculation?.gussetSectionMm;
        const effectiveGussetSection = getGussetSection(nominalBore) || rawCalcGussetSection || 0;
        const calculatedGussetWeldLengthMm =
          effectiveGussetSection > 0
            ? 2 * (effectiveGussetSection * Math.SQRT2 + 2 * effectiveGussetSection)
            : 0;
        const rawGussetWeldLengthMm = fittingWeldVolume?.gussetWeldLengthMm;
        const gussetWeldLengthMm = isGussetTee
          ? rawGussetWeldLengthMm || calculatedGussetWeldLengthMm
          : 0;
        const teeJunctionWeldMm =
          !isGussetTee && branchOdMm > 0 ? STEINMETZ_FACTOR * branchOdMm : 0;
        const totalWeldLinearMm =
          teeJunctionWeldMm +
          totalFlangeWeldMm +
          gussetWeldLengthMm +
          totalStubToMainWeldMm +
          totalStubFlangeWeldMm;

        if (totalWeldLinearMm === 0 && !fittingWeldVolume) return null;

        const isLateralFitting = ["LATERAL", "REDUCING_LATERAL"].includes(fittingType);
        const angleRange = specs.angleRange as string | undefined;
        const isAngle45OrAbove = angleRange === "60-90" || angleRange === "45-59";
        const junctionWeldLabel = isLateralFitting
          ? isAngle45OrAbove
            ? "Lat Weld 45+"
            : "Lat Weld <45"
          : "Tee Junction";

        return (
          <WeldSummaryCard
            totalVolumeCm3={
              fittingWeldVolume ? fittingWeldVolume.totalVolumeCm3 * quantity : undefined
            }
          >
            {!isGussetTee && teeJunctionWeldMm > 0 && (
              <p>
                {junctionWeldLabel}: {teeJunctionWeldMm.toFixed(0)}mm @{" "}
                {branchWeldThickness?.toFixed(1)}mm
              </p>
            )}
            {isGussetTee && gussetWeldLengthMm > 0 && (
              <p>
                2 × Gusset ({effectiveGussetSection.toFixed(0)}mm): {gussetWeldLengthMm.toFixed(0)}
                mm @ {fittingWeldThickness?.toFixed(1)}mm
              </p>
            )}
            {numFlanges > 0 && (
              <p>
                {numFlanges} × Flange (2×{mainCircMm.toFixed(0)}mm) @{" "}
                {fittingWeldThickness?.toFixed(1)}mm
              </p>
            )}
            {totalStubToMainWeldMm > 0 && (
              <p className="text-orange-600">
                Stub Junction ({stubsData.length}×): {totalStubToMainWeldMm.toFixed(0)}mm
              </p>
            )}
            {totalStubFlangeWeldMm > 0 && (
              <p className="text-orange-600">
                Stub Flanges ({stubFlangeCount}×2): {totalStubFlangeWeldMm.toFixed(0)}mm
              </p>
            )}
            {totalWeldLinearMm > 0 && (
              <p className="font-medium mt-1">{(totalWeldLinearMm / 1000).toFixed(2)} l/m total</p>
            )}
          </WeldSummaryCard>
        );
      })()}
      {requiredProducts.includes("surface_protection") &&
        mainOdMm &&
        pipeWallThickness &&
        (() => {
          const totalLengthMm = (pipeALength || 0) + (pipeBLength || 0) + (teeHeight || 0);
          const pipeLengthM = totalLengthMm / 1000;
          const insideDiameterMm = mainOdMm - 2 * pipeWallThickness;
          const surfaceArea = calculateComprehensiveSurfaceArea({
            outsideDiameterMm: mainOdMm,
            insideDiameterMm,
            pipeLengthM,
            numberOfFlanges: numFlanges,
            dn: nominalBore,
            pressureClass: pressureClassDesignation,
          });
          return (
            <SurfaceAreaDisplay
              externalTotal={surfaceArea.totalExternalAreaM2 * quantity}
              internalTotal={surfaceArea.totalInternalAreaM2 * quantity}
              externalBreakdown={[
                {
                  label: "Pipe",
                  value: surfaceArea.externalPipeAreaM2 * quantity,
                },
                {
                  label: "Flanges",
                  value: surfaceArea.externalFlangeBackAreaM2 * quantity,
                },
              ]}
              internalBreakdown={[
                {
                  label: "Pipe",
                  value: surfaceArea.internalPipeAreaM2 * quantity,
                },
                {
                  label: "Flanges",
                  value: surfaceArea.internalFlangeFaceAreaM2 * quantity,
                },
              ]}
            />
          );
        })()}
    </div>
  );
}

export function FittingCalcResults(props: FittingCalcResultsProps) {
  const rawFittingType = props.specs.fittingType;
  const fittingType = rawFittingType || "Tee";

  const isReducerCalc = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType);
  if (isReducerCalc) {
    return <ReducerCalcResults {...props} />;
  }

  const isOffsetBendCalc = fittingType === "OFFSET_BEND";
  if (isOffsetBendCalc) {
    return <OffsetBendCalcResults {...props} />;
  }

  return <TeeFittingCalcResults {...props} />;
}
