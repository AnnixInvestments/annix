import { isNumber } from "es-toolkit/compat";
import type { RubberPlanManualRoll } from "@/app/lib/api/stockControlApi";
import type { ParsedPipeItem } from "@/app/stock-control/lib/rubberCuttingCalculator";
import {
  effectiveLength,
  effectiveWidth,
  type JigsawPanel,
  type JigsawRoll,
  type PlacedPanel,
} from "./jigsawTypes";

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

export function colorIndexForBaseId(baseId: string): number {
  const hash = baseId.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
  return Math.abs(hash) % CUT_COLORS.length;
}

export function hasOverlap(candidate: PlacedPanel, existing: PlacedPanel[]): boolean {
  const cw = effectiveWidth(candidate);
  const cl = effectiveLength(candidate);
  const cx1 = candidate.xMm;
  const cy1 = candidate.yMm;
  const cx2 = cx1 + cl;
  const cy2 = cy1 + cw;

  return existing
    .filter((p) => p.rollIndex === candidate.rollIndex && p.panelId !== candidate.panelId)
    .some((p) => {
      const pw = effectiveWidth(p);
      const pl = effectiveLength(p);
      const px1 = p.xMm;
      const py1 = p.yMm;
      const px2 = px1 + pl;
      const py2 = py1 + pw;
      return cx1 < px2 && cx2 > px1 && cy1 < py2 && cy2 > py1;
    });
}

export function isWithinBounds(panel: PlacedPanel, roll: JigsawRoll): boolean {
  const pw = effectiveWidth(panel);
  const pl = effectiveLength(panel);
  return (
    panel.xMm >= 0 &&
    panel.yMm >= 0 &&
    panel.xMm + pl <= roll.lengthMm &&
    panel.yMm + pw <= roll.widthMm
  );
}

export function panelsFromParsedItems(expandedItems: ParsedPipeItem[]): JigsawPanel[] {
  return expandedItems.flatMap((item) => {
    const baseId = item.id.split("-")[0];
    const colorIndex = colorIndexForBaseId(baseId);
    const dimensionContext = {
      nbMm: item.nbMm,
      odMm: item.odMm,
      schedule: item.schedule,
      lengthMm: item.lengthMm,
      flangeConfig: item.flangeConfig,
      itemType: item.itemType,
    };

    if (item.subPanels && item.subPanels.length > 1) {
      return item.subPanels.map((sp) => ({
        panelId: `${item.id}-${sp.label}`,
        itemId: item.id,
        itemNo: item.itemNo ? `${item.itemNo} ${sp.label}` : sp.label,
        description: `${item.description} (${sp.label})`,
        widthMm: sp.rubberWidthMm,
        lengthMm: sp.rubberLengthMm,
        originalWidthMm: sp.rubberWidthMm,
        originalLengthMm: sp.rubberLengthMm,
        rotated: false,
        colorIndex,
        dimensionContext,
      }));
    }

    return [
      {
        panelId: item.id,
        itemId: item.id,
        itemNo: item.itemNo,
        description: item.description,
        widthMm: item.rubberWidthMm,
        lengthMm: item.rubberLengthMm,
        originalWidthMm: item.rubberWidthMm,
        originalLengthMm: item.rubberLengthMm,
        rotated: false,
        colorIndex,
        dimensionContext,
      },
    ];
  });
}

// One plate part of a fabricated tank/chute, as extracted by Nix into the
// tank plateBom (developed flat size + per-plate rubber-lining thickness).
export interface TankPlatePanel {
  mark?: string | null;
  description?: string | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  quantity?: number | null;
  liningThicknessMm?: number | null;
}

// A rubber-lined tank/chute and its plate parts, sourced from a Forge RFQ
// tank item (entry.specs.plateBom) so the cutting diagram is pre-populated
// instead of hand-entered.
export interface TankPanelSource {
  itemId: string;
  itemNo?: string | null;
  tankName: string;
  plates: TankPlatePanel[];
}

