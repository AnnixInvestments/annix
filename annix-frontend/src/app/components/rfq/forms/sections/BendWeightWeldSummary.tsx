"use client";

import type { UseBendCalculationsResult } from "@/app/hooks/useBendCalculations";
import {
  FITTING_CLASS_WALL_THICKNESS,
  fittingFlangeConfig as getFittingFlangeConfig,
  tackWeldEndsPerBend,
} from "@/app/lib/config/rfq";
import type { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";
import type { FlangeTypeWeightRecord } from "@/app/lib/query/hooks";
import { flangeWeightOr, scheduleToFittingClass } from "@/app/lib/utils/rfqFlangeCalculations";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import { SurfaceAreaDisplay } from "../shared";

interface FlangeResolution {
  flangeStandardCode: string;
  pressureClassDesignation: string;
  flangeTypeCode: string;
}

interface BendWeightWeldSummaryProps {
  bendCalcs: UseBendCalculationsResult;
  specs: Record<string, any>;
  entry: { calculation?: Record<string, any>; specs?: Record<string, any> };
  flangeResolution: FlangeResolution;
  allWeights: FlangeTypeWeightRecord[];
  nbToOdMap: Record<number, number>;
  requiredProducts: string[];
  flangeSpecs: FlangeSpecData | null;
}

export function BendWeightWeldSummary(props: BendWeightWeldSummaryProps) {
  const {
    bendCalcs,
    specs,
    entry,
    flangeResolution,
    allWeights,
    nbToOdMap,
    requiredProducts,
    flangeSpecs,
  } = props;

  const {
    flangeCounts: {
      bendFlangeCount,
      bendFlangeWeldCount,
      stub1FlangeCount,
      stub2FlangeCount,
      totalFlanges,
    },
    weightBreakdown: {
      bendWeightOnly,
      tangentWeight,
      pipeAWeight,
      stub1PipeWeight,
      stub2PipeWeight,
      totalFlangeWeight: dynamicTotalFlangeWeight,
      totalBlankFlangeWeight,
      tackWeldTotalWeight,
      closureTotalWeight,
      totalWeight,
    },
    weldAnalysis: {
      mitreWeldCount,
      mitreWeldLinear,
      mainFlangeWeldLinear,
      stub1FlangeWeldLinear,
      stub2FlangeWeldLinear,
      branchFlangeWeldLinear,
      totalFlangeWeldLinear,
      buttWeldCount,
      buttWeldLinear,
      saddleWeldLinear,
      weldVolume,
    },
    dimensions: {
      cfDisplay,
      mainLengthDisplay,
      stubLengthDisplay,
      mainOdMm,
      mainCircumference,
      effectiveWt,
    },
    isSweepTee,
    isSABS719,
  } = bendCalcs;

  const rawStubs = specs.stubs;
  const stubs = rawStubs || [];
  const stub1NB = stubs[0]?.nominalBoreMm;
  const stub2NB = stubs[1]?.nominalBoreMm;
  const rawLengthMm = stubs[0]?.lengthMm;
  const stub0LegacyLength = stubs[0]?.length;
  const stub1Length = rawLengthMm || stub0LegacyLength || 0;
  const rawLengthMm2 = stubs[1]?.lengthMm;
  const stub1LegacyLength = stubs[1]?.length;
  const stub2Length = rawLengthMm2 || stub1LegacyLength || 0;
  const dn = specs.nominalBoreMm;
  const rawScheduleNumber = specs.scheduleNumber;
  const schedule = rawScheduleNumber || "";
  const calcWallThickness = entry.calculation?.wallThicknessMm;
  const pipeWallThickness = calcWallThickness || null;
  const fittingClass = scheduleToFittingClass(schedule);
  const fittingClassWt = fittingClass ? FITTING_CLASS_WALL_THICKNESS[fittingClass] : undefined;
  const rawStub1NBWt = fittingClassWt?.[stub1NB];
  const stub1RawWt =
    isSABS719 || !fittingClass ? pipeWallThickness : rawStub1NBWt || pipeWallThickness;
  const rawStub2NBWt = fittingClassWt?.[stub2NB];
  const stub2RawWt =
    isSABS719 || !fittingClass ? pipeWallThickness : rawStub2NBWt || pipeWallThickness;
  const stub1Wt = stub1NB && stub1RawWt ? roundToWeldIncrement(stub1RawWt) : 0;
  const stub2Wt = stub2NB && stub2RawWt ? roundToWeldIncrement(stub2RawWt) : 0;

  const { flangeStandardCode, pressureClassDesignation, flangeTypeCode } = flangeResolution;

  const rawFlangeWeightPerUnit = entry.calculation?.flangeWeightPerUnit;

  const mainFlangeWeightPerUnit = flangeWeightOr(
    allWeights,
    dn,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
    rawFlangeWeightPerUnit || 0,
  );
  const stub1FlangeWeightPerUnit = flangeWeightOr(
    allWeights,
    stub1NB,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
  );
  const stub2FlangeWeightPerUnit = flangeWeightOr(
    allWeights,
    stub2NB,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
  );

  const rawNumberOfStubs = specs.numberOfStubs;
  const numStubs = rawNumberOfStubs || 0;
  const rawBendEndConfiguration = specs.bendEndConfiguration;
  const bendEndConfig = rawBendEndConfiguration || "PE";
  const rawQuantityValue = specs.quantityValue;
  const bendQuantity = rawQuantityValue || 1;
  const rawClosureLengthMm = specs.closureLengthMm;
  const closureLengthMm = rawClosureLengthMm || 0;
  const tackWeldEnds = tackWeldEndsPerBend(bendEndConfig);

  const rawStub1OD = nbToOdMap[stub1NB];
  const stub1OD = stub1NB ? rawStub1OD || stub1NB * 1.05 : 0;
  const rawStub2OD = nbToOdMap[stub2NB];
  const stub2OD = stub2NB ? rawStub2OD || stub2NB * 1.05 : 0;
  const stub1ID = stub1OD - 2 * (pipeWallThickness || 0);
  const stub2ID = stub2OD - 2 * (pipeWallThickness || 0);
  const stub1Circ = Math.PI * stub1OD;
  const stub2Circ = Math.PI * stub2OD;
  const rawSweepTeePipeALengthMm = specs.sweepTeePipeALengthMm;
  const pipeALengthMm = isSweepTee ? rawSweepTeePipeALengthMm || 0 : 0;
  const teeTotalLinear =
    (numStubs >= 1 && stub1NB ? stub1Circ : 0) + (numStubs >= 2 && stub2NB ? stub2Circ : 0);

  const rawBendRadiusMm = specs.bendRadiusMm;

  const rawSweepTeePipeALengthMm2 = specs.sweepTeePipeALengthMm;
  const hasBranchConnection = (rawSweepTeePipeALengthMm2 || 0) > 0;
  const branchFlangeConfig = hasBranchConnection ? getFittingFlangeConfig(bendEndConfig) : null;
  const branchHasWeldableFlange =
    branchFlangeConfig?.hasBranch && branchFlangeConfig?.branchType !== "loose";
  const branchFlangeWeldCount = branchHasWeldableFlange ? 1 : 0;
  const hasSweepTeeGeometry = hasBranchConnection;

  const duckfootWeldDefaults: Record<number, { x: number; y: number; h: number }> = {
    200: { x: 355, y: 230, h: 255 },
    250: { x: 405, y: 280, h: 280 },
    300: { x: 460, y: 330, h: 305 },
    350: { x: 510, y: 380, h: 330 },
    400: { x: 560, y: 430, h: 355 },
    450: { x: 610, y: 485, h: 380 },
    500: { x: 660, y: 535, h: 405 },
    550: { x: 710, y: 585, h: 430 },
    600: { x: 760, y: 635, h: 460 },
    650: { x: 815, y: 693, h: 485 },
    700: { x: 865, y: 733, h: 510 },
    750: { x: 915, y: 793, h: 535 },
    800: { x: 970, y: 833, h: 560 },
    850: { x: 1020, y: 883, h: 585 },
    900: { x: 1070, y: 933, h: 610 },
  };
  const duckfootLookup = dn && duckfootWeldDefaults[dn];
  const duckfootDefaults = duckfootLookup || { x: 500, y: 400, h: 400 };
  const rawDuckfootBasePlateXMm = specs.duckfootBasePlateXMm;
  const duckfootBasePlateXMm = rawDuckfootBasePlateXMm || 0;
  const rawDuckfootBasePlateYMm = specs.duckfootBasePlateYMm;
  const duckfootBasePlateYMm = rawDuckfootBasePlateYMm || 0;
  const hasDuckfootGeometry = duckfootBasePlateXMm > 0 || duckfootBasePlateYMm > 0;
  const effectiveDuckfootX = duckfootBasePlateXMm || duckfootDefaults.x;
  const effectiveDuckfootY = duckfootBasePlateYMm || duckfootDefaults.y;
  const duckfootRibHeightMm = duckfootDefaults.h;
  const rawDuckfootGussetPointDDegrees = specs.duckfootGussetPointDDegrees;
  const duckfootPointDDeg = rawDuckfootGussetPointDDegrees || 15;
  const rawDuckfootGussetPointCDegrees = specs.duckfootGussetPointCDegrees;
  const duckfootPointCDeg = rawDuckfootGussetPointCDegrees || 75;

  const outerRadiusMm = mainOdMm / 2;
  const rawBendRadiusMm2 = specs.bendRadiusMm;
  const bendRadiusMm = rawBendRadiusMm2 || (dn ? dn * 1.5 : 750);
  const extradosRadiusMm = bendRadiusMm + outerRadiusMm;
  const duckfootYOffsetMm = 800;

  const blueGussetCutoutWeld = hasDuckfootGeometry ? Math.PI * outerRadiusMm : 0;

  const pointDRad = (duckfootPointDDeg * Math.PI) / 180;
  const pointCRad = (duckfootPointCDeg * Math.PI) / 180;
  const yellowGussetCurveWeld = hasDuckfootGeometry
    ? extradosRadiusMm * (pointCRad - pointDRad)
    : 0;

  const extradosAt45Y =
    bendRadiusMm -
    extradosRadiusMm * Math.cos(Math.PI / 4) +
    duckfootYOffsetMm +
    duckfootRibHeightMm;
  const gussetIntersectionHeight = extradosAt45Y - outerRadiusMm / 2;
  const gussetIntersectionWeld = hasDuckfootGeometry ? 4 * gussetIntersectionHeight : 0;

  const blueGussetToBaseWeld = hasDuckfootGeometry ? 2 * effectiveDuckfootY : 0;
  const yellowGussetToBaseWeld = hasDuckfootGeometry ? 2 * effectiveDuckfootX : 0;

  const totalDuckfootWeld =
    blueGussetCutoutWeld +
    yellowGussetCurveWeld +
    gussetIntersectionWeld +
    blueGussetToBaseWeld +
    yellowGussetToBaseWeld;

  const tackWeldLinear = tackWeldEnds * 8 * 20;

  const calculatedTotalWeld =
    mitreWeldLinear +
    buttWeldLinear +
    totalFlangeWeldLinear +
    teeTotalLinear +
    saddleWeldLinear +
    totalDuckfootWeld +
    tackWeldLinear;

  const sweepTeePipeALength = specs.sweepTeePipeALengthMm;

  const effectiveWtDisplay = effectiveWt?.toFixed(1);
  const pipeWallDisplay = pipeWallThickness?.toFixed(1);
  const wtDisplay = effectiveWtDisplay || pipeWallDisplay;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
    >
      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Dimensions</p>
        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{cfDisplay} C/F</p>
        {sweepTeePipeALength > 0 && (
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
            {sweepTeePipeALength}mm Pipe A
          </p>
        )}
        <p className="text-xs text-purple-500 dark:text-purple-400">
          Radius: {Number(rawBendRadiusMm || 0).toFixed(0)}mm
        </p>
        <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{mainLengthDisplay}</p>
        {stubLengthDisplay && (
          <p className="text-xs text-purple-500 dark:text-purple-400">+ {stubLengthDisplay}</p>
        )}
        {closureLengthMm > 0 && (
          <p className="text-xs text-purple-500 dark:text-purple-400">
            Closure: {closureLengthMm}mm
          </p>
        )}
      </div>
      {totalFlanges > 0 && (
        <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded text-center">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Total Flanges</p>
          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{totalFlanges}</p>
          <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {bendFlangeCount > 0 && (
              <p>
                {bendFlangeCount} x {dn}NB Flange
              </p>
            )}
            {stub1FlangeCount > 0 && (
              <p>
                {stub1FlangeCount} x {stub1NB}NB Flange
              </p>
            )}
            {stub2FlangeCount > 0 && (
              <p>
                {stub2FlangeCount} x {stub2NB}NB Flange
              </p>
            )}
          </div>
          {pressureClassDesignation && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              {pressureClassDesignation}
            </p>
          )}
          {dynamicTotalFlangeWeight > 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 font-semibold">
              {dynamicTotalFlangeWeight.toFixed(2)}kg total
            </p>
          )}
          <div className="text-xs text-amber-500 dark:text-amber-400">
            {bendFlangeCount > 0 && (
              <p>
                {bendFlangeCount} &times; {mainFlangeWeightPerUnit.toFixed(2)}kg
              </p>
            )}
            {stub1FlangeCount > 0 && (
              <p>
                {stub1FlangeCount} &times; {stub1FlangeWeightPerUnit.toFixed(2)}kg
              </p>
            )}
            {stub2FlangeCount > 0 && (
              <p>
                {stub2FlangeCount} &times; {stub2FlangeWeightPerUnit.toFixed(2)}kg
              </p>
            )}
          </div>
        </div>
      )}
      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Weight Breakdown</p>
        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
          {totalWeight.toFixed(2)}kg
        </p>
        <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
          {bendWeightOnly > 0 && <p>Bend: {bendWeightOnly.toFixed(2)}kg</p>}
          {tangentWeight > 0 && <p>Tangents: {tangentWeight.toFixed(2)}kg</p>}
          {pipeAWeight > 0 && <p>Pipe A: {pipeAWeight.toFixed(2)}kg</p>}
          {numStubs >= 1 && stub1NB && stub1PipeWeight > 0 && (
            <p>
              Stub ({stub1NB}NB): {stub1PipeWeight.toFixed(2)}kg
            </p>
          )}
          {numStubs >= 2 && stub2NB && stub2PipeWeight > 0 && (
            <p>
              Stub ({stub2NB}NB): {stub2PipeWeight.toFixed(2)}kg
            </p>
          )}
          {dynamicTotalFlangeWeight > 0 && <p>Flanges: {dynamicTotalFlangeWeight.toFixed(2)}kg</p>}
          {totalBlankFlangeWeight > 0 && <p>Blanks: {totalBlankFlangeWeight.toFixed(2)}kg</p>}
          {tackWeldTotalWeight > 0 && <p>Tack Welds: {tackWeldTotalWeight.toFixed(2)}kg</p>}
          {closureTotalWeight > 0 && <p>Closures: {closureTotalWeight.toFixed(2)}kg</p>}
        </div>
      </div>
      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Weld (mm)</p>
        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
          {calculatedTotalWeld.toFixed(0)}
        </p>
        <div className="text-xs text-purple-500 dark:text-purple-400 mt-1 text-left space-y-0.5 whitespace-nowrap">
          {mitreWeldCount > 0 && (
            <p>
              {mitreWeldCount}&times;Mitre={mitreWeldLinear.toFixed(0)}@{wtDisplay}
            </p>
          )}
          {buttWeldCount > 0 && (
            <p>
              {buttWeldCount}&times;Butt={buttWeldLinear.toFixed(0)}@{wtDisplay}
            </p>
          )}
          {bendFlangeWeldCount > 0 && (
            <p>
              {bendFlangeWeldCount}&times;{hasSweepTeeGeometry ? "Run " : ""}Flg=
              {mainFlangeWeldLinear.toFixed(0)}@{wtDisplay}
            </p>
          )}
          {branchFlangeWeldCount > 0 && (
            <p>
              {branchFlangeWeldCount}&times;BranchFlg={branchFlangeWeldLinear.toFixed(0)}@
              {wtDisplay}
            </p>
          )}
          {stub1FlangeCount > 0 && (
            <p>
              {stub1FlangeCount}&times;Stub1Flg={stub1FlangeWeldLinear.toFixed(0)}@
              {stub1Wt?.toFixed(1)}
            </p>
          )}
          {stub2FlangeCount > 0 && (
            <p>
              {stub2FlangeCount}&times;Stub2Flg={stub2FlangeWeldLinear.toFixed(0)}@
              {stub2Wt?.toFixed(1)}
            </p>
          )}
          {numStubs >= 1 && stub1NB && stub1Circ > 0 && (
            <p>
              Tee({stub1NB}NB)={stub1Circ.toFixed(0)}@{stub1Wt?.toFixed(1)}
            </p>
          )}
          {numStubs >= 2 && stub2NB && stub2Circ > 0 && (
            <p>
              Tee({stub2NB}NB)={stub2Circ.toFixed(0)}@{stub2Wt?.toFixed(1)}
            </p>
          )}
          {saddleWeldLinear > 0 && (
            <p>
              Saddle={saddleWeldLinear.toFixed(0)}@{wtDisplay}
            </p>
          )}
          {totalDuckfootWeld > 0 && (
            <>
              <p className="font-medium text-purple-600 dark:text-purple-400 mt-1 border-t border-purple-200 pt-1">
                Duckfoot:
              </p>
              {blueGussetCutoutWeld > 0 && <p>BlueCut={blueGussetCutoutWeld.toFixed(0)}</p>}
              {yellowGussetCurveWeld > 0 && <p>YellowCurve={yellowGussetCurveWeld.toFixed(0)}</p>}
              {gussetIntersectionWeld > 0 && <p>Corners={gussetIntersectionWeld.toFixed(0)}</p>}
              {blueGussetToBaseWeld > 0 && <p>Blue&rarr;Base={blueGussetToBaseWeld.toFixed(0)}</p>}
              {yellowGussetToBaseWeld > 0 && (
                <p>Yellow&rarr;Base={yellowGussetToBaseWeld.toFixed(0)}</p>
              )}
            </>
          )}
          {tackWeldLinear > 0 && (
            <p>
              {tackWeldEnds}&times;L/F Tack={tackWeldLinear.toFixed(0)}
            </p>
          )}
          <p className="font-semibold border-t border-purple-300 pt-0.5 mt-1">
            Total: {calculatedTotalWeld.toFixed(0)}mm ({(calculatedTotalWeld / 1000).toFixed(2)}
            l/m)
          </p>
          {weldVolume && (
            <p className="font-semibold">
              Vol: {(weldVolume.totalVolumeCm3 * bendQuantity).toFixed(1)}cm&sup3;
            </p>
          )}
        </div>
      </div>
      {requiredProducts.includes("surface_protection") &&
        mainOdMm > 0 &&
        pipeWallThickness &&
        (() => {
          const mainIdMm = mainOdMm - 2 * pipeWallThickness;
          const mainOdM = mainOdMm / 1000;
          const mainIdM = mainIdMm / 1000;

          const rawBendDegrees = specs.bendDegrees;
          const bendDegrees = rawBendDegrees || 90;
          const bendAngleRad = (bendDegrees * Math.PI) / 180;

          const rawBendType = specs.bendType;
          const entryBendRadiusMm = entry.specs?.bendRadiusMm;
          const centerLineBendRadiusMm = specs.bendRadiusMm
            ? entryBendRadiusMm
            : dn * (parseFloat((rawBendType || "1.5D").replace("D", "")) || 1.5);

          const bendArcLengthMm = centerLineBendRadiusMm * bendAngleRad;
          const bendArcLengthM = bendArcLengthMm / 1000;
          const bendExtM2 = Math.PI * mainOdM * bendArcLengthM;
          const bendIntM2 = Math.PI * mainIdM * bendArcLengthM;

          const rawItem0 = specs.tangentLengths?.[0];
          const rawItem1 = specs.tangentLengths?.[1];
          const tangentTotalMm = (rawItem0 || 0) + (rawItem1 || 0);
          const tangentTotalM = tangentTotalMm / 1000;
          const tangentExtM2 = Math.PI * mainOdM * tangentTotalM;
          const tangentIntM2 = Math.PI * mainIdM * tangentTotalM;

          const pipeALengthM = pipeALengthMm / 1000;
          const pipeAExtM2 = pipeALengthMm > 0 ? Math.PI * mainOdM * pipeALengthM : 0;
          const pipeAIntM2 = pipeALengthMm > 0 ? Math.PI * mainIdM * pipeALengthM : 0;

          const stub1OdM = stub1OD / 1000;
          const stub1IdM = stub1ID / 1000;
          const stub1LengthM = stub1Length / 1000;
          const stub1ExtM2 = stub1OD > 0 && stub1Length > 0 ? Math.PI * stub1OdM * stub1LengthM : 0;
          const stub1IntM2 = stub1OD > 0 && stub1Length > 0 ? Math.PI * stub1IdM * stub1LengthM : 0;

          const stub2OdM = stub2OD / 1000;
          const stub2IdM = stub2ID / 1000;
          const stub2LengthM = stub2Length / 1000;
          const stub2ExtM2 = stub2OD > 0 && stub2Length > 0 ? Math.PI * stub2OdM * stub2LengthM : 0;
          const stub2IntM2 = stub2OD > 0 && stub2Length > 0 ? Math.PI * stub2IdM * stub2LengthM : 0;

          const mainFlangeResult = flangeSpecs || null;
          const mainFlangeOdVal = mainFlangeResult?.flangeOdMm;
          const mainFlangeOdM = mainFlangeOdVal ? mainFlangeOdVal / 1000 : mainOdM * 1.8;
          const mainFlangeBoreVal = mainFlangeResult?.flangeBoreMm;
          const mainFlangeBoreM = mainFlangeBoreVal ? mainFlangeBoreVal / 1000 : mainIdM;
          const mainRaisedFaceVal = mainFlangeResult?.flangeFaceMm;
          const mainRaisedFaceM = mainRaisedFaceVal ? mainRaisedFaceVal / 1000 : mainOdM * 1.2;
          const mainFlangeExtFaceM2 =
            bendFlangeCount > 0
              ? bendFlangeCount *
                (Math.PI / 4) *
                (mainFlangeOdM * mainFlangeOdM - mainOdM * mainOdM)
              : 0;
          const mainFlangeIntFaceM2 =
            bendFlangeCount > 0
              ? bendFlangeCount *
                (Math.PI / 4) *
                (mainRaisedFaceM * mainRaisedFaceM - mainFlangeBoreM * mainFlangeBoreM)
              : 0;

          const rawStub1NB4 = nbToOdMap[stub1NB];
          const stub1FlangeOdM = stub1NB ? ((rawStub1NB4 || stub1NB) * 1.8) / 1000 : 0;
          const stub1FlangeBoreM = stub1IdM;
          const rawStub1NB5 = nbToOdMap[stub1NB];
          const stub1RaisedFaceM = stub1NB ? ((rawStub1NB5 || stub1NB) * 1.2) / 1000 : 0;
          const stub1FlangeExtFaceM2 =
            stub1FlangeCount > 0
              ? stub1FlangeCount *
                (Math.PI / 4) *
                (stub1FlangeOdM * stub1FlangeOdM - stub1OdM * stub1OdM)
              : 0;
          const stub1FlangeIntFaceM2 =
            stub1FlangeCount > 0
              ? stub1FlangeCount *
                (Math.PI / 4) *
                (stub1RaisedFaceM * stub1RaisedFaceM - stub1FlangeBoreM * stub1FlangeBoreM)
              : 0;

          const rawStub2NB4 = nbToOdMap[stub2NB];
          const stub2FlangeOdM = stub2NB ? ((rawStub2NB4 || stub2NB) * 1.8) / 1000 : 0;
          const stub2FlangeBoreM = stub2IdM;
          const rawStub2NB5 = nbToOdMap[stub2NB];
          const stub2RaisedFaceM = stub2NB ? ((rawStub2NB5 || stub2NB) * 1.2) / 1000 : 0;
          const stub2FlangeExtFaceM2 =
            stub2FlangeCount > 0
              ? stub2FlangeCount *
                (Math.PI / 4) *
                (stub2FlangeOdM * stub2FlangeOdM - stub2OdM * stub2OdM)
              : 0;
          const stub2FlangeIntFaceM2 =
            stub2FlangeCount > 0
              ? stub2FlangeCount *
                (Math.PI / 4) *
                (stub2RaisedFaceM * stub2RaisedFaceM - stub2FlangeBoreM * stub2FlangeBoreM)
              : 0;

          const branchFlangeCountForArea =
            pipeALengthMm > 0 && getFittingFlangeConfig(bendEndConfig).hasBranch ? 1 : 0;
          const branchFlangeExtFaceM2 =
            branchFlangeCountForArea > 0
              ? branchFlangeCountForArea *
                (Math.PI / 4) *
                (mainFlangeOdM * mainFlangeOdM - mainOdM * mainOdM)
              : 0;
          const branchFlangeIntFaceM2 =
            branchFlangeCountForArea > 0
              ? branchFlangeCountForArea *
                (Math.PI / 4) *
                (mainRaisedFaceM * mainRaisedFaceM - mainFlangeBoreM * mainFlangeBoreM)
              : 0;

          const totalFlangeExtM2 =
            mainFlangeExtFaceM2 +
            stub1FlangeExtFaceM2 +
            stub2FlangeExtFaceM2 +
            branchFlangeExtFaceM2;
          const totalFlangeIntM2 =
            mainFlangeIntFaceM2 +
            stub1FlangeIntFaceM2 +
            stub2FlangeIntFaceM2 +
            branchFlangeIntFaceM2;

          const pipeExtM2 = bendExtM2 + tangentExtM2 + pipeAExtM2 + stub1ExtM2 + stub2ExtM2;
          const pipeIntM2 = bendIntM2 + tangentIntM2 + pipeAIntM2 + stub1IntM2 + stub2IntM2;
          const totalExtM2 = pipeExtM2 + totalFlangeExtM2;
          const totalIntM2 = pipeIntM2 + totalFlangeIntM2;

          return (
            <SurfaceAreaDisplay
              externalTotal={totalExtM2 * bendQuantity}
              internalTotal={totalIntM2 * bendQuantity}
              externalBreakdown={[
                { label: "Bend", value: bendExtM2 },
                { label: "Tangents", value: tangentExtM2 },
                { label: "Pipe A", value: pipeAExtM2 },
                { label: `Stub (${stub1NB}NB)`, value: stub1ExtM2 },
                { label: `Stub (${stub2NB}NB)`, value: stub2ExtM2 },
                { label: "Flanges", value: totalFlangeExtM2 },
              ]}
              internalBreakdown={[
                { label: "Bend", value: bendIntM2 },
                { label: "Tangents", value: tangentIntM2 },
                { label: "Pipe A", value: pipeAIntM2 },
                { label: `Stub (${stub1NB}NB)`, value: stub1IntM2 },
                { label: `Stub (${stub2NB}NB)`, value: stub2IntM2 },
                { label: "Flanges", value: totalFlangeIntM2 },
              ]}
            />
          );
        })()}
    </div>
  );
}
