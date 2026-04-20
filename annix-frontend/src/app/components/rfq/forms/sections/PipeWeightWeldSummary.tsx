"use client";

import { STEEL_DENSITY_KG_M3 } from "@annix/product-data/steel";
import {
  closureWeight as getClosureWeight,
  flangeWeldCountPerPipe as getFlangeWeldCountPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  tackWeldEndsPerPipe as getTackWeldEndsPerPipe,
  tackWeldWeight as getTackWeldWeight,
} from "@/app/lib/config/rfq";
import {
  blankFlangeWeight,
  type FlangeTypeWeightRecord,
  flangeWeight,
  retainingRingWeightLookup,
  sansBlankFlangeWeight,
} from "@/app/lib/query/hooks";
import {
  calculateFlangeWeldVolume,
  calculateInsideDiameter,
  calculateTotalSurfaceArea,
} from "@/app/lib/utils/pipeCalculations";
import { calculateBlankFlangeWeight, flangeWeightOr } from "@/app/lib/utils/rfqFlangeCalculations";
import type { FlangeStandardItem, PressureClassItem } from "../shared";
import { SurfaceAreaDisplay } from "../shared";

interface FlangeResolution {
  flangeStandardCode: string;
  pressureClassDesignation: string;
  flangeTypeCode: string;
  effectiveFlangeTypeCode: string;
}

const formatWeight = (weight: number | undefined) => {
  if (weight === undefined || weight === null || Number.isNaN(weight)) return "Not calculated";
  return `${weight.toFixed(2)} kg`;
};

interface PipeWeightWeldSummaryProps {
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  flangeResolution: FlangeResolution;
  allWeights: FlangeTypeWeightRecord[];
  allRetainingRings: any[];
  nbToOdMap: Record<number, number>;
  showSurfaceProtection: boolean;
}

export function PipeWeightWeldSummary(props: PipeWeightWeldSummaryProps) {
  const {
    entry,
    specs,
    globalSpecs,
    masterData,
    flangeResolution,
    allWeights,
    allRetainingRings,
    nbToOdMap,
  } = props;

  return (
    <>
      <WeightBreakdownCard
        entry={entry}
        specs={specs}
        globalSpecs={globalSpecs}
        masterData={masterData}
        flangeResolution={flangeResolution}
        allWeights={allWeights}
        allRetainingRings={allRetainingRings}
        nbToOdMap={nbToOdMap}
      />
      <FlangeCountCard
        entry={entry}
        specs={specs}
        globalSpecs={globalSpecs}
        masterData={masterData}
        flangeResolution={flangeResolution}
        allWeights={allWeights}
        nbToOdMap={nbToOdMap}
      />
      <RetainingRingCard
        entry={entry}
        allRetainingRings={allRetainingRings}
        nbToOdMap={nbToOdMap}
      />
      <WeldCard entry={entry} specs={specs} nbToOdMap={nbToOdMap} />
      {props.showSurfaceProtection &&
        entry.calculation?.outsideDiameterMm &&
        entry.specs.wallThicknessMm && (
          <SurfaceAreaCard entry={entry} globalSpecs={globalSpecs} masterData={masterData} />
        )}
    </>
  );
}

