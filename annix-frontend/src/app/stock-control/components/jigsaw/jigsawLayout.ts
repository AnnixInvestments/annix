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
