import { isNumber } from "es-toolkit/compat";
import type { RubberPlanManualRoll } from "@/app/lib/api/stockControlApi";
import {
  developFrustum,
  type ParsedPipeItem,
} from "@/app/stock-control/lib/rubberCuttingCalculator";
import {
  effectiveLength,
  effectiveWidth,
  type JigsawPanel,
  type JigsawRoll,
  type PanelShape,
  type PlacedPanel,
} from "./jigsawTypes";

const CUT_COLORS = [
  "bg-blue-500",
  "bg-[var(--sc-primary,#323288)]",
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
        shape: sp.shape,
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
        shape: item.shape,
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

// Upper bound on per-item panel instances. Guards the `Array.from({ length })`
// expansions against a hostile/garbage quantity (e.g. an extracted billion)
// that would otherwise OOM/crash the browser.
const MAX_PANEL_INSTANCES = 1000;

function clampInstanceCount(value: number | null | undefined): number {
  if (!isNumber(value) || !Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.min(Math.floor(value), MAX_PANEL_INSTANCES);
}

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

      const qty = clampInstanceCount(rawQty);
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

// The geometric classification of one tank component, mirroring the backend
// TankComponentShape. Develops into a flat cutting panel (with a PanelShape
// outline) for the nester.
export type TankComponentShapeInput =
  | { type: "rectangle"; widthMm?: number | null; heightMm?: number | null }
  | { type: "cylinder"; innerDiameterMm?: number | null; heightMm?: number | null }
  | {
      type: "cone";
      largeDiameterMm?: number | null;
      smallDiameterMm?: number | null;
      slantHeightMm?: number | null;
      sweepAngleDegrees?: number | null;
    }
  | {
      type: "dished_head";
      outerDiameterMm?: number | null;
      crownRadiusMm?: number | null;
      knuckleRadiusMm?: number | null;
    }
  | { type: "annular_ring"; outerDiameterMm?: number | null; innerDiameterMm?: number | null }
  | { type: "branch_wrap"; boreDiameterMm?: number | null; lengthMm?: number | null };

export interface TankComponentPanel {
  mark?: string | null;
  description?: string | null;
  shape: TankComponentShapeInput;
  liningThicknessMm?: number | null;
  quantity?: number | null;
}

// A rubber-lined tank/chute and its shape-classified geometric components, the
// richer alternative to a flat plateBom. Each component develops to its true
// flat pattern (cone → annular sector, dished head → circle, ring → annulus).
export interface TankComponentSource {
  itemId: string;
  itemNo?: string | null;
  tankName: string;
  components: TankComponentPanel[];
}

// Develop one geometric tank component into its flat cutting footprint: bounding
// lengthMm/widthMm for nesting plus the true PanelShape outline (omitted for
// rectangular developments). Returns null when dimensions are unusable.
function developTankComponent(
  shape: TankComponentShapeInput,
): { lengthMm: number; widthMm: number; panelShape?: PanelShape } | null {
  const positive = (value: number | null | undefined): number =>
    isNumber(value) && value > 0 ? value : 0;

  if (shape.type === "rectangle") {
    const widthMm = positive(shape.widthMm);
    const heightMm = positive(shape.heightMm);
    return widthMm > 0 && heightMm > 0 ? { lengthMm: heightMm, widthMm } : null;
  }
  if (shape.type === "cylinder") {
    const innerDiameterMm = positive(shape.innerDiameterMm);
    const heightMm = positive(shape.heightMm);
    return innerDiameterMm > 0 && heightMm > 0
      ? { lengthMm: Math.PI * innerDiameterMm, widthMm: heightMm }
      : null;
  }
  if (shape.type === "cone") {
    const largeDiameterMm = positive(shape.largeDiameterMm);
    const slantHeightMm = positive(shape.slantHeightMm);
    if (largeDiameterMm <= 0 || slantHeightMm <= 0) return null;
    const smallDiameterMm = Math.min(positive(shape.smallDiameterMm), largeDiameterMm);
    if (largeDiameterMm - smallDiameterMm < 1) {
      return { lengthMm: Math.PI * largeDiameterMm, widthMm: slantHeightMm };
    }
    const deltaRadiusMm = (largeDiameterMm - smallDiameterMm) / 2;
    const axialLengthMm = Math.sqrt(Math.max(0, slantHeightMm ** 2 - deltaRadiusMm ** 2));
    const dev = developFrustum(largeDiameterMm, smallDiameterMm, axialLengthMm);
    return { lengthMm: dev.bboxLengthMm, widthMm: dev.bboxWidthMm, panelShape: dev.shape };
  }
  if (shape.type === "dished_head") {
    const outerDiameterMm = positive(shape.outerDiameterMm);
    return outerDiameterMm > 0
      ? {
          lengthMm: outerDiameterMm,
          widthMm: outerDiameterMm,
          panelShape: { type: "circle", radiusMm: outerDiameterMm / 2 },
        }
      : null;
  }
  if (shape.type === "annular_ring") {
    const outerDiameterMm = positive(shape.outerDiameterMm);
    const innerDiameterMm = Math.min(positive(shape.innerDiameterMm), outerDiameterMm);
    return outerDiameterMm > 0
      ? {
          lengthMm: outerDiameterMm,
          widthMm: outerDiameterMm,
          panelShape: {
            type: "annulus",
            innerRadiusMm: innerDiameterMm / 2,
            outerRadiusMm: outerDiameterMm / 2,
          },
        }
      : null;
  }
  if (shape.type === "branch_wrap") {
    const boreDiameterMm = positive(shape.boreDiameterMm);
    const lengthMm = positive(shape.lengthMm);
    return boreDiameterMm > 0 && lengthMm > 0
      ? { lengthMm: Math.PI * boreDiameterMm, widthMm: lengthMm }
      : null;
  }
  return null;
}

// Turn the shape-classified geometric components of one or more fabricated tanks
// into jigsaw panels for the nester. Each LINED component (positive lining
// thickness and usable dimensions) develops to its flat pattern plus a seam
// overlap, is quantity-expanded per instance, and carries its own lining
// thickness so mixed-thickness assemblies nest onto the right rolls. Unlined or
// undimensioned components are skipped.
export function panelsFromTankComponents(
  sources: TankComponentSource[],
  overlapMm: number = DEFAULT_TANK_LINING_OVERLAP_MM,
): JigsawPanel[] {
  return sources.flatMap((source) => {
    const colorIndex = colorIndexForBaseId(source.itemId);
    const rawItemNo = source.itemNo;
    const itemNo = rawItemNo ?? null;
    return source.components.flatMap((component, componentIdx) => {
      const rawLining = component.liningThicknessMm;
      const liningThicknessMm = isNumber(rawLining) && rawLining > 0 ? rawLining : 0;
      if (liningThicknessMm === 0) return [];

      const developed = developTankComponent(component.shape);
      if (!developed) return [];

      const rubberLengthMm = developed.lengthMm + overlapMm;
      const rubberWidthMm = developed.widthMm + overlapMm;
      const qty = clampInstanceCount(component.quantity);
      const rawMark = component.mark;
      const rawDescription = component.description;
      const markKey = rawMark || componentIdx;
      const markLabel = rawMark ? `Mark ${rawMark}` : `Part ${componentIdx + 1}`;
      const descBase = rawDescription || markLabel;
      const description = `${source.tankName} — ${descBase} (${liningThicknessMm}mm R/L)`;

      return Array.from({ length: qty }, (_unused, instance) => ({
        panelId: `${source.itemId}-c-${markKey}-${instance}`,
        itemId: source.itemId,
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
        shape: developed.panelShape,
      }));
    });
  });
}

// Lap allowance (mm) added to each half at the cut seam when a panel is split,
// so the two lining pieces overlap where they meet on the substrate.
export const SPLIT_SEAM_OVERLAP_MM = 50;

// Smallest long-side (mm) worth splitting — below this each half would be too
// small to be useful, so the split action is hidden.
export const MIN_SPLIT_SIDE_MM = 200;

export function canSplitPanel(panel: JigsawPanel): boolean {
  return Math.max(panel.widthMm, panel.lengthMm) >= MIN_SPLIT_SIDE_MM;
}

// Cut a panel in half along its longer side so each piece fits a narrower roll.
// Each half keeps the short side, takes half the long side plus a seam overlap,
// and becomes a plain rectangle (a split discards the developed outline — the
// cutter trims the curve from the two flat halves). Returns null when the panel
// is too small to split. The two halves replace the original in the tray.
export function splitPanelInHalf(panel: JigsawPanel): [JigsawPanel, JigsawPanel] | null {
  if (!canSplitPanel(panel)) return null;
  const splitAlongLength = panel.lengthMm >= panel.widthMm;
  const longSide = splitAlongLength ? panel.lengthMm : panel.widthMm;
  const halfSide = Math.round(longSide / 2) + SPLIT_SEAM_OVERLAP_MM;

  const makeHalf = (suffix: string, label: string): JigsawPanel => {
    const widthMm = splitAlongLength ? panel.widthMm : halfSide;
    const lengthMm = splitAlongLength ? halfSide : panel.lengthMm;
    const rawItemNo = panel.itemNo;
    return {
      ...panel,
      panelId: `${panel.panelId}-${suffix}`,
      itemNo: rawItemNo ? `${rawItemNo} ${label}` : label,
      description: `${panel.description} [${label}]`,
      widthMm,
      lengthMm,
      originalWidthMm: widthMm,
      originalLengthMm: lengthMm,
      rotated: false,
      shape: undefined,
    };
  };

  return [makeHalf("s1", "cut A"), makeHalf("s2", "cut B")];
}

// When a saved manual layout is restored, decide which base panels remain in the
// tray: drop any panel that is itself placed, and any panel that was split (a
// placed sibling has panelId "<id>-s..."), since its halves are already placed.
export function unplacedAfterRestore(
  allPanels: JigsawPanel[],
  placements: { panelId: string }[],
): JigsawPanel[] {
  const placedIds = new Set(placements.map((p) => p.panelId));
  return allPanels.filter((panel) => {
    const id = panel.panelId;
    if (placedIds.has(id)) {
      return false;
    }
    // A split sibling is "<id>-s<digit>" (splitPanelInHalf). Require the digit so a
    // sub-panel label that merely starts with "s" (e.g. "<id>-side") never matches.
    const prefix = `${id}-s`;
    const wasSplit = placements.some((p) => {
      const pid = p.panelId;
      if (!pid.startsWith(prefix)) {
        return false;
      }
      const nextChar = pid.charAt(prefix.length);
      return nextChar >= "0" && nextChar <= "9";
    });
    return !wasSplit;
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
      {
        description: string;
        widthMm: number;
        lengthMm: number;
        quantity: number;
        shape?: PanelShape;
      }
    >();

    rollPanels.forEach((panel) => {
      const w = effectiveWidth(panel);
      const l = effectiveLength(panel);
      const shapeKey = panel.shape ? JSON.stringify(panel.shape) : "rect";
      const key = `${panel.description}|${w}|${l}|${shapeKey}`;
      const existing = cutMap.get(key);
      if (existing) {
        cutMap.set(key, { ...existing, quantity: existing.quantity + 1 });
      } else {
        cutMap.set(key, {
          description: panel.description,
          widthMm: w,
          lengthMm: l,
          quantity: 1,
          shape: panel.shape,
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