function WeightBreakdownCard(props: {
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  flangeResolution: FlangeResolution;
  allWeights: FlangeTypeWeightRecord[];
  allRetainingRings: any[];
  nbToOdMap: Record<number, number>;
}) {
  const {
    entry,
    specs,
    globalSpecs,
    masterData,
    flangeResolution,
    allWeights,
    allRetainingRings,
    nbToOdMap,
  } = props;

  const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;
  const configUpper = (rawPipeEndConfiguration || "PE").toUpperCase();
  const hasRotatingFlange = ["FOE_RF", "2X_RF"].includes(configUpper);
  let backingRingTotalWeight = 0;
  if (hasRotatingFlange) {
    const backingRingCountPerPipe = configUpper === "FOE_RF" ? 1 : configUpper === "2X_RF" ? 2 : 0;
    const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
    const totalBackingRings = backingRingCountPerPipe * (rawCalculatedPipeCount || 0);
    const rawNominalBoreMm = entry.specs.nominalBoreMm;
    const nb = rawNominalBoreMm || 100;
    const ringWeightEach = retainingRingWeightLookup(
      allRetainingRings,
      nb,
      entry.calculation?.outsideDiameterMm,
      nbToOdMap,
    );
    backingRingTotalWeight = ringWeightEach * totalBackingRings;
  }

  const rawPipeEndConfiguration3 = entry.specs.pipeEndConfiguration;
  const physicalFlanges = getPhysicalFlangeCount(rawPipeEndConfiguration3 || "PE");
  const rawCalculatedPipeCount2 = entry.calculation?.calculatedPipeCount;
  const totalFlanges = physicalFlanges * (rawCalculatedPipeCount2 || 0);
  const nominalBore = specs.nominalBoreMm;

  const { flangeStandardCode, pressureClassDesignation, flangeTypeCode } = flangeResolution;

  const rawFlangeWeightPerUnit = entry.calculation?.flangeWeightPerUnit;
  const flangeWeightPerUnit = flangeWeightOr(
    allWeights,
    nominalBore,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
    rawFlangeWeightPerUnit || 0,
  );
  const dynamicTotalFlangeWeight = totalFlanges * flangeWeightPerUnit;

  const rawBlankFlangePositions = specs.blankFlangePositions;
  const blankPositions = rawBlankFlangePositions || [];
  const rawCalculatedPipeCount3 = entry.calculation?.calculatedPipeCount;
  const blankFlangeCount = blankPositions.length * (rawCalculatedPipeCount3 || 0);
  const blankWeightPerUnit = calculateBlankFlangeWeight(
    allWeights,
    nominalBore,
    pressureClassDesignation,
    flangeStandardCode,
  );
  const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

  const rawPipeEndConfiguration4 = specs.pipeEndConfiguration;
  const tackWeldEnds = getTackWeldEndsPerPipe(rawPipeEndConfiguration4 || "PE");
  const rawCalculatedPipeCount4 = entry.calculation?.calculatedPipeCount;
  const tackWeldTotalWeight =
    nominalBore && tackWeldEnds > 0
      ? getTackWeldWeight(nominalBore, tackWeldEnds) * (rawCalculatedPipeCount4 || 0)
      : 0;

  const rawClosureLengthMm = specs.closureLengthMm;
  const closureLengthMm = rawClosureLengthMm || 0;
  const rawWallThicknessMm = specs.wallThicknessMm;
  const calcWallThicknessMm = entry.calculation?.wallThicknessMm;
  const wallThickness = rawWallThicknessMm || calcWallThicknessMm || 0;
  const rawCalculatedPipeCount5 = entry.calculation?.calculatedPipeCount;
  const closureTotalWeight =
    nominalBore && closureLengthMm > 0 && wallThickness > 0
      ? getClosureWeight(nominalBore, closureLengthMm, wallThickness, nbToOdMap) *
        (rawCalculatedPipeCount5 || 0)
      : 0;

  const isSpigotPipe = specs.pipeType === "spigot";
  const rawNumberOfSpigots = specs.numberOfSpigots;
  const spigotCount = rawNumberOfSpigots || 0;
  const rawSpigotNominalBoreMm = specs.spigotNominalBoreMm;
  const spigotNb = rawSpigotNominalBoreMm || 0;
  const rawSpigotHeightMm = specs.spigotHeightMm;
  const spigotHeight = rawSpigotHeightMm || 150;
  const rawSpigotFlangeConfig = specs.spigotFlangeConfig;
  const spigotFlangeConfig = rawSpigotFlangeConfig || "PE";
  const rawSpigotBlankFlanges = specs.spigotBlankFlanges;
  const spigotBlankFlanges = rawSpigotBlankFlanges || [];
  const rawSpigotNb = nbToOdMap[spigotNb];
  const spigotOd = rawSpigotNb || spigotNb * 1.1;
  const spigotWt = spigotOd < 100 ? 3.2 : spigotOd < 200 ? 4.5 : 6.0;
  const spigotId = spigotOd - 2 * spigotWt;
  const singleSpigotWeight =
    isSpigotPipe && spigotNb > 0
      ? (((Math.PI * (spigotOd ** 2 - spigotId ** 2)) / 4) *
          (spigotHeight / 1000) *
          STEEL_DENSITY_KG_M3) /
        1000000
      : 0;
  const rawCalculatedPipeCount6 = entry.calculation?.calculatedPipeCount;
  const totalSpigotWeight = singleSpigotWeight * spigotCount * (rawCalculatedPipeCount6 || 0);

  const hasSpigotFlanges =
    isSpigotPipe && (spigotFlangeConfig === "FAE" || spigotFlangeConfig === "RF");
  const isSpigotRF = spigotFlangeConfig === "RF";
  const rawSpigotFlangeStandardId = specs.spigotFlangeStandardId;
  const specsFlangeStandardId = specs.flangeStandardId;
  const gsFlangeStandardId = globalSpecs?.flangeStandardId;
  const spigotFlangeStdId =
    rawSpigotFlangeStandardId || specsFlangeStandardId || gsFlangeStandardId;
  const rawSpigotFlangePressureClassId = specs.spigotFlangePressureClassId;
  const specsFlangePressureClassId = specs.flangePressureClassId;
  const gsFlangePressureClassId = globalSpecs?.flangePressureClassId;
  const spigotPressureClassId =
    rawSpigotFlangePressureClassId || specsFlangePressureClassId || gsFlangePressureClassId;
  const spigotFlangeStd = masterData?.flangeStandards?.find(
    (s: FlangeStandardItem) => s.id === spigotFlangeStdId,
  );
  const rawCode = spigotFlangeStd?.code;
  const spigotFlangeStdCode = rawCode || "";
  const spigotPressureClass = masterData?.pressureClasses?.find(
    (p: PressureClassItem) => p.id === spigotPressureClassId,
  );
  const rawDesignation = spigotPressureClass?.designation;
  const spigotPressureClassDesignation = rawDesignation || "";
  const rawSpigotFlangeTypeCode = specs.spigotFlangeTypeCode;
  const specsFlangeTypeCode = specs.flangeTypeCode;
  const gsFlangeTypeCode = globalSpecs?.flangeTypeCode;
  const spigotFlangeTypeCodeVal =
    rawSpigotFlangeTypeCode || specsFlangeTypeCode || gsFlangeTypeCode;

  const singleSpigotFlangeWeight =
    hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
      ? flangeWeight(
          allWeights,
          spigotNb,
          spigotPressureClassDesignation,
          spigotFlangeStdCode,
          spigotFlangeTypeCodeVal,
        ) || 0
      : 0;
  const rawCalculatedPipeCount7 = entry.calculation?.calculatedPipeCount;
  const totalSpigotFlangeCount = hasSpigotFlanges
    ? spigotCount * (rawCalculatedPipeCount7 || 0)
    : 0;
  const totalSpigotFlangeWeight = singleSpigotFlangeWeight * totalSpigotFlangeCount;

  const singleSpigotRingWeight =
    isSpigotRF && spigotNb
      ? retainingRingWeightLookup(allRetainingRings, spigotNb, undefined, nbToOdMap) || 0
      : 0;
  const totalSpigotRingWeight = singleSpigotRingWeight * totalSpigotFlangeCount;

  const rawCalculatedPipeCount8 = entry.calculation?.calculatedPipeCount;
  const spigotBlankCount = spigotBlankFlanges.length * (rawCalculatedPipeCount8 || 0);
  const isSans1123Spigot =
    (spigotFlangeStdCode.toUpperCase().includes("SABS") ||
      spigotFlangeStdCode.toUpperCase().includes("SANS")) &&
    spigotFlangeStdCode.includes("1123");
  const singleSpigotBlankWeight =
    hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
      ? (isSans1123Spigot
          ? sansBlankFlangeWeight(allWeights, spigotNb, spigotPressureClassDesignation)
          : blankFlangeWeight(allWeights, spigotNb, spigotPressureClassDesignation)) || 0
      : 0;
  const totalSpigotBlankWeight = singleSpigotBlankWeight * spigotBlankCount;

  const isPuddlePipe = specs.pipeType === "puddle";
  const rawPuddleFlangeOdMm = specs.puddleFlangeOdMm;
  const puddleFlangeOd = rawPuddleFlangeOdMm || 0;
  const rawPuddleFlangeThicknessMm = specs.puddleFlangeThicknessMm;
  const puddleFlangeThickness = rawPuddleFlangeThicknessMm || 0;
  const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
  const pipeOdMm = rawOutsideDiameterMm || 0;
  const singlePuddleFlangeWeight =
    isPuddlePipe && puddleFlangeOd > 0 && puddleFlangeThickness > 0 && pipeOdMm > 0
      ? Math.PI *
        ((puddleFlangeOd / 2000) ** 2 - (pipeOdMm / 2000) ** 2) *
        (puddleFlangeThickness / 1000) *
        STEEL_DENSITY_KG_M3
      : 0;
  const rawCalculatedPipeCount9 = entry.calculation?.calculatedPipeCount;
  const totalPuddleFlangeWeight = singlePuddleFlangeWeight * (rawCalculatedPipeCount9 || 0);

  const rawTotalPipeWeight = entry.calculation.totalPipeWeight;
  const totalWeight =
    (rawTotalPipeWeight || 0) +
    dynamicTotalFlangeWeight +
    backingRingTotalWeight +
    totalBlankFlangeWeight +
    tackWeldTotalWeight +
    closureTotalWeight +
    totalSpigotWeight +
    totalSpigotFlangeWeight +
    totalSpigotRingWeight +
    totalSpigotBlankWeight +
    totalPuddleFlangeWeight;

  return (
    <div className="bg-green-50 p-2 rounded text-center border border-green-200">
      <p className="text-xs text-green-800 font-medium">Weight Breakdown</p>
      <p className="text-lg font-bold text-green-900">{formatWeight(totalWeight)}</p>
      <div className="text-xs text-green-600 mt-1">
        <p>Pipe: {formatWeight(entry.calculation.totalPipeWeight)}</p>
        {dynamicTotalFlangeWeight > 0 && <p>Flanges: {dynamicTotalFlangeWeight.toFixed(2)}kg</p>}
        {backingRingTotalWeight > 0 && <p>R/F Rings: {backingRingTotalWeight.toFixed(2)}kg</p>}
        {totalBlankFlangeWeight > 0 && <p>Blanks: {totalBlankFlangeWeight.toFixed(2)}kg</p>}
        {tackWeldTotalWeight > 0 && <p>Tack Welds: {tackWeldTotalWeight.toFixed(2)}kg</p>}
        {closureTotalWeight > 0 && <p>Closures: {closureTotalWeight.toFixed(2)}kg</p>}
        {totalSpigotWeight > 0 && (
          <p>
            Spigots: {totalSpigotWeight.toFixed(2)}kg ({spigotCount}x{singleSpigotWeight.toFixed(2)}
            kg)
          </p>
        )}
        {totalSpigotFlangeWeight > 0 && (
          <p>
            Spigot Flanges: {totalSpigotFlangeWeight.toFixed(2)}kg ({totalSpigotFlangeCount}x
            {singleSpigotFlangeWeight.toFixed(2)}kg)
          </p>
        )}
        {totalSpigotRingWeight > 0 && (
          <p>
            Spigot R/F Rings: {totalSpigotRingWeight.toFixed(2)}kg ({totalSpigotFlangeCount}x
            {singleSpigotRingWeight.toFixed(2)}kg)
          </p>
        )}
        {totalSpigotBlankWeight > 0 && (
          <p>
            Spigot Blanks: {totalSpigotBlankWeight.toFixed(2)}kg ({spigotBlankCount}x
            {singleSpigotBlankWeight.toFixed(2)}kg)
          </p>
        )}
        {totalPuddleFlangeWeight > 0 && (
          <p>Puddle Flange: {totalPuddleFlangeWeight.toFixed(2)}kg</p>
        )}
      </div>
    </div>
  );
}

