"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CoatingAnalysis,
  JobCard,
  JobCardApproval,
  JobCardAttachment,
  JobCardVersion,
  Requisition,
  RubberPlanManualRoll,
  RubberPlanOverride,
  RubberStockOptionsResponse,
  StaffMember,
  StockAllocation,
  StockItem,
  UnverifiedProduct,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { ApprovalModal } from "@/app/stock-control/components/ApprovalModal";
import { JigsawEditor } from "@/app/stock-control/components/jigsaw/JigsawEditor";
import { PhotoCapture } from "@/app/stock-control/components/PhotoCapture";
import { WorkflowStatus } from "@/app/stock-control/components/WorkflowStatus";
import {
  type CuttingPlan,
  calculateCuttingPlan,
  expandAndRotateItems,
  type Offcut,
  parsePipeItem,
  type RollAllocation,
} from "@/app/stock-control/lib/rubberCuttingCalculator";

function EditableM2Field({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (val: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value || 0));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(inputVal);
    if (Number.isNaN(parsed) || parsed < 0) return;
    try {
      setSaving(true);
      await onSave(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        <span className="font-medium text-gray-500">{label}: </span>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-20 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={handleSave}
          disabled={saving}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div>
      <span className="font-medium text-gray-500">{label}: </span>
      <button
        type="button"
        className="text-gray-900 hover:text-teal-600 hover:underline cursor-pointer"
        onClick={() => {
          setInputVal(String(value || 0));
          setEditing(true);
        }}
        title="Click to edit"
      >
        {value > 0 ? Number(value).toFixed(2) : "0.00"}
      </button>
    </div>
  );
}

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  draft: [
    { label: "Activate", next: "active", color: "bg-green-600 hover:bg-green-700" },
    { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  active: [
    { label: "Complete", next: "completed", color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  completed: [],
  cancelled: [{ label: "Reinstate", next: "draft", color: "bg-amber-600 hover:bg-amber-700" }],
};

const INVALID_LINE_ITEM_PATTERNS = [
  /^production$/i,
  /^foreman?\s*sign/i,
  /^forman\s*sign/i,
  /^material\s*spec/i,
  /^job\s*comp\s*date/i,
  /^completion\s*date/i,
  /^supervisor/i,
  /^quality\s*control/i,
  /^qc\s*sign/i,
  /^inspector/i,
  /^approved\s*by/i,
  /^checked\s*by/i,
  /^date$/i,
  /^signature$/i,
  /^sign$/i,
  /^remarks$/i,
  /^comments$/i,
  /^notes$/i,
];

function isValidLineItem(li: {
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  jtNo: string | null;
}): boolean {
  const itemCode = (li.itemCode || "").trim();
  const description = (li.itemDescription || "").trim();
  const textToCheck = itemCode || description;

  if (!textToCheck) {
    return false;
  }

  const isFormLabel = INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(textToCheck));
  if (isFormLabel) {
    return false;
  }

  const qty = li.quantity;
  const hasNoData =
    !li.itemDescription && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  if (hasNoData && itemCode) {
    const looksLikeLabel = /^[A-Za-z\s]+$/.test(itemCode) && itemCode.length < 30;
    const isLongTextNote = itemCode.length > 60;
    const isRubberSpecNote =
      /^r\/l\b/i.test(itemCode) || /rubber\s+(lining|sheet|lagging)/i.test(itemCode);
    if (looksLikeLabel || isLongTextNote || isRubberSpecNote) {
      return false;
    }
  }

  return true;
}

const STANDARD_ROLL_WIDTH_MM = 1200;
const STANDARD_ROLL_LENGTH_M = 12.5;
const STANDARD_ROLL_AREA_M2 = (STANDARD_ROLL_WIDTH_MM / 1000) * STANDARD_ROLL_LENGTH_M;

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

function OffcutList({ offcuts }: { offcuts: Offcut[] }) {
  if (offcuts.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-500 mb-1">Offcuts:</div>
      <div className="flex flex-wrap gap-1">
        {offcuts.map((offcut, idx) => (
          <span
            key={`offcut-${idx}`}
            className="text-xs bg-gray-100 border border-dashed border-gray-400 rounded px-2 py-0.5 text-gray-600"
          >
            {offcut.widthMm}mm x {offcut.lengthMm}mm ({offcut.areaSqM.toFixed(3)} m&#178;)
          </span>
        ))}
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
}: {
  roll: RollAllocation;
  colorMap: Map<string, string>;
  groupCount?: number;
  thicknessMm?: number;
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
          const rolls = cut.stripsPerPiece ?? 1;
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
        <div className="text-xs text-gray-500 mb-1">Cut List:</div>
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
                {(cut.stripsPerPiece ?? 1) > 1 && (
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

      <OffcutList offcuts={roll.offcuts} />
    </div>
  );
}

function PipeCuttingView({
  plan,
  fallbackThicknessMm,
}: {
  plan: CuttingPlan;
  fallbackThicknessMm?: number;
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
          />
        ))}
        {individualRolls.map((roll) => (
          <CuttingDiagram
            key={roll.rollIndex}
            roll={roll}
            colorMap={colorMap}
            thicknessMm={roll.plyThicknessMm || fallbackThickness}
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
}: {
  stockOptions: RubberStockOptionsResponse;
  plan: CuttingPlan;
  existingOverride: RubberPlanOverride | null;
  jobCardId: number;
  onOverrideSaved: (override: RubberPlanOverride) => void;
  selectedPly: number[] | null;
  onPlyChange: (ply: number[] | null) => void;
  lineItems: Array<{
    id?: number;
    itemCode: string | null;
    itemDescription: string | null;
    itemNo?: string | null;
    quantity: number | null;
    m2: number | null;
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

  const handleSaveManual = async (rollsToSave?: RubberPlanManualRoll[]) => {
    const rolls = rollsToSave ?? manualRolls;
    setSaving(true);
    try {
      const override: RubberPlanOverride = {
        status: "manual",
        selectedPlyCombination: null,
        manualRolls: rolls,
        reviewedBy: null,
        reviewedAt: null,
      };
      await stockControlApiClient.updateRubberPlan(jobCardId, override);
      setManualRolls(rolls);
      onOverrideSaved(override);
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
            onSave={(rolls) => handleSaveManual(rolls)}
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

  const plan = calculateCuttingPlan(
    lineItems.map((li, idx) => ({
      id: li.id || idx,
      itemCode: li.itemCode,
      itemDescription: li.itemDescription,
      itemNo: li.itemNo,
      quantity: li.quantity,
      m2: li.m2,
    })),
    stockQuery,
    selectedPly,
  );

  const totalM2Required = lineItems.reduce((sum, li) => sum + (li.m2 ? Number(li.m2) : 0), 0);

  const lineItemsForPlan = lineItems.map((li, idx) => ({
    id: li.id || idx,
    itemCode: li.itemCode,
    itemDescription: li.itemDescription,
    itemNo: li.itemNo,
    quantity: li.quantity,
    m2: li.m2,
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
    <div className="bg-white shadow rounded-lg overflow-hidden">
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
          />
        )}
      </div>
    </div>
  );
}

function RubberAllocationGuard({ jobCard }: { jobCard: JobCard }) {
  const allText = [
    jobCard.notes || "",
    ...(jobCard.lineItems || []).map((li) => `${li.itemCode || ""} ${li.itemDescription || ""}`),
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

  return (
    <RubberAllocationSection
      lineItems={validItems}
      jobCardId={jobCard.id}
      rubberPlanOverride={jobCard.rubberPlanOverride ?? null}
    />
  );
}

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useStockControlAuth();
  const jobId = Number(params.id);

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusData | null>(null);
  const [approvals, setApprovals] = useState<JobCardApproval[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentApprovalStep, setCurrentApprovalStep] = useState("");
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [coatingAnalysis, setCoatingAnalysis] = useState<CoatingAnalysis | null>(null);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    stockItemId: 0,
    quantityUsed: 1,
    notes: "",
    staffMemberId: 0,
  });
  const [isAllocating, setIsAllocating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [approvingAllocationId, setApprovingAllocationId] = useState<number | null>(null);
  const [rejectingAllocationId, setRejectingAllocationId] = useState<number | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [versions, setVersions] = useState<JobCardVersion[]>([]);
  const [attachments, setAttachments] = useState<JobCardAttachment[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentNotes, setAmendmentNotes] = useState("");
  const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
  const [isUploadingAmendment, setIsUploadingAmendment] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isExtracting, setIsExtracting] = useState<number | null>(null);
  const [isExtractingAll, setIsExtractingAll] = useState(false);
  const [isDraggingAmendment, setIsDraggingAmendment] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [showTdsModal, setShowTdsModal] = useState(false);
  const [unverifiedProducts, setUnverifiedProducts] = useState<UnverifiedProduct[]>([]);
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [isUploadingTds, setIsUploadingTds] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobData, allocationsData] = await Promise.all([
        stockControlApiClient.jobCardById(jobId),
        stockControlApiClient.jobCardAllocations(jobId),
      ]);
      setJobCard(jobData);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setError(null);

      stockControlApiClient
        .jobCardCoatingAnalysis(jobId)
        .then((data) => setCoatingAnalysis(data))
        .catch(() => setCoatingAnalysis(null));

      stockControlApiClient
        .requisitions()
        .then((reqs) => {
          const match = reqs.find((r) => r.jobCardId === jobId && r.status !== "cancelled");
          setRequisition(match ?? null);
        })
        .catch(() => setRequisition(null));

      stockControlApiClient
        .jobCardVersionHistory(jobId)
        .then((data) => setVersions(data))
        .catch(() => setVersions([]));

      stockControlApiClient
        .jobCardAttachments(jobId)
        .then((data) => setAttachments(data))
        .catch(() => setAttachments([]));

      stockControlApiClient
        .workflowStatus(jobId)
        .then((data) => setWorkflowStatus(data))
        .catch(() => setWorkflowStatus(null));

      stockControlApiClient
        .approvalHistory(jobId)
        .then((data) => setApprovals(data))
        .catch(() => setApprovals([]));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load job card"));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchStockItems = async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stock items"));
    }
  };

  const openAllocateModal = async () => {
    await fetchStockItems();
    try {
      const staff = await stockControlApiClient.staffMembers({ active: "true" });
      setActiveStaff(Array.isArray(staff) ? staff : []);
    } catch {
      setActiveStaff([]);
    }
    setAllocateForm({ stockItemId: 0, quantityUsed: 1, notes: "", staffMemberId: 0 });
    setCapturedFile(null);
    setShowAllocateModal(true);
  };

  const handleAllocate = async () => {
    if (!allocateForm.stockItemId) return;
    try {
      setIsAllocating(true);
      const allocation = await stockControlApiClient.allocateStock(jobId, {
        stockItemId: allocateForm.stockItemId,
        quantityUsed: allocateForm.quantityUsed,
        notes: allocateForm.notes || undefined,
        staffMemberId: allocateForm.staffMemberId || undefined,
      });
      if (capturedFile) {
        await stockControlApiClient.uploadAllocationPhoto(jobId, allocation.id, capturedFile);
      }
      setShowAllocateModal(false);
      setCapturedFile(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to allocate stock"));
    } finally {
      setIsAllocating(false);
    }
  };

  const handleApproveAllocation = async (allocationId: number) => {
    try {
      setApprovingAllocationId(allocationId);
      await stockControlApiClient.approveOverAllocation(jobId, allocationId);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to approve allocation"));
    } finally {
      setApprovingAllocationId(null);
    }
  };

  const handleRejectAllocation = async (allocationId: number, reason: string) => {
    if (!reason.trim()) return;
    try {
      setRejectingAllocationId(allocationId);
      await stockControlApiClient.rejectOverAllocation(jobId, allocationId, reason);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reject allocation"));
    } finally {
      setRejectingAllocationId(null);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setIsAnalysing(true);
      const result = await stockControlApiClient.triggerCoatingAnalysis(jobId);
      setCoatingAnalysis(result && "id" in result ? result : null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Coating analysis failed"));
    } finally {
      setIsAnalysing(false);
    }
  };

  const handlePrintQr = async () => {
    try {
      setIsDownloadingQr(true);
      await stockControlApiClient.downloadJobCardQrPdf(jobId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download job card PDF"));
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "active") {
      try {
        const products = await stockControlApiClient.unverifiedCoatingProducts(jobId);
        if (products.length > 0) {
          setUnverifiedProducts(products);
          setShowTdsModal(true);
          return;
        }
      } catch {
        // If check fails, proceed with activation attempt and let backend validate
      }
    }

    try {
      setIsUpdatingStatus(true);
      await stockControlApiClient.updateJobCard(jobId, { status: newStatus });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleTdsUpload = async () => {
    if (!tdsFile) return;
    try {
      setIsUploadingTds(true);
      const updated = await stockControlApiClient.uploadCoatingTds(jobId, tdsFile);
      setCoatingAnalysis(updated);
      setTdsFile(null);
      const remaining = (updated.coats || []).filter((c) => !c.verified);
      if (remaining.length === 0) {
        setShowTdsModal(false);
        setUnverifiedProducts([]);
      } else {
        setUnverifiedProducts(
          remaining.map((c) => ({
            product: c.product,
            genericType: c.genericType,
            estimatedVolumeSolids: c.solidsByVolumePercent,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to process TDS"));
    } finally {
      setIsUploadingTds(false);
    }
  };

  const handleApprove = async (signatureDataUrl?: string, comments?: string) => {
    await stockControlApiClient.approveWorkflowStep(jobId, {
      signatureDataUrl,
      comments,
    });
    fetchData();
  };

  const handleReject = async (reason: string) => {
    await stockControlApiClient.rejectWorkflowStep(jobId, reason);
    fetchData();
  };

  const openApprovalModal = (stepName: string) => {
    setCurrentApprovalStep(stepName);
    setShowApprovalModal(true);
  };

  const handlePrintSignedPdf = async () => {
    try {
      await stockControlApiClient.downloadSignedJobCardPdf(jobId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download signed PDF"));
    }
  };

  const handleAmendmentUpload = async () => {
    if (!amendmentFile) return;
    try {
      setIsUploadingAmendment(true);
      await stockControlApiClient.uploadJobCardAmendment(
        jobId,
        amendmentFile,
        amendmentNotes || undefined,
      );
      setShowAmendmentModal(false);
      setAmendmentFile(null);
      setAmendmentNotes("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload amendment"));
    } finally {
      setIsUploadingAmendment(false);
    }
  };

  const handleAttachmentUpload = async () => {
    if (attachmentFiles.length === 0) return;
    try {
      setIsUploadingAttachment(true);
      await attachmentFiles.reduce(
        (chain, file) =>
          chain.then(() =>
            stockControlApiClient.uploadJobCardAttachment(jobId, file).then(() => undefined),
          ),
        Promise.resolve() as Promise<void>,
      );
      setAttachmentFiles([]);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload attachment"));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleTriggerExtraction = async (attachmentId: number) => {
    try {
      setIsExtracting(attachmentId);
      await stockControlApiClient.triggerDrawingExtraction(jobId, attachmentId);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Extraction failed"));
    } finally {
      setIsExtracting(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      await stockControlApiClient.deleteJobCardAttachment(jobId, attachmentId);
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete attachment"));
    }
  };

  const handleAmendmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAmendment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setAmendmentFile(files[0]);
    }
  };

  const handleAmendmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingAmendment(true);
  };

  const handleAmendmentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingAmendment(false);
    }
  };

  const handleExtractAll = async () => {
    try {
      setIsExtractingAll(true);
      await stockControlApiClient.extractAllDrawings(jobId);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Extraction failed"));
    } finally {
      setIsExtractingAll(false);
    }
  };

  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validExtensions = [".pdf", ".dxf"];
      const newFiles = Array.from(files).filter((f) =>
        validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
      );
      setAttachmentFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleAttachmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingAttachment(true);
  };

  const handleAttachmentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingAttachment(false);
    }
  };

  const extractionStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      processing: "bg-blue-100 text-blue-800",
      analysed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job card...</p>
        </div>
      </div>
    );
  }

  if (error || !jobCard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Job card not found"}</p>
          <Link
            href="/stock-control/portal/job-cards"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Job Cards
          </Link>
        </div>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[jobCard.status.toLowerCase()] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/stock-control/portal/job-cards"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{jobCard.jobNumber}</h1>
              {jobCard.versionNumber && jobCard.versionNumber > 1 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  v{jobCard.versionNumber}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
              >
                {jobCard.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{jobCard.jobName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintQr}
            disabled={isDownloadingQr}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            {isDownloadingQr ? "Generating..." : "Print JC"}
          </button>
          {transitions.map((transition) => (
            <button
              key={transition.next}
              onClick={() => handleStatusUpdate(transition.next)}
              disabled={isUpdatingStatus}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${transition.color}`}
            >
              {transition.label}
            </button>
          ))}
          {workflowStatus?.canApprove && workflowStatus.currentStep && (
            <button
              onClick={() => openApprovalModal(workflowStatus.currentStep!)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Review &amp; Approve
            </button>
          )}
          {workflowStatus?.currentStatus === "ready_for_dispatch" && (
            <>
              <button
                onClick={handlePrintSignedPdf}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Signed JC
              </button>
              <Link
                href={`/stock-control/portal/job-cards/${jobId}/dispatch`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                Start Dispatch
              </Link>
            </>
          )}
          {jobCard.status === "active" && (
            <button
              onClick={openAllocateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Allocate Stock
            </button>
          )}
        </div>
      </div>

      {workflowStatus && workflowStatus.currentStatus !== "draft" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WorkflowStatus currentStatus={workflowStatus.currentStatus} approvals={approvals} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Actions</h3>
            {workflowStatus.canApprove && workflowStatus.currentStep ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  This job card is awaiting your approval at the{" "}
                  <span className="font-medium">
                    {workflowStatus.currentStep.replace(/_/g, " ")}
                  </span>{" "}
                  step.
                </p>
                <button
                  onClick={() => openApprovalModal(workflowStatus.currentStep!)}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                >
                  Review &amp; Approve
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {workflowStatus.currentStatus === "dispatched" ? (
                  <p className="text-green-600 font-medium">
                    This job card has been fully dispatched.
                  </p>
                ) : (
                  <p>Awaiting action from another role.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Job Card Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">JC Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jcNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Page Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.pageNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.customerName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
                >
                  {jobCard.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.updatedAt)}</dd>
            </div>
            {jobCard.description && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.description}</dd>
              </div>
            )}
            {jobCard.poNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.poNumber}</dd>
              </div>
            )}
            {jobCard.siteLocation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Site / Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.siteLocation}</dd>
              </div>
            )}
            {jobCard.contactPerson && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.contactPerson}</dd>
              </div>
            )}
            {jobCard.dueDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.dueDate}</dd>
              </div>
            )}
            {jobCard.reference && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Reference</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.reference}</dd>
              </div>
            )}
            {(() => {
              const cleanedNotes = (jobCard.notes || "")
                .split("\n")
                .filter((line) => {
                  const trimmed = line.trim();
                  if (!trimmed) return false;
                  return !INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(trimmed));
                })
                .join("\n")
                .trim();
              const noteLineItems = (jobCard.lineItems || [])
                .filter((li) => {
                  const code = (li.itemCode || "").trim();
                  const hasNoData =
                    !li.itemDescription &&
                    !li.itemNo &&
                    !li.jtNo &&
                    (li.quantity === null || Number.isNaN(li.quantity));
                  if (!hasNoData || !code) return false;
                  const isLongTextNote = code.length > 60;
                  const isRubberSpecNote =
                    /^r\/l\b/i.test(code) || /rubber\s+(lining|sheet|lagging)/i.test(code);
                  return isLongTextNote || isRubberSpecNote;
                })
                .map((li) => (li.itemCode || "").trim());
              const combinedNotes = [cleanedNotes, ...noteLineItems].filter(Boolean).join("\n\n");
              return combinedNotes ? (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {combinedNotes}
                  </dd>
                </div>
              ) : null;
            })()}
          </dl>
          {coatingAnalysis &&
            (coatingAnalysis.status === "analysed" || coatingAnalysis.status === "accepted") &&
            coatingAnalysis.coats.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">Coating Specification</h4>
                    <span className="text-xs text-gray-400 italic">extracted by Nix</span>
                    {coatingAnalysis.status === "accepted" && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Accepted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {coatingAnalysis.status === "analysed" && (
                      <button
                        onClick={async () => {
                          const updated = await stockControlApiClient.acceptCoatingAnalysis(jobId);
                          setCoatingAnalysis(updated);
                        }}
                        className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        Accept Recommendation
                      </button>
                    )}
                    <button
                      onClick={handleRunAnalysis}
                      disabled={isAnalysing}
                      className="text-xs text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                    >
                      {isAnalysing ? "Analysing..." : "Re-analyse"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
                  {coatingAnalysis.applicationType && (
                    <div>
                      <span className="font-medium text-gray-500">Application: </span>
                      <span className="text-gray-900 capitalize">
                        {coatingAnalysis.applicationType}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.surfacePrep && (
                    <div>
                      <span className="font-medium text-gray-500">Surface Prep: </span>
                      <span className="text-gray-900 uppercase">
                        {coatingAnalysis.surfacePrep.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  <EditableM2Field
                    label="Ext m²"
                    value={coatingAnalysis.extM2}
                    onSave={async (val) => {
                      const updated = await stockControlApiClient.updateCoatingSurfaceArea(
                        jobId,
                        val,
                        coatingAnalysis.intM2,
                      );
                      setCoatingAnalysis(updated);
                    }}
                  />
                  <EditableM2Field
                    label="Int m²"
                    value={coatingAnalysis.intM2}
                    onSave={async (val) => {
                      const updated = await stockControlApiClient.updateCoatingSurfaceArea(
                        jobId,
                        coatingAnalysis.extM2,
                        val,
                      );
                      setCoatingAnalysis(updated);
                    }}
                  />
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Area</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Product</th>
                      <th className="text-right py-2 pr-4 font-medium text-gray-500">
                        DFT (&#181;m)
                      </th>
                      <th className="text-right py-2 pr-4 font-medium text-gray-500">
                        Coverage (m&#178;/L)
                      </th>
                      <th className="text-right py-2 font-medium text-gray-500">Litres Req.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coatingAnalysis.coats.map((coat, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-600 capitalize">
                          {coat.area === "external" ? "Ext" : "Int"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 font-medium">
                          {coat.product}
                          {coat.verified === false && (
                            <span
                              className="ml-1.5 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700"
                              title="Volume solids estimated - upload TDS to verify"
                            >
                              unverified
                            </span>
                          )}
                          {coat.verified === true && (
                            <span
                              className="ml-1.5 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700"
                              title="Volume solids verified"
                            >
                              verified
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {coat.minDftUm}-{coat.maxDftUm}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {coat.coverageM2PerLiter}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          {coat.litersRequired === 0 ? "—" : coat.litersRequired}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-gray-400 italic">
                  Coverage includes {profile?.pipingLossFactorPct ?? 45}% piping loss factor
                </p>
                {coatingAnalysis.stockAssessment.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Stock Assessment
                    </h5>
                    <div className="space-y-1">
                      {coatingAnalysis.stockAssessment.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.product}</span>
                          <div className="flex items-center space-x-3">
                            {item.stockItemId ? (
                              <>
                                <span className="text-gray-500">
                                  {item.currentStock} / {item.required} {item.unit}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    item.sufficient
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.sufficient ? "OK" : "Short"}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-600 italic">
                                Not in inventory
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          {coatingAnalysis && coatingAnalysis.status === "pending" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                <span>Nix is analysing the coating specification...</span>
              </div>
            </div>
          )}
          {coatingAnalysis && coatingAnalysis.status === "failed" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-600">
                  Coating analysis failed: {coatingAnalysis.error || "Unknown error"}
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalysing}
                  className="text-sm text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Retry"}
                </button>
              </div>
            </div>
          )}
          {(!coatingAnalysis ||
            (coatingAnalysis.status === "analysed" && coatingAnalysis.coats.length === 0)) && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {coatingAnalysis
                    ? "No coating specification found"
                    : "No coating analysis available"}
                </span>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalysing}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {isAnalysing
                    ? "Analysing..."
                    : coatingAnalysis
                      ? "Re-analyse"
                      : "Run Coating Analysis"}
                </button>
              </div>
            </div>
          )}
          {requisition && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Requisition</span>
                </div>
                <Link
                  href={`/stock-control/portal/requisitions/${requisition.id}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100"
                >
                  {requisition.requisitionNumber}
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          )}
          {jobCard.customFields && Object.keys(jobCard.customFields).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Custom Fields</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {Object.entries(jobCard.customFields).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {jobCard.lineItems && jobCard.lineItems.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
              <span className="text-sm text-gray-500">
                {jobCard.lineItems.filter(isValidLineItem).length} items
              </span>
            </div>
            {attachments.some(
              (a) =>
                a.extractionStatus === "analysed" &&
                ((a.extractedData as { totalExternalM2?: number })
                  ? (a.extractedData as { totalExternalM2?: number }).totalExternalM2 || 0
                  : 0) > 0,
            ) && (
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-500">From drawings:</span>
                <span className="font-semibold text-teal-700">
                  Ext:{" "}
                  {attachments
                    .reduce(
                      (sum, a) =>
                        sum +
                        ((a.extractedData as { totalExternalM2?: number })
                          ? (a.extractedData as { totalExternalM2?: number }).totalExternalM2 || 0
                          : 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  m²
                </span>
                <span className="font-semibold text-blue-700">
                  Int:{" "}
                  {attachments
                    .reduce(
                      (sum, a) =>
                        sum +
                        ((a.extractedData as { totalInternalM2?: number })
                          ? (a.extractedData as { totalInternalM2?: number }).totalInternalM2 || 0
                          : 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  m²
                </span>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item No
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    m²
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JT No
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobCard.lineItems.filter(isValidLineItem).map((li, idx) => (
                  <tr key={li.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-900 break-all">
                      {li.itemCode || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-words">
                      {li.itemDescription || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-all">
                      {li.itemNo || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {li.quantity ?? "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {li.m2 ? Number(li.m2).toFixed(2) : "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {li.jtNo || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-200">
            {jobCard.lineItems.filter(isValidLineItem).map((li, idx) => (
              <div key={li.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {li.itemCode || "-"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    {li.quantity && (
                      <span className="font-semibold text-gray-900">Qty: {li.quantity}</span>
                    )}
                    {li.m2 && <span className="text-gray-600">{Number(li.m2).toFixed(2)} m²</span>}
                  </div>
                </div>
                {li.itemDescription && (
                  <p className="text-sm text-gray-700 mb-1">{li.itemDescription}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {li.itemNo && <span>Item: {li.itemNo}</span>}
                  {li.jtNo && <span>JT: {li.jtNo}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RubberAllocationGuard jobCard={jobCard} />

      {versions.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="w-full px-4 py-4 sm:px-6 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Version History</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {versions.length} archived
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${showVersionHistory ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showVersionHistory && (
            <div className="px-4 py-4 sm:px-6 space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">
                        v{version.versionNumber}
                      </span>
                      <span className="text-sm text-gray-500">
                        {version.originalFilename || "No file"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateZA(version.createdAt)}
                      {version.createdBy && ` by ${version.createdBy}`}
                    </p>
                    {version.amendmentNotes && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        &quot;{version.amendmentNotes}&quot;
                      </p>
                    )}
                  </div>
                  {version.filePath && (
                    <a
                      href={version.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Drawing Attachments</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">{attachments.length} attachments</span>
            {attachments.some(
              (a) => a.extractionStatus === "pending" || a.extractionStatus === "failed",
            ) && (
              <button
                onClick={handleExtractAll}
                disabled={isExtractingAll}
                className="px-3 py-1 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
              >
                {isExtractingAll ? "Nix is analysing all drawings..." : "Extract All Drawings"}
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div
            onDrop={handleAttachmentDrop}
            onDragOver={handleAttachmentDragOver}
            onDragEnter={handleAttachmentDragOver}
            onDragLeave={handleAttachmentDragLeave}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDraggingAttachment
                ? "border-teal-500 bg-teal-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {attachmentFiles.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">
                  {attachmentFiles.length} file{attachmentFiles.length > 1 ? "s" : ""} ready to
                  upload
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {attachmentFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-center space-x-2"
                    >
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachmentFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setAttachmentFiles([])}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAttachmentUpload}
                    disabled={isUploadingAttachment}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    {isUploadingAttachment ? "Uploading..." : "Upload All"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Drop PDF or DXF drawings here or{" "}
                  <label className="text-teal-600 hover:text-teal-800 cursor-pointer">
                    browse
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.dxf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setAttachmentFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Upload all drawings for this job, then click Extract for Nix to analyse them
                  together
                </p>
              </>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="mt-4 space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {attachment.originalFilename}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${extractionStatusBadge(attachment.extractionStatus)}`}
                      >
                        {attachment.extractionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateZA(attachment.createdAt)}
                      {attachment.uploadedBy && ` by ${attachment.uploadedBy}`}
                    </p>
                    {attachment.extractionStatus === "analysed" && attachment.extractedData && (
                      <div className="mt-2 text-xs text-gray-600">
                        {(attachment.extractedData as { drawingType?: string }).drawingType ===
                        "tank_chute" ? (
                          <>
                            {(attachment.extractedData as { tankData?: { assemblyType?: string } })
                              .tankData?.assemblyType && (
                              <span className="mr-3 font-medium text-amber-700">
                                {(
                                  attachment.extractedData as {
                                    tankData: { assemblyType: string };
                                  }
                                ).tankData.assemblyType
                                  .charAt(0)
                                  .toUpperCase() +
                                  (
                                    attachment.extractedData as {
                                      tankData: { assemblyType: string };
                                    }
                                  ).tankData.assemblyType.slice(1)}
                              </span>
                            )}
                            {(attachment.extractedData as { totalLiningM2?: number })
                              .totalLiningM2 !== undefined &&
                              (attachment.extractedData as { totalLiningM2: number })
                                .totalLiningM2 > 0 && (
                                <span className="mr-3">
                                  Lining:{" "}
                                  {
                                    (attachment.extractedData as { totalLiningM2: number })
                                      .totalLiningM2
                                  }{" "}
                                  m²
                                </span>
                              )}
                            {(attachment.extractedData as { totalCoatingM2?: number })
                              .totalCoatingM2 !== undefined &&
                              (attachment.extractedData as { totalCoatingM2: number })
                                .totalCoatingM2 > 0 && (
                                <span>
                                  Coating:{" "}
                                  {
                                    (attachment.extractedData as { totalCoatingM2: number })
                                      .totalCoatingM2
                                  }{" "}
                                  m²
                                </span>
                              )}
                          </>
                        ) : (
                          <>
                            {(attachment.extractedData as { totalExternalM2?: number })
                              .totalExternalM2 !== undefined && (
                              <span className="mr-3">
                                Ext:{" "}
                                {
                                  (attachment.extractedData as { totalExternalM2: number })
                                    .totalExternalM2
                                }{" "}
                                m²
                              </span>
                            )}
                            {(attachment.extractedData as { totalInternalM2?: number })
                              .totalInternalM2 !== undefined && (
                              <span>
                                Int:{" "}
                                {
                                  (attachment.extractedData as { totalInternalM2: number })
                                    .totalInternalM2
                                }{" "}
                                m²
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {attachment.extractionStatus === "failed" && attachment.extractionError && (
                      <p className="text-xs text-red-600 mt-1">{attachment.extractionError}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={attachment.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Stock Allocations</h3>
          <span className="text-sm text-gray-500">{allocations.length} allocations</span>
        </div>
        {allocations.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No allocations</h3>
            <p className="mt-1 text-sm text-gray-500">Allocate stock items to this job card.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Qty Used
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Staff
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Allocated By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Notes
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr
                  key={allocation.id}
                  className={
                    allocation.pendingApproval
                      ? "bg-amber-50 hover:bg-amber-100"
                      : allocation.rejectedAt
                        ? "bg-red-50 hover:bg-red-100"
                        : "hover:bg-gray-50"
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {allocation.stockItem?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {allocation.stockItem?.sku || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {allocation.quantityUsed}
                    {allocation.allowedLitres && (
                      <span className="text-xs text-gray-400 ml-1">
                        / {allocation.allowedLitres}L allowed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {allocation.staffMember?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {allocation.allocatedBy || "System"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(allocation.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {allocation.notes || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {allocation.pendingApproval ? (
                      <div className="flex flex-col space-y-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                        {(user?.role === "manager" || user?.role === "admin") && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveAllocation(allocation.id)}
                              disabled={approvingAllocationId === allocation.id}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {approvingAllocationId === allocation.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason:");
                                if (reason) {
                                  handleRejectAllocation(allocation.id, reason);
                                }
                              }}
                              disabled={rejectingAllocationId === allocation.id}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {rejectingAllocationId === allocation.id ? "..." : "Reject"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : allocation.rejectedAt ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Rejected
                        </span>
                        {allocation.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">{allocation.rejectionReason}</p>
                        )}
                      </div>
                    ) : allocation.approvedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Allocated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAllocateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAllocateModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allocate Stock to Job</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Item</label>
                  <select
                    value={allocateForm.stockItemId}
                    onChange={(e) =>
                      setAllocateForm({
                        ...allocateForm,
                        stockItemId: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value={0}>Select an item...</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} (SOH: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={allocateForm.quantityUsed}
                    onChange={(e) =>
                      setAllocateForm({
                        ...allocateForm,
                        quantityUsed: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={allocateForm.notes}
                    onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                {activeStaff.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Allocated To (Staff)
                    </label>
                    <select
                      value={allocateForm.staffMemberId}
                      onChange={(e) =>
                        setAllocateForm({
                          ...allocateForm,
                          staffMemberId: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    >
                      <option value={0}>None</option>
                      {activeStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {member.employeeNumber ? ` (${member.employeeNumber})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <PhotoCapture
                    onCapture={(file) => setCapturedFile(file)}
                    currentPhotoUrl={capturedFile ? URL.createObjectURL(capturedFile) : undefined}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocate}
                  disabled={isAllocating || !allocateForm.stockItemId}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAllocating ? "Allocating..." : "Allocate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTdsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowTdsModal(false);
                setTdsFile(null);
              }}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unverified Coating Products
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                The following coating products could not be verified from the known products
                database. Upload the Technical Data Sheet (TDS) for each product to verify volume
                solids before activating this job card.
              </p>
              <div className="space-y-2 mb-4">
                {unverifiedProducts.map((product, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900">{product.product}</span>
                      {product.genericType && (
                        <span className="ml-2 text-xs text-gray-500 capitalize">
                          ({product.genericType.replace(/_/g, " ")})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-700">
                      Est. {product.estimatedVolumeSolids}% vol. solids
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                {tdsFile ? (
                  <div className="space-y-1">
                    <svg
                      className="mx-auto h-8 w-8 text-teal-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-gray-700">{tdsFile.name}</p>
                    <button
                      type="button"
                      onClick={() => setTdsFile(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <svg
                      className="mx-auto h-10 w-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">Upload Technical Data Sheet (PDF)</p>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setTdsFile(file);
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTdsModal(false);
                    setTdsFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTdsUpload}
                  disabled={!tdsFile || isUploadingTds}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isUploadingTds ? "Processing..." : "Upload & Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        existingSignature={null}
        jobNumber={jobCard.jobNumber}
        stepName={currentApprovalStep.replace(/_/g, " ")}
      />

      {showAmendmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAmendmentModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Amendment</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a new version of this job card. The current version will be archived.
              </p>
              <div className="space-y-4">
                <div
                  onDrop={handleAmendmentDrop}
                  onDragOver={handleAmendmentDragOver}
                  onDragEnter={handleAmendmentDragOver}
                  onDragLeave={handleAmendmentDragLeave}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDraggingAmendment
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {amendmentFile ? (
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-8 w-8 text-teal-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-900">{amendmentFile.name}</p>
                      <button
                        onClick={() => setAmendmentFile(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Drop a file here or{" "}
                        <label className="text-teal-600 hover:text-teal-800 cursor-pointer">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setAmendmentFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amendment Notes (optional)
                  </label>
                  <textarea
                    value={amendmentNotes}
                    onChange={(e) => setAmendmentNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe what changed in this version..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAmendmentModal(false);
                    setAmendmentFile(null);
                    setAmendmentNotes("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAmendmentUpload}
                  disabled={isUploadingAmendment || !amendmentFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isUploadingAmendment ? "Uploading..." : "Upload Amendment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
