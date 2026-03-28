"use client";

import { useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  JobCard,
  RubberDimensionOverride,
  RubberPlanManualRoll,
  RubberPlanOverride,
  RubberStockOptionsResponse,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { JigsawEditor } from "@/app/stock-control/components/jigsaw/JigsawEditor";
import {
  type BandSpec,
  type CutPiece,
  type CuttingPlan,
  calculateCuttingPlan,
  expandAndRotateItems,
  type Offcut,
  parsePipeItem,
  type RollAllocation,
} from "@/app/stock-control/lib/rubberCuttingCalculator";
import { isValidLineItem } from "../lib/helpers";

const STANDARD_ROLL_WIDTH_MM = 1200;
const STANDARD_ROLL_LENGTH_M = 12.5;
const STANDARD_ROLL_AREA_M2 = (STANDARD_ROLL_WIDTH_MM / 1000) * STANDARD_ROLL_LENGTH_M;

function manualRollsToCuttingPlan(manualRolls: RubberPlanManualRoll[]): CuttingPlan {
  const rolls: RollAllocation[] = manualRolls.map((mr, rollIndex) => {
    const rollLengthMm = mr.lengthM * 1000;
    const rollWidthMm = mr.widthMm;
    const rollAreaSqM = (rollWidthMm / 1000) * (rollLengthMm / 1000);

    const expandedCuts = mr.cuts.flatMap((cut) =>
      Array.from({ length: cut.quantity }, (_, qi) => ({ ...cut, qi })),
    );

    const bands: BandSpec[] = [];
    const cutPieces: CutPiece[] = [];
    let currentBandStart = 0;
    let bandIndex = 0;

    const grouped = expandedCuts.reduce(
      (acc, cut) => {
        const key = String(cut.widthMm);
        return { ...acc, [key]: [...(acc[key] || []), cut] };
      },
      {} as Record<string, typeof expandedCuts>,
    );

    Object.entries(grouped).forEach(([widthKey, cutsInBand]) => {
      const bandWidthMm = Number(widthKey);
      const maxLanesPerBand = Math.max(1, Math.floor(rollWidthMm / bandWidthMm));

      Array.from({ length: Math.ceil(cutsInBand.length / maxLanesPerBand) }, (_, chunkIdx) =>
        cutsInBand.slice(chunkIdx * maxLanesPerBand, (chunkIdx + 1) * maxLanesPerBand),
      ).forEach((chunk) => {
        const lanesNeeded = chunk.length;
        const maxLaneLengthMm = Math.max(...chunk.map((c) => c.lengthMm));

        bands.push({
          bandIndex,
          lanes: lanesNeeded,
          laneWidthMm: bandWidthMm,
          startMm: currentBandStart,
          heightMm: maxLaneLengthMm,
          widthUsedMm: lanesNeeded * bandWidthMm,
        });

        chunk.forEach((cut, laneIdx) => {
          cutPieces.push({
            itemId: `manual-${rollIndex}-${bandIndex}-${laneIdx}`,
            itemNo: null,
            description: cut.description,
            widthMm: cut.widthMm,
            lengthMm: cut.lengthMm,
            positionMm: currentBandStart,
            lane: laneIdx,
            band: bandIndex,
            stripsPerPiece: 1,
          });
        });

        currentBandStart += maxLaneLengthMm;
        bandIndex += 1;
      });
    });

    const usedAreaSqM = cutPieces.reduce(
      (sum, cp) => sum + (cp.widthMm / 1000) * (cp.lengthMm / 1000),
      0,
    );
    const wasteAreaSqM = rollAreaSqM - usedAreaSqM;
    const wastePercentage = rollAreaSqM > 0 ? (wasteAreaSqM / rollAreaSqM) * 100 : 0;

    const offcuts: Offcut[] = [];
    const usedLengthMm = currentBandStart;

    if (usedLengthMm < rollLengthMm) {
      const remainingLengthMm = rollLengthMm - usedLengthMm;
      offcuts.push({
        widthMm: rollWidthMm,
        lengthMm: remainingLengthMm,
        areaSqM: (rollWidthMm / 1000) * (remainingLengthMm / 1000),
      });
    }

    bands.forEach((band) => {
      if (band.widthUsedMm < rollWidthMm) {
        const gapWidthMm = rollWidthMm - band.widthUsedMm;
        offcuts.push({
          widthMm: gapWidthMm,
          lengthMm: band.heightMm,
          areaSqM: (gapWidthMm / 1000) * (band.heightMm / 1000),
        });
      }
    });

    const maxLanes = bands.length > 0 ? Math.max(...bands.map((b) => b.lanes)) : 1;
    const laneWidth = maxLanes > 0 ? Math.floor(rollWidthMm / maxLanes) : rollWidthMm;

    return {
      rollIndex,
      rollSpec: {
        widthMm: rollWidthMm,
        lengthM: mr.lengthM,
        areaSqM: rollAreaSqM,
        lanes: maxLanes,
        laneWidthMm: laneWidth,
      },
      cuts: cutPieces,
      usedLengthMm: bands.map((b) => b.heightMm),
      wastePercentage,
      hasLengthwiseCut: bands.some((b) => b.lanes > 1),
      bands,
      offcuts,
      plyThicknessMm: mr.thicknessMm,
    };
  });

  const totalUsedSqM = rolls.reduce(
    (sum, r) => sum + r.cuts.reduce((s, c) => s + (c.widthMm / 1000) * (c.lengthMm / 1000), 0),
    0,
  );
  const totalRollAreaSqM = rolls.reduce(
    (sum, r) => sum + (r.rollSpec.widthMm / 1000) * r.rollSpec.lengthM,
    0,
  );
  const totalWasteSqM = totalRollAreaSqM - totalUsedSqM;
  const wastePercentage = totalRollAreaSqM > 0 ? (totalWasteSqM / totalRollAreaSqM) * 100 : 0;

  const allOffcuts = rolls.flatMap((r) => r.offcuts);
  const thicknesses = [...new Set(manualRolls.map((r) => r.thicknessMm))];

  return {
    rolls,
    totalRollsNeeded: rolls.length,
    totalWasteSqM,
    totalUsedSqM,
    wastePercentage,
    hasPipeItems: true,
    genericM2Items: [],
    genericM2Total: 0,
    rubberSpec: null,
    plies: thicknesses.map((t) => ({
      thicknessMm: t,
      rolls: rolls.filter((r) => r.plyThicknessMm === t),
      totalRollsNeeded: rolls.filter((r) => r.plyThicknessMm === t).length,
    })),
    totalThicknessMm: thicknesses.reduce((sum, t) => sum + t, 0),
    isMultiPly: thicknesses.length > 1,
    offcuts: allOffcuts,
  };
}

const ROLL_WIDTH_OPTIONS_MM = [
  800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450,
];
const ROLL_LENGTH_OPTIONS_M = [5, 10, 12.5];

const CUT_COLORS = [
  "bg-blue-500",
  "bg-teal-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-emerald-500",
];

interface RubberAllocationProps {
  lineItems: Array<{
    id?: number;
    m2: number | null;
    itemCode: string | null;
    itemDescription: string | null;
    itemNo?: string | null;
    quantity: number | null;
    notes?: string | null;
  }>;
  jobCardId: number;
  rubberPlanOverride: RubberPlanOverride | null;
}

function rollPatternKey(roll: RollAllocation): string {
  const specKey = `${roll.rollSpec.widthMm}-${roll.rollSpec.lengthM}`;
  const bandsKey = roll.bands.map((b) => `${b.lanes}:${b.laneWidthMm}:${b.heightMm}`).join("|");
  const cutsKey = roll.cuts
    .map((c) => `${c.widthMm}:${c.lengthMm}:${c.band}:${c.lane}`)
    .sort()
    .join("|");
  return `${specKey}/${bandsKey}/${cutsKey}`;
}

interface RollGroup {
  representativeRoll: RollAllocation;
  count: number;
}

function groupIdenticalRolls(rolls: RollAllocation[]): RollGroup[] {
  const groups: RollGroup[] = [];
  const seen = new Map<string, number>();

  rolls.forEach((roll) => {
    const key = rollPatternKey(roll);
    const existingIdx = seen.get(key);

    if (existingIdx !== undefined) {
      groups[existingIdx] = { ...groups[existingIdx], count: groups[existingIdx].count + 1 };
    } else {
      seen.set(key, groups.length);
      groups.push({ representativeRoll: roll, count: 1 });
    }
  });

  return groups;
}

function OffcutList({
  offcuts,
  jobCardId,
  thicknessMm,
  color,
  userRole,
}: {
  offcuts: Offcut[];
  jobCardId?: number;
  thicknessMm?: number;
  color?: string | null;
  userRole?: string | null;
}) {
  const [wastageIdx, setWastageIdx] = useState<number | null>(null);
  const [wastageSG, setWastageSG] = useState<number>(1.5);
  const [wastageSubmitting, setWastageSubmitting] = useState(false);
  const [markedWastage, setMarkedWastage] = useState<Set<number>>(new Set());

  if (offcuts.length === 0) return null;

  const canMarkWastage =
    (userRole === "manager" || userRole === "admin") && jobCardId !== undefined && thicknessMm;

  const calculateWeightKg = (offcut: Offcut, sg: number): number => {
    const thicknessM = (thicknessMm || 0) / 1000;
    const widthM = offcut.widthMm / 1000;
    const lengthM = offcut.lengthMm / 1000;
    return thicknessM * widthM * lengthM * sg * 1000;
  };

  const handleMarkWastage = async (idx: number) => {
    if (!jobCardId || !thicknessMm) return;
    const offcut = offcuts[idx];
    setWastageSubmitting(true);
    try {
      await stockControlApiClient.markOffcutAsWastage(jobCardId, {
        widthMm: offcut.widthMm,
        lengthMm: offcut.lengthMm,
        thicknessMm,
        color: color || null,
        specificGravity: wastageSG,
      });
      setMarkedWastage((prev) => new Set([...prev, idx]));
      setWastageIdx(null);
    } finally {
      setWastageSubmitting(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-500 mb-1">Offcuts:</div>
      <div className="flex flex-wrap gap-1">
        {offcuts.map((offcut, idx) => {
          const isMarked = markedWastage.has(idx);
          return (
            <div key={`offcut-${idx}`} className="flex flex-col gap-1">
              <span
                className={`text-xs border border-dashed rounded px-2 py-0.5 ${
                  isMarked
                    ? "bg-red-50 border-red-400 text-red-600 line-through"
                    : "bg-gray-100 border-gray-400 text-gray-600"
                }`}
              >
                {offcut.widthMm}mm x {offcut.lengthMm}mm ({offcut.areaSqM.toFixed(3)} m&#178;)
                {canMarkWastage && !isMarked && (
                  <button
                    type="button"
                    onClick={() => setWastageIdx(wastageIdx === idx ? null : idx)}
                    className="ml-2 text-orange-500 hover:text-orange-700 font-medium"
                    title="Record offcut weight for scrap tracking"
                  >
                    Weigh
                  </button>
                )}
                {isMarked && <span className="ml-2 text-orange-500 font-medium">Weighed</span>}
              </span>
              {wastageIdx === idx && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-gray-600">SG:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3.0"
                      value={wastageSG}
                      onChange={(e) => setWastageSG(Number(e.target.value))}
                      className="w-16 px-1 py-0.5 border rounded text-xs"
                    />
                    <span className="text-gray-500">
                      = {calculateWeightKg(offcut, wastageSG).toFixed(2)} kg
                    </span>
                  </div>
                  {color && (
                    <p className="text-gray-500 mb-1">
                      Colour: <span className="font-medium text-gray-700">{color}</span>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkWastage(idx)}
                      disabled={wastageSubmitting}
                      className="px-2 py-0.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      {wastageSubmitting ? "Saving..." : "Record Weight"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWastageIdx(null)}
                      className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isGroupableRoll(roll: RollAllocation): boolean {
  if (roll.cuts.length !== 1) return false;
  const rollLengthMm = roll.rollSpec.lengthM * 1000;
  const cut = roll.cuts[0];
  return cut.lengthMm / rollLengthMm >= 0.8;
}

function CuttingDiagram({
  roll,
  colorMap,
  groupCount,
  thicknessMm,
  jobCardId,
  rubberColor,
  userRole,
}: {
  roll: RollAllocation;
  colorMap: Map<string, string>;
  groupCount?: number;
  thicknessMm?: number;
  jobCardId?: number;
  rubberColor?: string | null;
  userRole?: string | null;
}) {
  const rollLengthMm = roll.rollSpec.lengthM * 1000;
  const rollWidthMm = roll.rollSpec.widthMm;
  const bands = roll.bands;
  const totalBandHeight = bands.reduce((sum, b) => sum + b.heightMm, 0);
  const diagramHeight = 48;

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-gray-900">
            {groupCount && groupCount > 1
              ? `${thicknessMm ? `${thicknessMm}mm ` : ""}${rollWidthMm}mm x ${roll.rollSpec.lengthM}m — ${groupCount} rolls`
              : `Roll ${roll.rollIndex}: ${thicknessMm ? `${thicknessMm}mm ` : ""}${rollWidthMm}mm x ${roll.rollSpec.lengthM}m`}
          </span>
          {bands.length > 1 && (
            <span className="ml-2 text-xs text-purple-600 font-medium">({bands.length} bands)</span>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            roll.wastePercentage < 10
              ? "bg-green-100 text-green-800"
              : roll.wastePercentage < 25
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {(100 - roll.wastePercentage).toFixed(0)}% used
        </span>
      </div>

      <div
        className="relative bg-gray-100 rounded border border-gray-300 overflow-hidden"
        style={{ height: `${diagramHeight}px` }}
      >
        {roll.cuts.map((cut, idx) => {
          const left = (cut.positionMm / rollLengthMm) * 100;
          const rawWidth = (cut.lengthMm / rollLengthMm) * 100;
          const isFullRoll = rawWidth >= 95;
          const width = isFullRoll ? 100 - left : rawWidth;
          const colorClass =
            colorMap.get(cut.itemId.split("-")[0]) || CUT_COLORS[idx % CUT_COLORS.length];
          const rolls = cut.stripsPerPiece || 1;
          const displayLabel =
            rolls > 1 ? `${rolls} rolls` : cut.itemNo || `${(cut.lengthMm / 1000).toFixed(1)}m`;

          const band = bands.find((b) => b.bandIndex === cut.band);
          const totalLanes = band ? band.lanes : 1;
          const laneHeightPct = 100 / totalLanes;
          const topPct = cut.lane * laneHeightPct;

          return (
            <div
              key={cut.itemId}
              className={`absolute ${colorClass} border-r border-b border-white flex items-center justify-center`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${topPct}%`,
                height: `${laneHeightPct}%`,
              }}
              title={`${cut.itemNo ? `[${cut.itemNo}] ` : ""}${cut.description}: ${(cut.lengthMm / 1000).toFixed(2)}m x ${cut.widthMm}mm${rolls > 1 ? ` (${rolls} rolls)` : ""}`}
            >
              <span className="text-[10px] text-white font-bold truncate px-1">{displayLabel}</span>
            </div>
          );
        })}

        {totalBandHeight < rollLengthMm * 0.95 && (
          <div
            className="absolute bg-gray-300 flex items-center justify-center"
            style={{
              left: `${(totalBandHeight / rollLengthMm) * 100}%`,
              width: `${((rollLengthMm - totalBandHeight) / rollLengthMm) * 100}%`,
              top: 0,
              height: "100%",
            }}
          >
            <span className="text-[9px] text-gray-600 font-medium">
              {((rollLengthMm - totalBandHeight) / 1000).toFixed(1)}m
            </span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <div className="text-xs text-gray-500 mb-1">Cuttings:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {roll.cuts.map((cut, idx) => {
            const colorClass =
              colorMap.get(cut.itemId.split("-")[0]) || CUT_COLORS[idx % CUT_COLORS.length];
            const band = bands.find((b) => b.bandIndex === cut.band);
            return (
              <div
                key={cut.itemId}
                className="flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-1"
              >
                <div className={`w-3 h-3 rounded flex-shrink-0 ${colorClass}`} />
                <span className="font-mono font-semibold text-gray-800 flex-shrink-0">
                  {cut.itemNo || "-"}
                </span>
                <span className="text-gray-400 flex-shrink-0">|</span>
                <span className="text-gray-600 flex-shrink-0">
                  {(cut.lengthMm / 1000).toFixed(2)}m x {cut.widthMm}mm
                </span>
                {band && band.lanes > 1 && (
                  <>
                    <span className="text-gray-400 flex-shrink-0">|</span>
                    <span className="text-gray-500 flex-shrink-0">Lane {cut.lane + 1}</span>
                  </>
                )}
                {(cut.stripsPerPiece || 1) > 1 && (
                  <>
                    <span className="text-gray-400 flex-shrink-0">|</span>
                    <span className="text-orange-600 font-medium flex-shrink-0">
                      {cut.stripsPerPiece} rolls
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <OffcutList
        offcuts={roll.offcuts}
        jobCardId={jobCardId}
        thicknessMm={thicknessMm}
        color={rubberColor}
        userRole={userRole}
      />
    </div>
  );
}

function PipeCuttingView({
  plan,
  fallbackThicknessMm,
  jobCardId,
  userRole,
}: {
  plan: CuttingPlan;
  fallbackThicknessMm?: number;
  jobCardId?: number;
  userRole?: string | null;
}) {
  const colorMap = plan.rolls
    .flatMap((roll) => roll.cuts)
    .reduce(
      (acc, cut) => {
        const baseId = cut.itemId.split("-")[0];
        if (!acc.map.has(baseId)) {
          acc.map.set(baseId, CUT_COLORS[acc.idx % CUT_COLORS.length]);
          return { map: acc.map, idx: acc.idx + 1 };
        }
        return acc;
      },
      { map: new Map<string, string>(), idx: 0 },
    ).map;

  const groupableRolls = plan.rolls.filter(isGroupableRoll);
  const individualRolls = plan.rolls.filter((r) => !isGroupableRoll(r));

  const grouped = groupIdenticalRolls(groupableRolls);
  const fallbackThickness = plan.totalThicknessMm || fallbackThicknessMm || undefined;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600">Total Used</p>
          <p className="text-2xl font-bold text-blue-900">{plan.totalUsedSqM.toFixed(2)} m&#178;</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4">
          <p className="text-sm font-medium text-teal-600">Rolls Required</p>
          <p className="text-2xl font-bold text-teal-900">{plan.totalRollsNeeded}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-600">Waste</p>
          <p className="text-2xl font-bold text-amber-900">
            {plan.totalWasteSqM.toFixed(2)} m&#178;
          </p>
          <p className="text-xs text-amber-600 mt-1">({plan.wastePercentage.toFixed(1)}%)</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600">Efficiency</p>
          <p className="text-2xl font-bold text-green-900">
            {(100 - plan.wastePercentage).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Cutting Diagram</h4>
        <p className="text-xs text-gray-500 mb-3">
          Each colored section represents a pipe piece. Cut marks show where to cut the roll.
        </p>
        {grouped.map((group) => (
          <CuttingDiagram
            key={group.representativeRoll.rollIndex}
            roll={group.representativeRoll}
            colorMap={colorMap}
            groupCount={group.count}
            thicknessMm={group.representativeRoll.plyThicknessMm || fallbackThickness}
            jobCardId={jobCardId}
            rubberColor={plan.rubberSpec?.color}
            userRole={userRole}
          />
        ))}
        {individualRolls.map((roll) => (
          <CuttingDiagram
            key={roll.rollIndex}
            roll={roll}
            colorMap={colorMap}
            thicknessMm={roll.plyThicknessMm || fallbackThickness}
            jobCardId={jobCardId}
            rubberColor={plan.rubberSpec?.color}
            userRole={userRole}
          />
        ))}
      </div>
    </div>
  );
}

function GenericM2View({
  totalM2,
  items,
}: {
  totalM2: number;
  items: { description: string; m2: number }[];
}) {
  const rollsNeededExact = totalM2 / STANDARD_ROLL_AREA_M2;
  const fullRollsNeeded = Math.ceil(rollsNeededExact);
  const totalRollArea = fullRollsNeeded * STANDARD_ROLL_AREA_M2;
  const leftoverM2 = totalRollArea - totalM2;
  const lastRollUsedM2 = STANDARD_ROLL_AREA_M2 - leftoverM2;
  const lastRollUsedPercent = (lastRollUsedM2 / STANDARD_ROLL_AREA_M2) * 100;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Standard tank work rolls: {STANDARD_ROLL_WIDTH_MM}mm x {STANDARD_ROLL_LENGTH_M}m ={" "}
        {STANDARD_ROLL_AREA_M2.toFixed(2)} m&#178; per roll
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600">Total Required</p>
          <p className="text-2xl font-bold text-blue-900">{totalM2.toFixed(2)} m&#178;</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4">
          <p className="text-sm font-medium text-teal-600">Rolls Required</p>
          <p className="text-2xl font-bold text-teal-900">{fullRollsNeeded}</p>
          <p className="text-xs text-teal-600 mt-1">({totalRollArea.toFixed(2)} m&#178; total)</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-600">Last Roll Usage</p>
          <p className="text-2xl font-bold text-amber-900">{lastRollUsedPercent.toFixed(0)}%</p>
          <p className="text-xs text-amber-600 mt-1">({lastRollUsedM2.toFixed(2)} m&#178; used)</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600">Leftover</p>
          <p className="text-2xl font-bold text-green-900">{leftoverM2.toFixed(2)} m&#178;</p>
          <p className="text-xs text-green-600 mt-1">from last roll</p>
        </div>
      </div>

      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Roll Breakdown</h4>
        <div className="space-y-2">
          {Array.from({ length: fullRollsNeeded }, (_, i) => {
            const rollNum = i + 1;
            const isLastRoll = rollNum === fullRollsNeeded;
            const usedPercent = isLastRoll ? lastRollUsedPercent : 100;
            const usedM2 = isLastRoll ? lastRollUsedM2 : STANDARD_ROLL_AREA_M2;

            return (
              <div key={rollNum} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-16">Roll {rollNum}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isLastRoll ? "bg-amber-500" : "bg-teal-500"}`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-24 text-right">
                  {usedM2.toFixed(2)} m&#178;
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isLastRoll ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                  }`}
                >
                  {usedPercent.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StockAvailabilityBadge({ status }: { status: "in_stock" | "partial" | "out_of_stock" }) {
  const styles = {
    in_stock: "bg-green-100 text-green-800",
    partial: "bg-amber-100 text-amber-800",
    out_of_stock: "bg-red-100 text-red-800",
  };
  const labels = {
    in_stock: "In Stock",
    partial: "Partial",
    out_of_stock: "To Order",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ManualRollInput({
  rolls,
  onChange,
}: {
  rolls: RubberPlanManualRoll[];
  onChange: (rolls: RubberPlanManualRoll[]) => void;
}) {
  const addRoll = () => {
    onChange([...rolls, { widthMm: 1200, lengthM: 12.5, thicknessMm: 5, cuts: [] }]);
  };

  const updateRoll = (idx: number, field: keyof RubberPlanManualRoll, value: number) => {
    const updated = rolls.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    onChange(updated);
  };

  const removeRoll = (idx: number) => {
    onChange(rolls.filter((_, i) => i !== idx));
  };

  const addCut = (rollIdx: number) => {
    const updated = rolls.map((r, i) =>
      i === rollIdx
        ? { ...r, cuts: [...r.cuts, { description: "", widthMm: 0, lengthMm: 0, quantity: 1 }] }
        : r,
    );
    onChange(updated);
  };

  const updateCut = (rollIdx: number, cutIdx: number, field: string, value: string | number) => {
    const updated = rolls.map((r, ri) =>
      ri === rollIdx
        ? {
            ...r,
            cuts: r.cuts.map((c, ci) => (ci === cutIdx ? { ...c, [field]: value } : c)),
          }
        : r,
    );
    onChange(updated);
  };

  const removeCut = (rollIdx: number, cutIdx: number) => {
    const updated = rolls.map((r, ri) =>
      ri === rollIdx ? { ...r, cuts: r.cuts.filter((_, ci) => ci !== cutIdx) } : r,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {rolls.map((roll, rollIdx) => (
        <div key={rollIdx} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-gray-900">Roll {rollIdx + 1}</h5>
            <button
              type="button"
              onClick={() => removeRoll(rollIdx)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Width (mm)</label>
              <input
                type="number"
                value={roll.widthMm}
                onChange={(e) => updateRoll(rollIdx, "widthMm", Number(e.target.value))}
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Length (m)</label>
              <input
                type="number"
                step="0.5"
                value={roll.lengthM}
                onChange={(e) => updateRoll(rollIdx, "lengthM", Number(e.target.value))}
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Thickness (mm)</label>
              <input
                type="number"
                value={roll.thicknessMm}
                onChange={(e) => updateRoll(rollIdx, "thicknessMm", Number(e.target.value))}
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
          </div>
          {roll.cuts.length > 0 && (
            <div className="space-y-2 mb-2">
              <p className="text-xs font-medium text-gray-600">Cuts:</p>
              {roll.cuts.map((cut, cutIdx) => (
                <div key={cutIdx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={cut.description}
                    onChange={(e) => updateCut(rollIdx, cutIdx, "description", e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="W mm"
                    value={cut.widthMm || ""}
                    onChange={(e) => updateCut(rollIdx, cutIdx, "widthMm", Number(e.target.value))}
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="L mm"
                    value={cut.lengthMm || ""}
                    onChange={(e) => updateCut(rollIdx, cutIdx, "lengthMm", Number(e.target.value))}
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={cut.quantity}
                    onChange={(e) => updateCut(rollIdx, cutIdx, "quantity", Number(e.target.value))}
                    className="w-14 px-2 py-1 border rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeCut(rollIdx, cutIdx)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => addCut(rollIdx)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add cut
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRoll}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
      >
        + Add roll
      </button>
    </div>
  );
}

function RubberSOHPanel({
  stockOptions,
  plan,
  existingOverride,
  jobCardId,
  onOverrideSaved,
  selectedPly,
  onPlyChange,
  lineItems,
  userRole,
}: {
  stockOptions: RubberStockOptionsResponse;
  plan: CuttingPlan;
  existingOverride: RubberPlanOverride | null;
  jobCardId: number;
  onOverrideSaved: (override: RubberPlanOverride) => void;
  selectedPly: number[] | null;
  onPlyChange: (ply: number[] | null) => void;
  userRole?: string | null;
  lineItems: Array<{
    id?: number;
    itemCode: string | null;
    itemDescription: string | null;
    itemNo?: string | null;
    quantity: number | null;
    m2: number | null;
    notes?: string | null;
  }>;
}) {
  const [planDecision, setPlanDecision] = useState<"pending" | "accepted" | "rejected">(
    existingOverride?.status === "accepted"
      ? "accepted"
      : existingOverride?.status === "manual"
        ? "rejected"
        : "pending",
  );
  const [manualRolls, setManualRolls] = useState<RubberPlanManualRoll[]>(
    existingOverride?.manualRolls || [],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [allocatingPly, setAllocatingPly] = useState<number | null>(null);
  const [allocatingWidthMm, setAllocatingWidthMm] = useState<number>(STANDARD_ROLL_WIDTH_MM);
  const [allocatingLengthM, setAllocatingLengthM] = useState<number>(STANDARD_ROLL_LENGTH_M);
  const [allocatingSaving, setAllocatingSaving] = useState(false);
  const [plyAllocations, setPlyAllocations] = useState<
    Record<number, { widthMm: number; lengthM: number; inStock: boolean }>
  >({});

  const handleAllocateRoll = async (plyIdx: number) => {
    if (!allocatingWidthMm || !allocatingLengthM) return;
    setAllocatingSaving(true);
    try {
      const matchingStock = stockOptions.stockItems.find(
        (s) =>
          s.thicknessMm === plan.plies[plyIdx].thicknessMm &&
          s.widthMm === allocatingWidthMm &&
          s.lengthM === allocatingLengthM &&
          s.quantityAvailable > 0,
      );
      if (matchingStock) {
        await stockControlApiClient.allocateStock(jobCardId, {
          stockItemId: matchingStock.stockItemId,
          quantityUsed: 1,
          notes: `Rubber ply ${plyIdx + 1} allocation (${allocatingWidthMm}mm x ${allocatingLengthM}m)`,
        });
      }
      setPlyAllocations((prev) => ({
        ...prev,
        [plyIdx]: {
          widthMm: allocatingWidthMm,
          lengthM: allocatingLengthM,
          inStock: !!matchingStock,
        },
      }));
      setAllocatingPly(null);
      setAllocatingWidthMm(STANDARD_ROLL_WIDTH_MM);
      setAllocatingLengthM(STANDARD_ROLL_LENGTH_M);
    } finally {
      setAllocatingSaving(false);
    }
  };

  const handleAcceptPlan = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const override: RubberPlanOverride = {
        status: "accepted",
        selectedPlyCombination: selectedPly,
        manualRolls: null,
        reviewedBy: null,
        reviewedAt: null,
      };
      await stockControlApiClient.updateRubberPlan(jobCardId, override);
      setPlanDecision("accepted");
      onOverrideSaved(override);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save plan";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectPlan = () => {
    setPlanDecision("rejected");
    if (manualRolls.length === 0) {
      setManualRolls([{ widthMm: 1200, lengthM: 12.5, thicknessMm: 5, cuts: [] }]);
    }
  };

  const handleSaveManual = async (
    rollsToSave?: RubberPlanManualRoll[],
    dimensionOverrides?: RubberDimensionOverride[],
  ) => {
    const rolls = rollsToSave !== undefined ? rollsToSave : manualRolls;
    setSaving(true);
    setSaveError(null);
    try {
      const override: RubberPlanOverride = {
        status: "manual",
        selectedPlyCombination: null,
        manualRolls: rolls,
        dimensionOverrides: dimensionOverrides?.length ? dimensionOverrides : null,
        reviewedBy: null,
        reviewedAt: null,
      };
      await stockControlApiClient.updateRubberPlan(jobCardId, override);
      setManualRolls(rolls);
      onOverrideSaved(override);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save manual plan";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPlanDecision("pending");
    onPlyChange(null);
    setManualRolls([]);
  };

  if (!stockOptions.rubberSpec && stockOptions.plyCombinations.length === 0 && !plan.hasPipeItems) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Cutting Plan Review</h4>
        {planDecision !== "pending" && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Reset decisions
          </button>
        )}
      </div>

      {stockOptions.rubberSpec && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <span className="font-medium">Spec:</span> {stockOptions.rubberSpec.thicknessMm}mm
          {stockOptions.rubberSpec.shore ? ` / ${stockOptions.rubberSpec.shore} Shore` : ""}
          {stockOptions.rubberSpec.color ? ` / ${stockOptions.rubberSpec.color}` : ""}
          {stockOptions.rubberSpec.compound ? ` / ${stockOptions.rubberSpec.compound}` : ""}
          {stockOptions.rubberSpec.pattern ? ` / ${stockOptions.rubberSpec.pattern}` : ""}
        </div>
      )}

      {plan.isMultiPly && plan.plies.length > 1 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Per Ply Breakdown
          </p>
          {plan.plies.map((ply, idx) => {
            const matchingStock = stockOptions.stockItems.filter(
              (s) => s.thicknessMm === ply.thicknessMm,
            );
            const totalAvailable = matchingStock.reduce((sum, s) => sum + s.quantityAvailable, 0);
            const status =
              totalAvailable >= ply.totalRollsNeeded
                ? ("in_stock" as const)
                : totalAvailable > 0
                  ? ("partial" as const)
                  : ("out_of_stock" as const);
            const allocated = plyAllocations[idx];

            return (
              <div key={idx} className="border rounded bg-white">
                <div className="flex items-center justify-between p-2 text-sm">
                  <span className="font-medium">
                    Ply {idx + 1}: {ply.thicknessMm}mm
                  </span>
                  <span>{ply.totalRollsNeeded} rolls needed</span>
                  <span>{totalAvailable} available</span>
                  <StockAvailabilityBadge status={status} />
                  {allocated ? (
                    <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">
                      {allocated.widthMm}mm x {allocated.lengthM}m
                      {allocated.inStock ? " (in stock)" : " (to order)"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAllocatingPly(allocatingPly === idx ? null : idx);
                        setAllocatingWidthMm(STANDARD_ROLL_WIDTH_MM);
                        setAllocatingLengthM(STANDARD_ROLL_LENGTH_M);
                      }}
                      className="text-xs px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Allocate Roll
                    </button>
                  )}
                </div>
                {allocatingPly === idx && (
                  <div className="px-2 pb-2 pt-1 border-t border-gray-100 flex items-center gap-2">
                    <label className="text-xs text-gray-500">Width:</label>
                    <select
                      value={allocatingWidthMm}
                      onChange={(e) => setAllocatingWidthMm(Number(e.target.value))}
                      className="text-xs rounded border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    >
                      {ROLL_WIDTH_OPTIONS_MM.map((w) => {
                        const inStock = matchingStock.some(
                          (s) => s.widthMm === w && s.quantityAvailable > 0,
                        );
                        return (
                          <option key={w} value={w}>
                            {w}mm{inStock ? " *" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <label className="text-xs text-gray-500">Length:</label>
                    <select
                      value={allocatingLengthM}
                      onChange={(e) => setAllocatingLengthM(Number(e.target.value))}
                      className="text-xs rounded border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    >
                      {ROLL_LENGTH_OPTIONS_M.map((l) => {
                        const inStock = matchingStock.some(
                          (s) => s.lengthM === l && s.quantityAvailable > 0,
                        );
                        return (
                          <option key={l} value={l}>
                            {l}m{inStock ? " *" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {matchingStock.some(
                      (s) =>
                        s.widthMm === allocatingWidthMm &&
                        s.lengthM === allocatingLengthM &&
                        s.quantityAvailable > 0,
                    ) ? (
                      <span className="text-xs text-green-600 font-medium">In Stock</span>
                    ) : (
                      <span className="text-xs text-orange-600 font-medium">To Order</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAllocateRoll(idx)}
                      disabled={allocatingSaving}
                      className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {allocatingSaving ? "..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAllocatingPly(null);
                        setAllocatingWidthMm(STANDARD_ROLL_WIDTH_MM);
                        setAllocatingLengthM(STANDARD_ROLL_LENGTH_M);
                      }}
                      className="text-xs px-2 py-1.5 rounded text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
        <span className="text-sm font-medium text-gray-700">Auto-generated cutting plan:</span>
        <div className="flex items-center gap-2 ml-auto">
          {planDecision === "accepted" ? (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Accepted
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Edit
              </button>
            </>
          ) : planDecision === "rejected" ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Overridden
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAcceptPlan}
                disabled={saving}
                className="px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Accept Plan"}
              </button>
              <button
                type="button"
                onClick={handleRejectPlan}
                disabled={saving}
                className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Override
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">Failed to save manual plan</p>
          <p className="text-xs text-red-600 mt-1">{saveError}</p>
        </div>
      )}

      {planDecision === "rejected" && (
        <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50">
          <h5 className="text-sm font-semibold text-amber-900 mb-3">Manual Roll Specification</h5>
          <p className="text-xs text-amber-700 mb-4">
            Drag and drop panels onto rolls to arrange your cutting layout.
          </p>
          <JigsawEditor
            parsedItems={expandAndRotateItems(
              lineItems.map((li, idx) =>
                parsePipeItem(
                  String(li.id || idx),
                  li.itemDescription || li.itemCode || "",
                  Number(li.quantity || 1),
                  li.m2 ? Number(li.m2) : null,
                  li.itemNo || null,
                ),
              ),
            )}
            rubberSpec={stockOptions?.rubberSpec}
            existingManualRolls={manualRolls}
            onSave={(rolls, overrides) => handleSaveManual(rolls, overrides)}
            saving={saving}
          />
        </div>
      )}

      {stockOptions.stockItems.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
            All rubber stock ({stockOptions.stockItems.length} items)
          </summary>
          <div className="mt-2 space-y-1">
            {stockOptions.stockItems.map((item) => (
              <div
                key={item.stockItemId}
                className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded"
              >
                <span className="truncate max-w-[60%]">{item.name}</span>
                <span className="text-gray-500">
                  {item.thicknessMm}mm x {item.widthMm}mm x {item.lengthM}m
                </span>
                <span className="font-medium">Qty: {item.quantityAvailable}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function RubberAllocationSection({
  lineItems,
  jobCardId,
  rubberPlanOverride,
}: RubberAllocationProps) {
  const { user: scUser } = useStockControlAuth();
  const [stockOptions, setStockOptions] = useState<RubberStockOptionsResponse | null>(null);
  const [override, setOverride] = useState<RubberPlanOverride | null>(rubberPlanOverride);
  const [selectedPly, setSelectedPly] = useState<number[] | null>(
    rubberPlanOverride?.selectedPlyCombination || null,
  );

  useEffect(() => {
    stockControlApiClient
      .rubberStockOptions(jobCardId)
      .then(setStockOptions)
      .catch(() => null);
  }, [jobCardId]);

  const stockQuery = stockOptions
    ? {
        availableThicknesses: stockOptions.availableThicknesses,
        rolls: stockOptions.stockItems
          .filter((s) => s.thicknessMm !== null)
          .map((s) => ({
            stockItemId: s.stockItemId,
            thicknessMm: s.thicknessMm as number,
            widthMm: s.widthMm || 0,
            lengthM: s.lengthM || 0,
            color: s.color,
            compoundCode: s.compoundCode,
            quantityAvailable: s.quantityAvailable,
          })),
      }
    : null;

  const autoPlan = calculateCuttingPlan(
    lineItems.map((li, idx) => ({
      id: li.id || idx,
      itemCode: li.itemCode,
      itemDescription: li.itemDescription,
      itemNo: li.itemNo,
      quantity: li.quantity,
      m2: li.m2,
      notes: li.notes,
    })),
    stockQuery,
    selectedPly,
  );

  const plan =
    override?.status === "manual" && override.manualRolls?.length
      ? manualRollsToCuttingPlan(override.manualRolls)
      : autoPlan;

  const totalM2Required = lineItems.reduce((sum, li) => sum + (li.m2 ? Number(li.m2) : 0), 0);

  const lineItemsForPlan = lineItems.map((li, idx) => ({
    id: li.id || idx,
    itemCode: li.itemCode,
    itemDescription: li.itemDescription,
    itemNo: li.itemNo,
    quantity: li.quantity,
    m2: li.m2,
    notes: li.notes,
  }));

  const plyCombos = stockOptions?.plyCombinations || [];
  const comboSummaries = plyCombos.map((combo) => {
    const comboPlan = calculateCuttingPlan(lineItemsForPlan, stockQuery, combo.thicknesses);
    return {
      thicknesses: combo.thicknesses,
      allInStock: combo.allInStock,
      partiallyInStock: combo.partiallyInStock,
      totalRolls: comboPlan.plies.reduce((sum, ply) => sum + ply.totalRollsNeeded, 0),
      totalM2: comboPlan.totalUsedSqM + comboPlan.totalWasteSqM,
    };
  });

  if (totalM2Required === 0 && !plan.hasPipeItems) {
    return null;
  }

  const isPlySelected = (thicknesses: number[]) =>
    selectedPly !== null &&
    thicknesses.length === selectedPly.length &&
    thicknesses.every((t, i) => t === selectedPly[i]);

  return (
    <div className="bg-white shadow rounded-lg overflow-x-auto">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Rubber Allocation</h3>
        {plan.hasPipeItems && (
          <p className="mt-1 text-sm text-gray-500">
            Internal lining uses ID circumference; pulleys/drums/rollers use OD circumference. +50mm
            bevel allowance on all cuts. Roll widths: 800-1450mm. Lengths: up to 12.5m.
          </p>
        )}
      </div>
      <div className="px-4 py-5 sm:px-6">
        {comboSummaries.length > 0 && plan.hasPipeItems && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Ply Combinations
            </p>
            <div className="space-y-2">
              {comboSummaries.map((combo, idx) => {
                const selected = isPlySelected(combo.thicknesses);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 border rounded ${selected ? "border-green-500 bg-green-50" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-1">
                      {combo.thicknesses.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium"
                        >
                          {t}mm
                        </span>
                      ))}
                    </div>
                    <StockAvailabilityBadge
                      status={
                        combo.allInStock
                          ? "in_stock"
                          : combo.partiallyInStock
                            ? "partial"
                            : "out_of_stock"
                      }
                    />
                    <span className="text-xs text-gray-500">
                      {combo.totalRolls} roll{combo.totalRolls !== 1 ? "s" : ""} &middot;{" "}
                      {combo.totalM2.toFixed(1)} m&sup2;
                    </span>
                    {idx === 0 && !selected && (
                      <span className="text-xs text-gray-400 italic">recommended</span>
                    )}
                    {selected && (
                      <span className="text-xs text-green-700 font-medium">Selected</span>
                    )}
                    {!selected && (
                      <button
                        type="button"
                        onClick={() => setSelectedPly(combo.thicknesses)}
                        className="ml-auto text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Select
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {plan.hasPipeItems ? (
          <PipeCuttingView
            plan={plan}
            fallbackThicknessMm={stockOptions?.rubberSpec?.thicknessMm}
            jobCardId={jobCardId}
            userRole={scUser?.role || null}
          />
        ) : (
          <GenericM2View totalM2={plan.genericM2Total} items={plan.genericM2Items} />
        )}

        {plan.hasPipeItems && plan.genericM2Total > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Additional Items (m&#178; only)
            </h4>
            <GenericM2View totalM2={plan.genericM2Total} items={plan.genericM2Items} />
          </div>
        )}

        {stockOptions && (
          <RubberSOHPanel
            stockOptions={stockOptions}
            plan={plan}
            existingOverride={override}
            jobCardId={jobCardId}
            onOverrideSaved={setOverride}
            selectedPly={selectedPly}
            onPlyChange={setSelectedPly}
            lineItems={lineItemsForPlan}
            userRole={scUser?.role || null}
          />
        )}
      </div>
    </div>
  );
}

export function RubberAllocationGuard({
  jobCard,
  onRefresh,
}: {
  jobCard: JobCard;
  onRefresh?: () => Promise<void>;
}) {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculateM2 = async () => {
    setIsRecalculating(true);
    try {
      await stockControlApiClient.recalculateM2(jobCard.id);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsRecalculating(false);
    }
  };

  const allText = [
    jobCard.notes || "",
    ...(jobCard.lineItems || []).map(
      (li) => `${li.itemCode || ""} ${li.itemDescription || ""} ${li.notes || ""}`,
    ),
  ]
    .join(" ")
    .toLowerCase();
  const isRubberJob =
    allText.includes("rubber") ||
    allText.includes("r/l") ||
    allText.includes("lining") ||
    allText.includes("liner") ||
    allText.includes("lagging");
  if (!isRubberJob) return null;

  const validItems = jobCard.lineItems ? jobCard.lineItems.filter(isValidLineItem) : [];
  const hasM2Items = validItems.some((li) => li.m2 !== null && Number(li.m2) > 0);
  if (!hasM2Items) return null;

  const allLineItems = jobCard.lineItems || [];
  const totalM2 = allLineItems.reduce((sum, li) => {
    const m2 = Number(li.m2) || 0;
    const qty = Number(li.quantity) || 1;
    return sum + m2 * qty;
  }, 0);

  return (
    <>
      {allLineItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              Line Items{" "}
              <span className="text-gray-400 font-normal">{allLineItems.length} items</span>
            </h4>
            <button
              type="button"
              onClick={handleRecalculateM2}
              disabled={isRecalculating}
              className="text-xs text-teal-600 hover:text-teal-800 disabled:text-gray-400"
            >
              {isRecalculating ? "Recalculating..." : "Re-analyse m\u00B2"}
            </button>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 w-10">#</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Item Code</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Description</th>
                <th className="text-right py-2 pr-4 font-medium text-gray-500">Qty</th>
                <th className="text-right py-2 pr-4 font-medium text-gray-500">m²</th>
                <th className="text-right py-2 pr-4 font-medium text-gray-500">Total m²</th>
              </tr>
            </thead>
            <tbody>
              {allLineItems.map((li, idx) => {
                const m2 = Number(li.m2) || 0;
                const qty = Number(li.quantity) || 1;
                return (
                  <tr key={li.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-400">{idx + 1}</td>
                    <td className="py-2 pr-4 text-gray-900 font-medium">{li.itemCode || "—"}</td>
                    <td className="py-2 pr-4 text-gray-700">{li.itemDescription || "—"}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-gray-900">{qty}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      {m2 > 0 ? m2.toFixed(2) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold text-teal-700">
                      {m2 > 0 ? (m2 * qty).toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300">
                <td colSpan={5} className="py-2 pr-4 text-right font-medium text-gray-600">
                  Total m²
                </td>
                <td className="py-2 pr-4 text-right font-bold text-teal-800">
                  {totalM2.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <RubberAllocationSection
        lineItems={validItems}
        jobCardId={jobCard.id}
        rubberPlanOverride={jobCard.rubberPlanOverride || null}
      />
    </>
  );
}