function FlangeCountCard(props: {
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  flangeResolution: FlangeResolution;
  allWeights: FlangeTypeWeightRecord[];
  nbToOdMap: Record<number, number>;
}) {
  const { entry, specs, globalSpecs, masterData, flangeResolution, allWeights } = props;

  const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;
  const physicalFlanges = getPhysicalFlangeCount(rawPipeEndConfiguration || "PE");
  const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
  const totalFlanges = physicalFlanges * (rawCalculatedPipeCount || 0);
  const nominalBore = specs.nominalBoreMm;

  const { flangeStandardCode, pressureClassDesignation, flangeTypeCode } = flangeResolution;

  const rawFlangeWeightPerUnit = entry.calculation?.flangeWeightPerUnit;
  const flangeWeightPerUnit = flangeWeightOr(
    allWeights,
    nominalBore,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
    rawFlangeWeightPerUnit || 0,
  );
  const regularFlangeWeight = totalFlanges * flangeWeightPerUnit;

  const rawBlankFlangePositions = specs.blankFlangePositions;
  const blankPositions = rawBlankFlangePositions || [];
  const rawCalculatedPipeCount2 = entry.calculation?.calculatedPipeCount;
  const blankFlangeCount = blankPositions.length * (rawCalculatedPipeCount2 || 0);
  const blankWeightPerUnit = calculateBlankFlangeWeight(
    allWeights,
    nominalBore,
    pressureClassDesignation,
    flangeStandardCode,
  );
  const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

  const isPuddlePipe = specs.pipeType === "puddle";
  const hasPuddleFlange = isPuddlePipe && specs.puddleFlangeOdMm && specs.puddleFlangeThicknessMm;
  const rawPuddleFlangeOdMm = specs.puddleFlangeOdMm;
  const puddleOd = rawPuddleFlangeOdMm || 0;
  const rawPuddleFlangeThicknessMm = specs.puddleFlangeThicknessMm;
  const puddleThickness = rawPuddleFlangeThicknessMm || 0;
  const puddlePcd = specs.puddleFlangePcdMm;
  const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
  const pipeOd = rawOutsideDiameterMm || 0;
  const rawCalculatedPipeCount3 = entry.calculation?.calculatedPipeCount;
  const numPipes = rawCalculatedPipeCount3 || 1;
  const steelDensityKgM3 = STEEL_DENSITY_KG_M3;
  const singlePuddleWeight =
    hasPuddleFlange && pipeOd > 0
      ? Math.PI *
        ((puddleOd / 2000) ** 2 - (pipeOd / 2000) ** 2) *
        (puddleThickness / 1000) *
        steelDensityKgM3
      : 0;
  const totalPuddleWeight = singlePuddleWeight * numPipes;
  const puddleFlangeCount = hasPuddleFlange ? numPipes : 0;

  const isSpigotPipe = specs.pipeType === "spigot";
  const rawNumberOfSpigots = specs.numberOfSpigots;
  const spigotCount = rawNumberOfSpigots || 0;
  const rawSpigotNominalBoreMm = specs.spigotNominalBoreMm;
  const spigotNb = rawSpigotNominalBoreMm || 0;
  const rawSpigotFlangeConfig = specs.spigotFlangeConfig;
  const spigotFlangeConfig = rawSpigotFlangeConfig || "PE";
  const hasSpigotFlanges =
    isSpigotPipe && (spigotFlangeConfig === "FAE" || spigotFlangeConfig === "RF");
  const rawSpigotFlangeStandardId = specs.spigotFlangeStandardId;
  const specsFlangeStandardId = specs.flangeStandardId;
  const gsFlangeStandardId = globalSpecs?.flangeStandardId;
  const spigotFlangeStdId =
    rawSpigotFlangeStandardId || specsFlangeStandardId || gsFlangeStandardId;
  const rawSpigotFlangePressureClassId = specs.spigotFlangePressureClassId;
  const specsFlangePressureClassId = specs.flangePressureClassId;
  const gsFlangePressureClassId = globalSpecs?.flangePressureClassId;
  const spigotPressureClassId =
    rawSpigotFlangePressureClassId || specsFlangePressureClassId || gsFlangePressureClassId;
  const spigotFlangeStd = masterData.flangeStandards?.find(
    (s: FlangeStandardItem) => s.id === spigotFlangeStdId,
  );
  const rawCode = spigotFlangeStd?.code;
  const spigotFlangeStdCode = rawCode || "";
  const spigotPressureClass = masterData.pressureClasses?.find(
    (p: PressureClassItem) => p.id === spigotPressureClassId,
  );
  const rawDesignation = spigotPressureClass?.designation;
  const spigotPressureClassDesignation = rawDesignation || "";
  const rawSpigotFlangeTypeCode = specs.spigotFlangeTypeCode;
  const specsFlangeTypeCode = specs.flangeTypeCode;
  const gsFlangeTypeCode = globalSpecs?.flangeTypeCode;
  const spigotFlangeTypeCodeVal =
    rawSpigotFlangeTypeCode || specsFlangeTypeCode || gsFlangeTypeCode;
  const spigotFlangeWeightPerUnit =
    hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
      ? flangeWeight(
          allWeights,
          spigotNb,
          spigotPressureClassDesignation,
          spigotFlangeStdCode,
          spigotFlangeTypeCodeVal,
        ) || 0
      : 0;
  const totalSpigotFlangeCount = hasSpigotFlanges ? spigotCount * numPipes : 0;
  const totalSpigotFlangeWeight = spigotFlangeWeightPerUnit * totalSpigotFlangeCount;

  const rawSpigotBlankFlanges = specs.spigotBlankFlanges;
  const spigotBlankPositions = rawSpigotBlankFlanges || [];
  const spigotBlankCount = spigotBlankPositions.length * numPipes;
  const isSans1123Spigot =
    (spigotFlangeStdCode.toUpperCase().includes("SABS") ||
      spigotFlangeStdCode.toUpperCase().includes("SANS")) &&
    spigotFlangeStdCode.includes("1123");
  const spigotBlankWeightPerUnit =
    hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
      ? (isSans1123Spigot
          ? sansBlankFlangeWeight(allWeights, spigotNb, spigotPressureClassDesignation)
          : blankFlangeWeight(allWeights, spigotNb, spigotPressureClassDesignation)) || 0
      : 0;
  const totalSpigotBlankWeight = spigotBlankWeightPerUnit * spigotBlankCount;

  const totalFlangeWeight =
    regularFlangeWeight + totalBlankFlangeWeight + totalSpigotFlangeWeight + totalSpigotBlankWeight;
  const grandTotalFlangeCount =
    totalFlanges + blankFlangeCount + puddleFlangeCount + totalSpigotFlangeCount + spigotBlankCount;

  return (
    <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
      <p className="text-[10px] text-amber-800 font-medium">Total Flanges</p>
      <p className="text-lg font-bold text-amber-900">{grandTotalFlangeCount}</p>
      <div className="text-[10px] text-amber-700 mt-0.5">
        {totalFlanges > 0 && (
          <p>
            {totalFlanges} x {nominalBore}NB Flange {pressureClassDesignation}
          </p>
        )}
        {blankFlangeCount > 0 && (
          <p>
            {blankFlangeCount} x {nominalBore}NB Blank {pressureClassDesignation}
          </p>
        )}
        {puddleFlangeCount > 0 && (
          <p>
            {puddleFlangeCount} x Puddle Flange (OD:{puddleOd}mm
            {puddlePcd ? ` PCD:${puddlePcd}mm` : ""})
          </p>
        )}
        {totalSpigotFlangeCount > 0 && (
          <p>
            {totalSpigotFlangeCount} x {spigotNb}NB Spigot Flange {spigotPressureClassDesignation}
          </p>
        )}
        {spigotBlankCount > 0 && (
          <p>
            {spigotBlankCount} x {spigotNb}NB Spigot Blank {spigotPressureClassDesignation}
          </p>
        )}
      </div>
      <div className="text-[10px] text-amber-500 mt-0.5">
        {totalFlanges > 0 && (
          <p>
            {totalFlanges} x {flangeWeightPerUnit.toFixed(2)}kg ={" "}
            <span className="font-semibold text-amber-600">{regularFlangeWeight.toFixed(2)}kg</span>
          </p>
        )}
        {blankFlangeCount > 0 && (
          <p>
            {blankFlangeCount} x {blankWeightPerUnit.toFixed(2)}kg ={" "}
            <span className="font-semibold text-amber-600">
              {totalBlankFlangeWeight.toFixed(2)}kg
            </span>
          </p>
        )}
        {totalPuddleWeight > 0 && (
          <p>
            {puddleFlangeCount} x {singlePuddleWeight.toFixed(2)}kg ={" "}
            <span className="font-semibold text-amber-600">{totalPuddleWeight.toFixed(2)}kg</span>
          </p>
        )}
        {totalSpigotFlangeCount > 0 && (
          <p>
            {totalSpigotFlangeCount} x {spigotFlangeWeightPerUnit.toFixed(2)}kg ={" "}
            <span className="font-semibold text-amber-600">
              {totalSpigotFlangeWeight.toFixed(2)}kg
            </span>
          </p>
        )}
        {spigotBlankCount > 0 && (
          <p>
            {spigotBlankCount} x {spigotBlankWeightPerUnit.toFixed(2)}kg ={" "}
            <span className="font-semibold text-amber-600">
              {totalSpigotBlankWeight.toFixed(2)}kg
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function RetainingRingCard(props: {
  entry: any;
  allRetainingRings: any[];
  nbToOdMap: Record<number, number>;
}) {
  const { entry, allRetainingRings, nbToOdMap } = props;

  const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;
  const configUpper = (rawPipeEndConfiguration || "PE").toUpperCase();
  const hasRotatingFlange = ["FOE_RF", "2X_RF"].includes(configUpper);
  if (!hasRotatingFlange) return null;

  const backingRingCountPerPipe = configUpper === "FOE_RF" ? 1 : configUpper === "2X_RF" ? 2 : 0;
  const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
  const totalBackingRings = backingRingCountPerPipe * (rawCalculatedPipeCount || 0);

  const rawNominalBoreMm = entry.specs.nominalBoreMm;
  const nb = rawNominalBoreMm || 100;
  const ringWeightEach = retainingRingWeightLookup(
    allRetainingRings,
    nb,
    entry.calculation?.outsideDiameterMm,
    nbToOdMap,
  );
  const totalWeight = ringWeightEach * totalBackingRings;

  return (
    <div className="bg-orange-50 p-2 rounded text-center border border-orange-200">
      <p className="text-xs text-orange-700 font-medium">R/F Retaining Rings</p>
      <p className="text-lg font-bold text-orange-900">{totalWeight.toFixed(2)} kg</p>
      <p className="text-xs text-orange-600">
        {totalBackingRings} rings x {ringWeightEach.toFixed(2)}kg
      </p>
    </div>
  );
}

function WeldCard(props: { entry: any; specs: any; nbToOdMap: Record<number, number> }) {
  const { entry, specs, nbToOdMap } = props;

  const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;
  const pipeEndConfig = rawPipeEndConfiguration || "PE";
  const baseFlangeWeldsPerPipe = getFlangeWeldCountPerPipe(pipeEndConfig);
  const isPuddlePipe = specs.pipeType === "puddle";
  const hasPuddleFlange = isPuddlePipe && specs.puddleFlangeOdMm && specs.puddleFlangeThicknessMm;
  const flangeWeldsPerPipe = baseFlangeWeldsPerPipe + (hasPuddleFlange ? 1 : 0);
  const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
  const numPipes = rawCalculatedPipeCount || 1;
  const totalFlangeWelds = flangeWeldsPerPipe * numPipes;

  const tackWeldEnds = getTackWeldEndsPerPipe(pipeEndConfig);
  const totalTackWeldEnds = tackWeldEnds * numPipes;
  const tackWeldLengthMm = totalTackWeldEnds * 8 * 20;
  const tackWeldLengthM = tackWeldLengthMm / 1000;

  const circumferenceMm = Math.PI * entry.calculation.outsideDiameterMm;
  const flangeWeldLengthM = (circumferenceMm * 2 * totalFlangeWelds) / 1000;

  const isSpigotPipe = specs.pipeType === "spigot";
  const rawNumberOfSpigots = specs.numberOfSpigots;
  const spigotCount = rawNumberOfSpigots || 0;
  const rawSpigotNominalBoreMm = specs.spigotNominalBoreMm;
  const spigotNb = rawSpigotNominalBoreMm || 0;
  const rawSpigotNb = nbToOdMap[spigotNb];
  const spigotOdMm = rawSpigotNb || spigotNb * 1.1;
  const spigotCircumferenceMm = Math.PI * spigotOdMm;
  const totalSpigotWelds = isSpigotPipe && spigotNb > 0 ? spigotCount * numPipes : 0;
  const spigotWeldLengthM = (spigotCircumferenceMm * totalSpigotWelds) / 1000;

  const totalWelds = totalFlangeWelds + totalSpigotWelds;
  const totalWeldLengthM = flangeWeldLengthM + tackWeldLengthM + spigotWeldLengthM;

  if (totalWelds === 0 && totalTackWeldEnds === 0) return null;

  let weldVolumeInfo = null;
  if (
    entry.calculation?.numberOfFlangeWelds > 0 &&
    entry.calculation?.outsideDiameterMm &&
    entry.specs.wallThicknessMm
  ) {
    const weldVolume = calculateFlangeWeldVolume({
      outsideDiameterMm: entry.calculation.outsideDiameterMm,
      wallThicknessMm: entry.specs.wallThicknessMm,
      numberOfFlangeWelds: entry.calculation.numberOfFlangeWelds,
    });
    const totalVolumeCm3 = weldVolume.volumeCm3 * numPipes;
    weldVolumeInfo = { totalVolumeCm3, legSizeMm: weldVolume.legSizeMm };
  }

  return (
    <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
      <p className="text-xs text-purple-800 font-medium">Welds</p>
      <p className="text-lg font-bold text-purple-900">{totalWelds}</p>
      <div className="text-xs text-purple-600 mt-0.5">
        {totalFlangeWelds > 0 && (
          <p>
            {totalFlangeWelds} flange x 2x{circumferenceMm.toFixed(0)}mm ={" "}
            {flangeWeldLengthM.toFixed(2)} l/m
          </p>
        )}
        {totalSpigotWelds > 0 && (
          <p>
            {totalSpigotWelds} spigot x {spigotCircumferenceMm.toFixed(0)}mm ={" "}
            {spigotWeldLengthM.toFixed(2)} l/m
          </p>
        )}
        {totalTackWeldEnds > 0 && (
          <p>
            {totalTackWeldEnds} L/F tack = {tackWeldLengthM.toFixed(2)} l/m
          </p>
        )}
      </div>
      <p className="text-xs text-purple-800 font-semibold mt-1">
        Total: {totalWeldLengthM.toFixed(2)} l/m
      </p>
      {weldVolumeInfo && (
        <>
          <p className="text-xs text-purple-800 font-medium mt-1">Weld Volume</p>
          <p className="text-sm font-bold text-purple-900">
            {weldVolumeInfo.totalVolumeCm3.toFixed(1)} cm³{" "}
            <span className="font-normal text-xs text-purple-600">
              ({weldVolumeInfo.legSizeMm.toFixed(1)}mm leg)
            </span>
          </p>
        </>
      )}
    </div>
  );
}

function SurfaceAreaCard(props: { entry: any; globalSpecs: any; masterData: any }) {
  const { entry, globalSpecs, masterData } = props;

  const rawFlangePressureClassId = entry.specs.flangePressureClassId;
  const gsFlangePressureClassId = globalSpecs?.flangePressureClassId;
  const pressureClassId = rawFlangePressureClassId || gsFlangePressureClassId;
  const pressureClassDesignation = pressureClassId
    ? masterData.pressureClasses?.find((p: PressureClassItem) => p.id === pressureClassId)
        ?.designation
    : undefined;
  const rawIndividualPipeLength = entry.specs.individualPipeLength;
  const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
  const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;
  const rawPipeEndConfiguration2 = entry.specs.pipeEndConfiguration;
  const surfaceAreaResult = calculateTotalSurfaceArea({
    outsideDiameterMm: entry.calculation.outsideDiameterMm,
    insideDiameterMm: calculateInsideDiameter(
      entry.calculation.outsideDiameterMm,
      entry.specs.wallThicknessMm,
    ),
    individualPipeLengthM: rawIndividualPipeLength || 0,
    numberOfPipes: rawCalculatedPipeCount || 0,
    hasFlangeEnd1: (rawPipeEndConfiguration || "PE") !== "PE",
    hasFlangeEnd2: ["FBE", "FOE_RF", "2X_RF"].includes(rawPipeEndConfiguration2 || "PE"),
    dn: entry.specs.nominalBoreMm,
    pressureClass: pressureClassDesignation,
  });
  const rawCalculatedPipeCount2 = entry.calculation?.calculatedPipeCount;
  const numPipes = rawCalculatedPipeCount2 || 0;

  return (
    <SurfaceAreaDisplay
      externalTotal={surfaceAreaResult.total.totalExternalAreaM2}
      internalTotal={surfaceAreaResult.total.totalInternalAreaM2}
      externalBreakdown={[
        {
          label: "Pipe",
          value: surfaceAreaResult.perPipe.externalPipeAreaM2 * numPipes,
        },
        {
          label: "Flanges",
          value: surfaceAreaResult.perPipe.externalFlangeBackAreaM2 * numPipes,
        },
      ]}
      internalBreakdown={[
        {
          label: "Pipe",
          value: surfaceAreaResult.perPipe.internalPipeAreaM2 * numPipes,
        },
        {
          label: "Flanges",
          value: surfaceAreaResult.perPipe.internalFlangeFaceAreaM2 * numPipes,
        },
      ]}
    />
  );
}