// Default rubber overlap allowance (mm) added to each developed plate edge so
// adjacent lining sheets lap at the seam. Tunable per shop standard.
export const DEFAULT_TANK_LINING_OVERLAP_MM = 50;

// Turn the developed flat panels of one or more fabricated tanks into jigsaw
// panels for the existing rubber-cutting nester. Each LINED plate (positive
// developed L×W and a lining thickness) becomes one panel PER instance
// (quantity-expanded, like the pipe sub-panel path), sized to the plate's
// developed area plus a seam-overlap allowance, and tagged with its own
// lining thickness so mixed-thickness assemblies nest onto the right rolls.
// Unlined or undimensioned plates are skipped.
export function panelsFromTankPlateBom(
  tanks: TankPanelSource[],
  overlapMm: number = DEFAULT_TANK_LINING_OVERLAP_MM,
): JigsawPanel[] {
  return tanks.flatMap((tank) => {
    const colorIndex = colorIndexForBaseId(tank.itemId);
    const rawTankItemNo = tank.itemNo;
    const itemNo = rawTankItemNo ?? null;
    return tank.plates.flatMap((plate, plateIdx) => {
      const rawLen = plate.lengthMm;
      const rawWid = plate.widthMm;
      const rawLining = plate.liningThicknessMm;
      const rawQty = plate.quantity;
      const rawMark = plate.mark;
      const len = isNumber(rawLen) && rawLen > 0 ? rawLen : 0;
      const wid = isNumber(rawWid) && rawWid > 0 ? rawWid : 0;
      const liningThicknessMm = isNumber(rawLining) && rawLining > 0 ? rawLining : 0;
      if (len === 0 || wid === 0 || liningThicknessMm === 0) return [];

      const qty = isNumber(rawQty) && rawQty > 0 ? Math.floor(rawQty) : 1;
      const rubberLengthMm = len + overlapMm;
      const rubberWidthMm = wid + overlapMm;
      const markKey = rawMark || plateIdx;
      const markLabel = rawMark ? `Mark ${rawMark}` : `Part ${plateIdx + 1}`;
      const description = `${tank.tankName} — ${markLabel} (${liningThicknessMm}mm R/L)`;

      return Array.from({ length: qty }, (_unused, instance) => ({
        panelId: `${tank.itemId}-${markKey}-${instance}`,
        itemId: tank.itemId,
        itemNo,
        description,
        widthMm: rubberWidthMm,
        lengthMm: rubberLengthMm,
        originalWidthMm: rubberWidthMm,
        originalLengthMm: rubberLengthMm,
        rotated: false,
        colorIndex,
        dimensionContext: {
          nbMm: null,
          odMm: null,
          schedule: null,
          lengthMm: rubberLengthMm,
          flangeConfig: null,
          itemType: "tank_chute",
          liningThicknessMm,
        },
      }));
    });
  });
}

export function serializeToManualRolls(
  rolls: JigsawRoll[],
  placedPanels: PlacedPanel[],
): RubberPlanManualRoll[] {
  return rolls.map((roll, rollIndex) => {
    const rollPanels = placedPanels.filter((p) => p.rollIndex === rollIndex);

    const cutMap = new Map<
      string,
      { description: string; widthMm: number; lengthMm: number; quantity: number }
    >();

    rollPanels.forEach((panel) => {
      const w = effectiveWidth(panel);
      const l = effectiveLength(panel);
      const key = `${panel.description}|${w}|${l}`;
      const existing = cutMap.get(key);
      if (existing) {
        cutMap.set(key, { ...existing, quantity: existing.quantity + 1 });
      } else {
        cutMap.set(key, {
          description: panel.description,
          widthMm: w,
          lengthMm: l,
          quantity: 1,
        });
      }
    });

    return {
      widthMm: roll.widthMm,
      lengthM: roll.lengthMm / 1000,
      thicknessMm: roll.thicknessMm,
      cuts: Array.from(cutMap.values()),
    };
  });
}

export { CUT_COLORS };
