const NB_TO_OD_MM: Record<number, number> = {
  15: 21.3,
  20: 26.7,
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73.0,
  80: 88.9,
  100: 114.3,
  125: 141.3,
  150: 168.3,
  200: 219.1,
  250: 273.0,
  300: 323.9,
  350: 355.6,
  400: 406.4,
  450: 457.2,
  500: 508.0,
  550: 558.8,
  600: 610.0,
  750: 762.0,
  900: 914.4,
  1000: 1016.0,
  1050: 1066.8,
  1200: 1219.2,
};

const SCHEDULE_WALL_THICKNESS: Record<string, Record<number, number>> = {
  "Sch 10": {
    15: 2.11,
    20: 2.11,
    25: 2.77,
    32: 2.77,
    40: 2.77,
    50: 2.77,
    65: 3.05,
    80: 3.05,
    100: 3.05,
    125: 3.4,
    150: 3.4,
    200: 4.78,
    250: 5.56,
    300: 5.56,
    350: 5.56,
    400: 6.35,
    450: 6.35,
    500: 6.35,
    550: 6.35,
    600: 6.35,
    750: 7.92,
    900: 9.53,
    1000: 9.53,
    1050: 9.53,
    1200: 9.53,
  },
  "Sch 20": {
    200: 6.35,
    250: 6.35,
    300: 6.35,
    350: 7.92,
    400: 7.92,
    450: 7.92,
    500: 9.53,
    550: 9.53,
    600: 9.53,
    750: 9.53,
    900: 9.53,
    1000: 9.53,
    1050: 12.7,
    1200: 12.7,
  },
  "Sch 30": {
    200: 7.04,
    250: 7.8,
    300: 8.38,
    350: 9.53,
    400: 9.53,
    450: 11.13,
    500: 12.7,
    550: 12.7,
    600: 14.27,
    750: 15.88,
    900: 15.88,
    1000: 15.88,
    1050: 15.88,
    1200: 15.88,
  },
  "Sch 40": {
    15: 2.77,
    20: 2.87,
    25: 3.38,
    32: 3.56,
    40: 3.68,
    50: 3.91,
    65: 5.16,
    80: 5.49,
    100: 6.02,
    125: 6.55,
    150: 7.11,
    200: 8.18,
    250: 9.27,
    300: 9.53,
    350: 9.53,
    400: 9.53,
    450: 9.53,
    500: 9.53,
    550: 9.53,
    600: 9.53,
    750: 9.53,
    900: 9.53,
    1000: 9.53,
    1050: 9.53,
    1200: 9.53,
  },
  "Sch Std": {
    15: 2.77,
    20: 2.87,
    25: 3.38,
    32: 3.56,
    40: 3.68,
    50: 3.91,
    65: 5.16,
    80: 5.49,
    100: 6.02,
    125: 6.55,
    150: 7.11,
    200: 8.18,
    250: 9.27,
    300: 9.53,
    350: 9.53,
    400: 9.53,
    450: 9.53,
    500: 9.53,
    550: 9.53,
    600: 9.53,
    750: 9.53,
    900: 9.53,
    1000: 9.53,
    1050: 9.53,
    1200: 9.53,
  },
  "Sch 60": {
    200: 10.31,
    250: 12.7,
    300: 14.27,
    350: 15.88,
    400: 16.66,
    450: 17.48,
    500: 20.62,
    550: 20.62,
    600: 22.23,
    750: 25.4,
    900: 28.58,
    1000: 31.75,
    1050: 31.75,
    1200: 31.75,
  },
  "Sch 80": {
    15: 3.73,
    20: 3.91,
    25: 4.55,
    32: 4.85,
    40: 5.08,
    50: 5.54,
    65: 7.01,
    80: 7.62,
    100: 8.56,
    125: 9.53,
    150: 10.97,
    200: 12.7,
    250: 15.09,
    300: 17.48,
    350: 19.05,
    400: 21.44,
    450: 23.83,
    500: 26.19,
    550: 26.19,
    600: 28.58,
    750: 31.75,
    900: 34.93,
    1000: 38.1,
    1050: 38.1,
    1200: 38.1,
  },
};

import { FLANGE_DATA } from "@/app/lib/3d/flangeData";

const ROLL_WIDTH_MIN_MM = 800;
const ROLL_WIDTH_MAX_MM = 1450;
const ROLL_WIDTH_INCREMENT_MM = 50;
const ROLL_LENGTH_MAX_M = 12.5;
const OPEN_END_ALLOWANCE_MM = 100;
const BEVEL_ALLOWANCE_MM = 20;
const FLANGE_ALLOWANCE_FALLBACK_MM = 100;

function flangeAllowanceMm(nbMm: number): number {
  const flangeSpec = FLANGE_DATA[nbMm];
  const pipeOd = NB_TO_OD_MM[nbMm];
  if (flangeSpec && pipeOd) {
    return Math.ceil((flangeSpec.flangeOD - pipeOd) / 2);
  }
  return FLANGE_ALLOWANCE_FALLBACK_MM;
}

export interface ParsedPipeItem {
  id: string;
  itemNo: string | null;
  description: string;
  nbMm: number | null;
  odMm: number | null;
  idMm: number | null;
  schedule: string | null;
  lengthMm: number;
  flangeConfig: string | null;
  openEnds: number;
  itemType: string | null;
  rubberWidthMm: number;
  rubberLengthMm: number;
  stripsPerPiece: number;
  quantity: number;
  isValidPipe: boolean;
  m2: number | null;
  wallThicknessMm: number | null;
  bendAngle: number | null;
  bendType: string | null;
  centerToFaceMm: number | null;
  fittingLengthAMm: number | null;
  fittingLengthBMm: number | null;
  flangeCount: number;
  pressureClass: string | null;
  flangeStandard: string | null;
  calculatedExtM2: number | null;
  calculatedIntM2: number | null;
  branchNbMm: number | null;
  fittingRunLengthMm: number | null;
  fittingBranchLengthMm: number | null;
  subPanels: SubPanelSpec[] | null;
}

export interface SubPanelSpec {
  label: string;
  nbMm: number;
  rubberWidthMm: number;
  rubberLengthMm: number;
  flangeCount: number;
}

export interface RollSpecification {
  widthMm: number;
  lengthM: number;
  areaSqM: number;
  lanes: number;
  laneWidthMm: number;
}

export interface CutPiece {
  itemId: string;
  itemNo: string | null;
  description: string;
  widthMm: number;
  lengthMm: number;
  positionMm: number;
  lane: number;
  laneOffsetMm: number;
  band: number;
  stripsPerPiece: number;
  subPanels: SubPanelSpec[] | null;
}

export interface BandSpec {
  bandIndex: number;
  lanes: number;
  laneWidthMm: number;
  startMm: number;
  heightMm: number;
  widthUsedMm: number;
}

export interface Offcut {
  widthMm: number;
  lengthMm: number;
  areaSqM: number;
}

export interface RollAllocation {
  rollIndex: number;
  rollSpec: RollSpecification;
  cuts: CutPiece[];
  usedLengthMm: number[];
  wastePercentage: number;
  hasLengthwiseCut: boolean;
  bands: BandSpec[];
  offcuts: Offcut[];
  plyThicknessMm?: number;
}

export interface RubberSpec {
  thicknessMm: number;
  shore: number | null;
  color: string | null;
  pattern: string | null;
  compound: string | null;
}

export interface PlyLayer {
  thicknessMm: number;
  rolls: RollAllocation[];
  totalRollsNeeded: number;
  plyCount: number;
}

export interface StockRollInfo {
  stockItemId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  color: string | null;
  compoundCode: string | null;
  quantityAvailable: number;
  rollNumber?: string | null;
}

export interface StockQuery {
  availableThicknesses: number[];
  rolls: StockRollInfo[];
}

export interface CuttingPlan {
  rolls: RollAllocation[];
  totalRollsNeeded: number;
  totalWasteSqM: number;
  totalUsedSqM: number;
  wastePercentage: number;
  hasPipeItems: boolean;
  genericM2Items: { description: string; m2: number }[];
  genericM2Total: number;
  rubberSpec: RubberSpec | null;
  plies: PlyLayer[];
  totalThicknessMm: number;
  isMultiPly: boolean;
  offcuts: Offcut[];
}

export interface OffcutMatch {
  cutItemId: string;
  cutItemNo: string | null;
  cutDescription: string;
  panelLabel: string | null;
  requiredWidthMm: number;
  requiredLengthMm: number;
  stockItemId: number;
  stockItemName: string;
  stockWidthMm: number;
  stockLengthMm: number;
  stockThicknessMm: number;
  stockColor: string | null;
  wasteIfUsedSqM: number;
}

export function matchOffcutsToPanel(
  cuts: CutPiece[],
  stockRolls: StockRollInfo[],
  requiredThicknessMm: number,
): OffcutMatch[] {
  const availableStock = stockRolls
    .filter(
      (s) =>
        s.quantityAvailable > 0 &&
        s.thicknessMm === requiredThicknessMm &&
        s.widthMm > 0 &&
        s.lengthM > 0,
    )
    .sort((a, b) => a.stockItemId - b.stockItemId);

  if (availableStock.length === 0) return [];

  const usedStockCounts = new Map<number, number>();

  return cuts.flatMap((cut) => {
    const panels =
      cut.subPanels && cut.subPanels.length > 1
        ? cut.subPanels.map((p) => ({
            label: p.label,
            widthMm: p.rubberWidthMm,
            lengthMm: p.rubberLengthMm,
          }))
        : [{ label: null as string | null, widthMm: cut.widthMm, lengthMm: cut.lengthMm }];

    return panels.flatMap((panel) =>
      availableStock
        .filter((stock) => {
          const stockLengthMm = stock.lengthM * 1000;
          const usedCount = usedStockCounts.get(stock.stockItemId) || 0;
          const remaining = stock.quantityAvailable - usedCount;
          return remaining > 0 && stock.widthMm >= panel.widthMm && stockLengthMm >= panel.lengthMm;
        })
        .slice(0, 1)
        .map((stock) => {
          const stockLengthMm = stock.lengthM * 1000;
          const stockAreaSqM = (stock.widthMm / 1000) * stock.lengthM;
          const panelAreaSqM = (panel.widthMm / 1000) * (panel.lengthMm / 1000);
          usedStockCounts.set(stock.stockItemId, (usedStockCounts.get(stock.stockItemId) || 0) + 1);
          return {
            cutItemId: cut.itemId,
            cutItemNo: cut.itemNo,
            cutDescription: cut.description,
            panelLabel: panel.label,
            requiredWidthMm: panel.widthMm,
            requiredLengthMm: panel.lengthMm,
            stockItemId: stock.stockItemId,
            stockItemName: `${stock.widthMm}mm x ${stock.lengthM}m`,
            stockWidthMm: stock.widthMm,
            stockLengthMm: stockLengthMm,
            stockThicknessMm: stock.thicknessMm,
            stockColor: stock.color,
            wasteIfUsedSqM: Math.max(0, stockAreaSqM - panelAreaSqM),
          };
        }),
    );
  });
}

function parseNb(description: string): number | null {
  const multiMatch = description.match(/(\d+)\s*[xX]\s*(\d+)\s*(?:mm\s*)?NB/i);
  if (multiMatch) {
    return Math.max(parseInt(multiMatch[1], 10), parseInt(multiMatch[2], 10));
  }
  const match = description.match(/(\d+)\s*(?:mm\s*)?NB/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseBranchNb(description: string): number | null {
  const multiMatch = description.match(/(\d+)\s*[xX]\s*(\d+)\s*(?:mm\s*)?NB/i);
  if (multiMatch) {
    return Math.min(parseInt(multiMatch[1], 10), parseInt(multiMatch[2], 10));
  }
  return null;
}

function parseOd(description: string): number | null {
  const match = description.match(/(\d+)\s*(?:mm\s*)?OD/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseLength(description: string): number | null {
  const lgMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:mm\s*)?LG/i);
  if (lgMatch) {
    const value = parseFloat(lgMatch[1]);
    if (lgMatch[1].includes(".") && value < 50) {
      return Math.round(value * 1000);
    } else {
      return Math.round(value);
    }
  }

  const longMatch = description.match(/(\d+)\s*(?:mm\s*)?LONG/i);
  if (longMatch) return parseInt(longMatch[1], 10);

  const mmMatch = description.match(/(\d+)\s*mm\b/i);
  if (mmMatch) return parseInt(mmMatch[1], 10);

  const mMatch = description.match(/(\d+(?:\.\d+)?)\s*[Mm](?:\s|$)/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000);

  const trailingMatch = description.match(/\s(\d{3,5})(?:\/\d+)?\s*$/);
  if (trailingMatch) {
    const val = parseInt(trailingMatch[1], 10);
    if (val >= 100) return val;
  }

  return null;
}

function parseSchedule(description: string): string | null {
  const match = description.match(/\bSCH(?:EDULE)?\s*(\d+[SsHh]?)\b/i);
  if (match) return `Sch ${match[1].toUpperCase()}`;

  if (/\bSTD\b/i.test(description)) return "Sch Std";
  if (/\bXS\b/i.test(description)) return "Sch 80";

  return null;
}

function parseFlangeConfig(description: string): string | null {
  const patterns: { pattern: RegExp; config: string }[] = [
    { pattern: /\bFBE\b/i, config: "both_ends" },
    { pattern: /\bFFE\b/i, config: "both_ends" },
    { pattern: /\bFAE\b/i, config: "both_ends" },
    { pattern: /\bF(?:OE|1E)\b/i, config: "one_end" },
    { pattern: /\bPE\b/, config: "plain_ends" },
    { pattern: /\bL\/FLG\b/i, config: "loose_flange" },
    { pattern: /\bFLG[SD]?\s*(?:B(?:OTH)?|2)\s*(?:END|E)/i, config: "both_ends" },
    { pattern: /\bFLG[SD]?\s*(?:1|ONE)\s*(?:END|E)/i, config: "one_end" },
  ];

  const match = patterns.find(({ pattern }) => pattern.test(description));
  return match ? match.config : null;
}

function parseItemType(description: string): string | null {
  const patterns: { pattern: RegExp; type: string }[] = [
    { pattern: /\bPIPE\b/i, type: "pipe" },
    { pattern: /\bBEND\b/i, type: "bend" },
    { pattern: /\bELBOW\b/i, type: "bend" },
    { pattern: /\bREDUCER\b/i, type: "reducer" },
    { pattern: /\bTEE\b/i, type: "tee" },
    { pattern: /\bFLANGE\b/i, type: "flange" },
    { pattern: /\bOFFSET\b/i, type: "offset" },
    { pattern: /\bVALVE\b/i, type: "valve" },
    { pattern: /\bSPOOL\b/i, type: "spool" },
    { pattern: /\bPULLEY\b/i, type: "pulley" },
    { pattern: /\bDRUM\b/i, type: "drum" },
    { pattern: /\bROLLER\b/i, type: "roller" },
  ];

  const match = patterns.find(({ pattern }) => pattern.test(description));
  return match ? match.type : null;
}

function parseWallThickness(description: string): number | null {
  const wtMatch = description.match(/W\/T\s+(\d+(?:\.\d+)?)\s*mm/i);
  if (wtMatch) return parseFloat(wtMatch[1]);

  const schWtMatch = description.match(/Sch\s*\d+\s*\((\d+(?:\.\d+)?)\s*mm\)/i);
  if (schWtMatch) return parseFloat(schWtMatch[1]);

  return null;
}

function parseBendAngle(description: string): number | null {
  const match = description.match(/(\d+)\s*°/);
  return match ? parseInt(match[1], 10) : null;
}

function parseBendRadiusType(description: string): string | null {
  const match = description.match(/(\d+(?:\.\d+)?)\s*D\b/i);
  return match ? `${match[1]}D` : null;
}

function parseCenterToFace(description: string): number | null {
  const singleMatch = description.match(/C\/F\s+(\d+(?:\.\d+)?)/i);
  if (singleMatch) return parseFloat(singleMatch[1]);

  const dimMatch = description.match(/(\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?\s*C\/F/i);
  if (dimMatch) return parseFloat(dimMatch[1]);

  return null;
}

function parseFittingDimensions(description: string): {
  lengthA: number | null;
  lengthB: number | null;
} {
  const match = description.match(/\((\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\)/);
  if (match) {
    return {
      lengthA: parseFloat(match[1]),
      lengthB: parseFloat(match[2]),
    };
  }
  const bareMatch = description.match(/NB\s+(\d{3,4})\s*[xX]\s*(\d{3,4})\b/i);
  if (bareMatch) {
    return {
      lengthA: parseFloat(bareMatch[1]),
      lengthB: parseFloat(bareMatch[2]),
    };
  }
  const allDims = [...description.matchAll(/\b(\d{3,5})\s*[xX]\s*(\d{3,5})\b/gi)];
  const standaloneDim = allDims.find((m) => {
    const afterIdx = (m.index || 0) + m[0].length;
    const after = description.substring(afterIdx);
    return !/^\s*(?:mm\s*)?NB/i.test(after);
  });
  if (standaloneDim) {
    return {
      lengthA: parseFloat(standaloneDim[1]),
      lengthB: parseFloat(standaloneDim[2]),
    };
  }
  return { lengthA: null, lengthB: null };
}

function parseFlangeCount(description: string): number {
  const flangeEntries = description.match(/(\d+)\s*X\s*[RL]\/F/gi);
  if (flangeEntries) {
    return flangeEntries.reduce((total, entry) => {
      const countMatch = entry.match(/(\d+)/);
      return total + (countMatch ? parseInt(countMatch[1], 10) : 0);
    }, 0);
  }

  if (
    /\bFBE\b/i.test(description) ||
    /\bFFE\b/i.test(description) ||
    /\bFAE\b/i.test(description) ||
    /\bF2E\b/i.test(description)
  )
    return 2;
  if (/\bFOE\b/i.test(description) || /\bF1E\b/i.test(description)) return 1;

  return 0;
}

function parsePressureClass(description: string): string | null {
  const match = description.match(/\b(?:Class|CL|#)\s*(150|300|400|600|900|1500|2500)\b/i);
  return match ? `Class ${match[1]}` : null;
}

function parseFlangeStandard(description: string): string | null {
  const standards: { pattern: RegExp; standard: string }[] = [
    { pattern: /\bASME\s*B16\.5\b/i, standard: "ASME B16.5" },
    { pattern: /\bASME\s*B16\.47\b/i, standard: "ASME B16.47" },
    { pattern: /\bSABS\s*1123\b/i, standard: "SABS 1123" },
    { pattern: /\bEN\s*1092\b/i, standard: "EN 1092" },
    { pattern: /\bBS\s*10\b/i, standard: "BS 10" },
  ];

  const match = standards.find(({ pattern }) => pattern.test(description));
  return match ? match.standard : null;
}

function effectiveLengthForBendOrTee(
  rawLengthMm: number | null,
  itemType: string | null,
  centerToFaceMm: number | null,
  fittingLengthA: number | null,
  fittingLengthB: number | null,
): number | null {
  if (itemType === "bend" && fittingLengthA !== null && fittingLengthB !== null) {
    return fittingLengthA + fittingLengthB;
  } else if (centerToFaceMm !== null && itemType === "bend") {
    return centerToFaceMm * 2;
  } else if (centerToFaceMm !== null && itemType === "tee") {
    return centerToFaceMm * 3;
  } else {
    return rawLengthMm;
  }
}

function bendRadiusMultiplier(bendType: string | null): number {
  if (!bendType) return 1.5;
  const match = bendType.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1.5;
}

function calculateItemSurfaceArea(item: ParsedPipeItem): {
  extM2: number | null;
  intM2: number | null;
} {
  if (!item.odMm || item.lengthMm <= 0) return { extM2: null, intM2: null };

  const flangeAllowanceMm = item.flangeCount * 100;

  if (item.itemType === "bend" && item.bendAngle && item.nbMm) {
    let bendLengthMm: number;
    if (item.centerToFaceMm !== null) {
      bendLengthMm = item.centerToFaceMm * 2;
    } else if (item.fittingLengthAMm !== null && item.fittingLengthBMm !== null) {
      bendLengthMm = item.fittingLengthAMm + item.fittingLengthBMm;
    } else {
      const multiplier = bendRadiusMultiplier(item.bendType);
      const bendRadiusMm = multiplier * item.nbMm;
      bendLengthMm = (item.bendAngle / 360) * 2 * Math.PI * bendRadiusMm;
    }
    const effectiveLengthMm = bendLengthMm + flangeAllowanceMm;
    const extM2 = (Math.PI * item.odMm * effectiveLengthMm) / 1_000_000;
    const intM2 = item.idMm ? (Math.PI * item.idMm * effectiveLengthMm) / 1_000_000 : null;
    return { extM2, intM2 };
  }

  if (item.itemType === "tee") {
    const mainLengthMm = (item.fittingLengthAMm || 0) + (item.fittingLengthBMm || 0);
    const effectiveMainMm = mainLengthMm > 0 ? mainLengthMm : item.lengthMm;
    const mainExtM2 = (Math.PI * item.odMm * (effectiveMainMm + flangeAllowanceMm)) / 1_000_000;
    const branchExtM2 = (2.7 * item.odMm * item.odMm) / 1_000_000;
    const extM2 = mainExtM2 + branchExtM2;

    if (item.idMm) {
      const mainIntM2 = (Math.PI * item.idMm * (effectiveMainMm + flangeAllowanceMm)) / 1_000_000;
      const branchIntM2 = (2.7 * item.idMm * item.idMm) / 1_000_000;
      return { extM2, intM2: mainIntM2 + branchIntM2 };
    }
    return { extM2, intM2: null };
  }

  if (item.itemType === "reducer" && item.nbMm) {
    const avgDiameter = item.idMm ? (item.odMm + item.idMm) / 2 : item.odMm;
    const effectiveLengthMm = item.lengthMm + flangeAllowanceMm;
    const extM2 = (Math.PI * item.odMm * effectiveLengthMm) / 1_000_000;
    const intM2 = (Math.PI * avgDiameter * effectiveLengthMm) / 1_000_000;
    return { extM2, intM2 };
  }

  const effectiveLengthMm = item.lengthMm + flangeAllowanceMm;
  const extM2 = (Math.PI * item.odMm * effectiveLengthMm) / 1_000_000;
  const intM2 = item.idMm ? (Math.PI * item.idMm * effectiveLengthMm) / 1_000_000 : null;
  return { extM2, intM2 };
}

function openEndsFromConfig(config: string | null): number {
  if (config === "both_ends" || config === "loose_flange") return 0;
  if (config === "one_end") return 1;
  if (config === "plain_ends") return 2;
  return 2;
}

function nbToOd(nbMm: number): number {
  return NB_TO_OD_MM[nbMm] || nbMm * 1.1;
}

function wallThickness(nbMm: number, schedule: string | null): number {
  const sch = schedule || "Sch Std";
  const schTable = SCHEDULE_WALL_THICKNESS[sch] || SCHEDULE_WALL_THICKNESS["Sch Std"];
  return schTable[nbMm] || 6;
}

function roundUpToNearest(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

const COMMON_STOCK_THICKNESSES = [3, 4, 5, 6, 8, 10, 12];

export function parseRubberSpecNote(notes: string): RubberSpec | null {
  const match = notes.match(
    /R\/L\s+(\w+)?\s*(\d+)\s*SHORE\s+(\w+)\s*[-–]?\s*(\d+(?:\.\d+)?)\s*mm\s*(\w+)?/i,
  );
  if (match) {
    return {
      compound: match[1] || null,
      shore: parseInt(match[2], 10),
      color: match[3] || null,
      thicknessMm: parseFloat(match[4]),
      pattern: match[5] || null,
    };
  }

  const altMatch = notes.match(
    /(\d+(?:\.\d+)?)\s*mm\s+(\w+)?\s*(\w+)?\s*(?:rubber|lining|lagging)/i,
  );
  if (altMatch) {
    return {
      thicknessMm: parseFloat(altMatch[1]),
      compound: null,
      shore: null,
      color: altMatch[2] || null,
      pattern: altMatch[3] || null,
    };
  }

  return null;
}

export function suggestPlyCombinations(thicknessMm: number): number[][] {
  const combos: number[][] = [[thicknessMm]];

  COMMON_STOCK_THICKNESSES.forEach((a) => {
    const b = thicknessMm - a;
    if (b >= 3 && a <= b && COMMON_STOCK_THICKNESSES.includes(b)) {
      combos.push(a === b ? [a, b] : [a, b]);
    }
  });

  return combos.sort((x, y) => {
    if (x.length !== y.length) return x.length - y.length;
    const spreadX = Math.abs(x[0] - (x[1] || x[0]));
    const spreadY = Math.abs(y[0] - (y[1] || y[0]));
    return spreadX - spreadY;
  });
}

function isMultiPlyEligible(item: ParsedPipeItem): boolean {
  const isInternalLining =
    item.nbMm !== null &&
    item.itemType !== "pulley" &&
    item.itemType !== "drum" &&
    item.itemType !== "roller";
  if (!isInternalLining) return false;
  if (item.nbMm !== null && item.nbMm < 300) return false;
  if (item.rubberLengthMm > 2500) return false;
  return true;
}

export function parsePipeItem(
  id: string,
  description: string,
  quantity: number,
  m2: number | null,
  itemNo: string | null,
): ParsedPipeItem {
  const nbMm = parseNb(description);
  const rawBranchNbMm = parseBranchNb(description);
  const directOd = parseOd(description);
  const rawLengthMm = parseLength(description);
  const schedule = parseSchedule(description);
  const flangeConfig = parseFlangeConfig(description);
  const itemType = parseItemType(description);
  const openEnds = openEndsFromConfig(flangeConfig);
  const parsedWt = parseWallThickness(description);
  const bendAngle = parseBendAngle(description);
  const bendType = parseBendRadiusType(description);
  const centerToFaceMm = parseCenterToFace(description);
  const fittingDims = parseFittingDimensions(description);
  const flangeCount = parseFlangeCount(description);
  const pressureClass = parsePressureClass(description);
  const flangeStandard = parseFlangeStandard(description);

  const lengthMm = effectiveLengthForBendOrTee(
    rawLengthMm,
    itemType,
    centerToFaceMm,
    fittingDims.lengthA,
    fittingDims.lengthB,
  );
  const branchNbMm = rawBranchNbMm || (itemType === "tee" && centerToFaceMm !== null ? nbMm : null);
  const fittingRunLengthMm =
    itemType === "tee"
      ? centerToFaceMm !== null
        ? centerToFaceMm * 2
        : fittingDims.lengthA
      : null;
  const fittingBranchLengthMm =
    itemType === "tee" ? (centerToFaceMm !== null ? centerToFaceMm : fittingDims.lengthB) : null;

  const hasDimensions = (nbMm !== null || directOd !== null) && lengthMm !== null && lengthMm > 0;
  const isExternalLining = itemType === "pulley" || itemType === "drum" || itemType === "roller";
  const isOdBased = isExternalLining || (nbMm === null && directOd !== null);

  let odMm: number | null = null;
  let idMm: number | null = null;
  let rubberWidthMm = 0;
  let rubberLengthMm = 0;
  let stripsPerPiece = 1;

  if (hasDimensions) {
    if (isOdBased) {
      odMm = directOd || (nbMm ? nbToOd(nbMm) : null);
      if (odMm) {
        const circumference = Math.PI * odMm;
        rubberWidthMm = roundUpToNearest(
          circumference + BEVEL_ALLOWANCE_MM,
          ROLL_WIDTH_INCREMENT_MM,
        );
        rubberLengthMm = lengthMm + BEVEL_ALLOWANCE_MM;
      }
    } else if (nbMm) {
      odMm = nbToOd(nbMm);
      const wt = parsedWt || wallThickness(nbMm, schedule);
      idMm = odMm - 2 * wt;

      const circumference = Math.PI * idMm;
      const singleStripWidth = circumference + BEVEL_ALLOWANCE_MM;
      if (singleStripWidth <= ROLL_WIDTH_MAX_MM) {
        rubberWidthMm = roundUpToNearest(singleStripWidth, ROLL_WIDTH_INCREMENT_MM);
        stripsPerPiece = 1;
      } else {
        stripsPerPiece = Math.ceil(circumference / ROLL_WIDTH_MAX_MM);
        rubberWidthMm = roundUpToNearest(circumference / stripsPerPiece, ROLL_WIDTH_INCREMENT_MM);
      }
      const flangedEnds = Math.min(flangeCount, 2);
      const unflangedEnds = 2 - flangedEnds;
      const flangeExtra = flangedEnds * flangeAllowanceMm(nbMm);
      const openExtra = unflangedEnds * OPEN_END_ALLOWANCE_MM;
      rubberLengthMm = lengthMm + flangeExtra + openExtra + BEVEL_ALLOWANCE_MM;
    }
  }

  const partialItem: ParsedPipeItem = {
    id,
    itemNo,
    description,
    nbMm,
    odMm,
    idMm,
    schedule,
    lengthMm: lengthMm || 0,
    flangeConfig,
    openEnds,
    itemType,
    rubberWidthMm,
    rubberLengthMm,
    stripsPerPiece,
    quantity,
    isValidPipe: hasDimensions && rubberWidthMm > 0,
    m2,
    wallThicknessMm: parsedWt,
    bendAngle,
    bendType,
    centerToFaceMm,
    fittingLengthAMm: fittingDims.lengthA,
    fittingLengthBMm: fittingDims.lengthB,
    flangeCount,
    pressureClass,
    flangeStandard,
    calculatedExtM2: null,
    calculatedIntM2: null,
    branchNbMm,
    fittingRunLengthMm,
    fittingBranchLengthMm,
    subPanels: null,
  };

  const surfaceArea = calculateItemSurfaceArea(partialItem);

  return {
    ...partialItem,
    calculatedExtM2: surfaceArea.extM2,
    calculatedIntM2: surfaceArea.intM2,
  };
}

function rotateIfNeeded(item: ParsedPipeItem): ParsedPipeItem {
  const w = item.rubberWidthMm;
  const l = item.rubberLengthMm;
  const normalFits = w <= ROLL_WIDTH_MAX_MM;
  const rotatedFits = l <= ROLL_WIDTH_MAX_MM;

  if (normalFits && !rotatedFits) return item;
  if (!normalFits && rotatedFits) {
    return { ...item, rubberWidthMm: l, rubberLengthMm: w };
  }
  if (normalFits && rotatedFits) {
    return w <= l ? item : { ...item, rubberWidthMm: l, rubberLengthMm: w };
  }
  return w <= l ? item : { ...item, rubberWidthMm: l, rubberLengthMm: w };
}

function expandTeeItem(item: ParsedPipeItem): ParsedPipeItem {
  const hasTeeDims =
    item.itemType === "tee" &&
    item.fittingRunLengthMm !== null &&
    item.fittingBranchLengthMm !== null &&
    item.branchNbMm !== null &&
    item.nbMm !== null;

  if (!hasTeeDims) return item;

  const schedule = item.schedule;
  const mainNb = item.nbMm as number;
  const branchNb = item.branchNbMm as number;
  const runLength = item.fittingRunLengthMm as number;
  const branchLength = item.fittingBranchLengthMm as number;

  const mainOd = nbToOd(mainNb);
  const mainWt = item.wallThicknessMm || wallThickness(mainNb, schedule);
  const mainId = mainOd - 2 * mainWt;
  const mainCirc = Math.PI * mainId;
  const mainRubberWidth = roundUpToNearest(mainCirc + BEVEL_ALLOWANCE_MM, ROLL_WIDTH_INCREMENT_MM);
  const mainFlangeAllowance = flangeAllowanceMm(mainNb);
  const mainRubberLength = runLength + 2 * mainFlangeAllowance + BEVEL_ALLOWANCE_MM;

  const branchOd = nbToOd(branchNb);
  const branchWt = wallThickness(branchNb, schedule);
  const branchId = branchOd - 2 * branchWt;
  const branchCirc = Math.PI * branchId;
  const branchRubberWidth = roundUpToNearest(
    branchCirc + BEVEL_ALLOWANCE_MM,
    ROLL_WIDTH_INCREMENT_MM,
  );
  const branchFlangeAllowance = flangeAllowanceMm(branchNb);
  const branchRubberLength = branchLength + branchFlangeAllowance + BEVEL_ALLOWANCE_MM;

  const compositeWidth = Math.max(mainRubberWidth, branchRubberWidth);
  const compositeLength = mainRubberLength + branchRubberLength;

  const subPanels: SubPanelSpec[] = [
    {
      label: "Run",
      nbMm: mainNb,
      rubberWidthMm: mainRubberWidth,
      rubberLengthMm: mainRubberLength,
      flangeCount: 2,
    },
    {
      label: "Branch",
      nbMm: branchNb,
      rubberWidthMm: branchRubberWidth,
      rubberLengthMm: branchRubberLength,
      flangeCount: 1,
    },
  ];

  return {
    ...item,
    rubberWidthMm: compositeWidth,
    rubberLengthMm: compositeLength,
    stripsPerPiece: 1,
    subPanels,
  };
}

export function expandAndRotateItems(parsedItems: ParsedPipeItem[]): ParsedPipeItem[] {
  return parsedItems
    .filter((item) => item.isValidPipe)
    .map((item) => expandTeeItem(item))
    .flatMap((item) => {
      const rotated = rotateIfNeeded(item);
      const count = Number(item.quantity) || 1;
      const strips = item.stripsPerPiece || 1;
      const totalPieces = count * strips;
      return Array.from({ length: totalPieces }, (_, i) => ({
        ...rotated,
        id: totalPieces > 1 ? `${item.id}-${i + 1}` : item.id,
      }));
    });
}

interface SkylineSegment {
  xMm: number;
  widthMm: number;
  yMm: number;
}

interface Placement {
  item: ParsedPipeItem;
  xMm: number;
  yMm: number;
  widthMm: number;
  lengthMm: number;
  rotatedInPlacement: boolean;
}

function widestOrientationWidth(item: ParsedPipeItem): number {
  return Math.max(item.rubberWidthMm, item.rubberLengthMm);
}

function narrowestOrientationWidth(item: ParsedPipeItem): number {
  return Math.min(item.rubberWidthMm, item.rubberLengthMm);
}

function skylineMaxY(skyline: SkylineSegment[], startX: number, widthMm: number): number | null {
  const endX = startX + widthMm;
  const overlapping = skyline.filter((seg) => seg.xMm < endX && seg.xMm + seg.widthMm > startX);
  if (overlapping.length === 0) return null;

  const coveredLeft = overlapping[0].xMm <= startX;
  const coveredRight =
    overlapping[overlapping.length - 1].xMm + overlapping[overlapping.length - 1].widthMm >= endX;
  if (!coveredLeft || !coveredRight) return null;

  return overlapping.reduce((max, seg) => Math.max(max, seg.yMm), 0);
}

function addRectToSkyline(
  skyline: SkylineSegment[],
  xMm: number,
  widthMm: number,
  newYMm: number,
): SkylineSegment[] {
  const endX = xMm + widthMm;
  const preserved = skyline.flatMap((seg) => {
    const segEnd = seg.xMm + seg.widthMm;
    if (segEnd <= xMm || seg.xMm >= endX) return [seg];
    const parts: SkylineSegment[] = [];
    if (seg.xMm < xMm) {
      parts.push({ xMm: seg.xMm, widthMm: xMm - seg.xMm, yMm: seg.yMm });
    }
    if (segEnd > endX) {
      parts.push({ xMm: endX, widthMm: segEnd - endX, yMm: seg.yMm });
    }
    return parts;
  });

  const combined = [...preserved, { xMm, widthMm, yMm: newYMm }].sort((a, b) => a.xMm - b.xMm);

  return combined.reduce<SkylineSegment[]>((acc, seg) => {
    const last = acc[acc.length - 1];
    if (last && last.yMm === seg.yMm && last.xMm + last.widthMm === seg.xMm) {
      return [...acc.slice(0, -1), { ...last, widthMm: last.widthMm + seg.widthMm }];
    }
    return [...acc, seg];
  }, []);
}

function tryPlaceItem(
  item: ParsedPipeItem,
  skyline: SkylineSegment[],
  rollWidthMm: number,
  rollLengthMm: number,
): { xMm: number; yMm: number; widthMm: number; lengthMm: number; rotated: boolean } | null {
  const orientations: { w: number; l: number; rotated: boolean }[] = [
    { w: item.rubberWidthMm, l: item.rubberLengthMm, rotated: false },
  ];
  if (item.rubberWidthMm !== item.rubberLengthMm) {
    orientations.push({
      w: item.rubberLengthMm,
      l: item.rubberWidthMm,
      rotated: true,
    });
  }

  const candidates = orientations.flatMap((orient) => {
    if (orient.w > rollWidthMm) return [];
    return skyline.flatMap((seg) => {
      const startOptions = [seg.xMm];
      if (seg.xMm + seg.widthMm - orient.w > seg.xMm) {
        startOptions.push(seg.xMm + seg.widthMm - orient.w);
      }
      return startOptions
        .filter((x) => x >= 0 && x + orient.w <= rollWidthMm)
        .map((x) => {
          const y = skylineMaxY(skyline, x, orient.w);
          if (y === null || y + orient.l > rollLengthMm) return null;
          return { xMm: x, yMm: y, widthMm: orient.w, lengthMm: orient.l, rotated: orient.rotated };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
    });
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((best, c) => {
    if (c.yMm < best.yMm) return c;
    if (c.yMm === best.yMm && c.xMm < best.xMm) return c;
    return best;
  });
}

function packRollSkyline(
  items: ParsedPipeItem[],
  rollWidthMm: number,
  rollLengthMm: number,
): { placements: Placement[]; unplaced: ParsedPipeItem[] } {
  const sortedItems = [...items].sort((a, b) => {
    const widthDiff = widestOrientationWidth(b) - widestOrientationWidth(a);
    if (widthDiff !== 0) return widthDiff;
    const areaDiff = b.rubberWidthMm * b.rubberLengthMm - a.rubberWidthMm * a.rubberLengthMm;
    if (areaDiff !== 0) return areaDiff;
    return narrowestOrientationWidth(b) - narrowestOrientationWidth(a);
  });

  const result = sortedItems.reduce<{
    skyline: SkylineSegment[];
    placements: Placement[];
    unplaced: ParsedPipeItem[];
  }>(
    (state, item) => {
      const fit = tryPlaceItem(item, state.skyline, rollWidthMm, rollLengthMm);
      if (!fit) {
        return { ...state, unplaced: [...state.unplaced, item] };
      }
      const newSkyline = addRectToSkyline(
        state.skyline,
        fit.xMm,
        fit.widthMm,
        fit.yMm + fit.lengthMm,
      );
      return {
        skyline: newSkyline,
        placements: [
          ...state.placements,
          {
            item,
            xMm: fit.xMm,
            yMm: fit.yMm,
            widthMm: fit.widthMm,
            lengthMm: fit.lengthMm,
            rotatedInPlacement: fit.rotated,
          },
        ],
        unplaced: state.unplaced,
      };
    },
    {
      skyline: [{ xMm: 0, widthMm: rollWidthMm, yMm: 0 }],
      placements: [],
      unplaced: [],
    },
  );

  return { placements: result.placements, unplaced: result.unplaced };
}

function finalizeRollFromPlacements(
  rollIndex: number,
  placements: Placement[],
  rollWidthMm: number,
): RollAllocation {
  const rollLengthMm = ROLL_LENGTH_MAX_M * 1000;

  const rowsByY = placements.reduce<Map<number, Placement[]>>((map, p) => {
    const list = map.get(p.yMm) || [];
    return new Map(map).set(p.yMm, [...list, p]);
  }, new Map());

  const sortedRows = Array.from(rowsByY.entries()).sort((a, b) => a[0] - b[0]);

  const bands: BandSpec[] = sortedRows.map(([yMm, rowPlacements], bandIdx) => ({
    bandIndex: bandIdx,
    lanes: rowPlacements.length,
    laneWidthMm: 0,
    startMm: yMm,
    heightMm: Math.max(...rowPlacements.map((p) => p.lengthMm)),
    widthUsedMm: rowPlacements.reduce((max, p) => Math.max(max, p.xMm + p.widthMm), 0),
  }));

  const bandIndexByY = new Map(sortedRows.map(([y], idx) => [y, idx]));

  const cuts: CutPiece[] = placements.map((p) => ({
    itemId: p.item.id,
    itemNo: p.item.itemNo,
    description: p.item.description,
    widthMm: p.widthMm,
    lengthMm: p.lengthMm,
    positionMm: p.yMm,
    lane: 0,
    laneOffsetMm: p.xMm,
    band: bandIndexByY.get(p.yMm) || 0,
    stripsPerPiece: p.item.stripsPerPiece,
    subPanels: p.item.subPanels,
  }));

  const totalBandHeight = placements.reduce((max, p) => Math.max(max, p.yMm + p.lengthMm), 0);

  const offcuts: Offcut[] = [];
  bands.forEach((band) => {
    const widthWaste = rollWidthMm - band.widthUsedMm;
    if (widthWaste > 0) {
      offcuts.push({
        widthMm: widthWaste,
        lengthMm: band.heightMm,
        areaSqM: (widthWaste / 1000) * (band.heightMm / 1000),
      });
    }
  });

  const rollTail = rollLengthMm - totalBandHeight;
  if (rollTail > 0) {
    offcuts.push({
      widthMm: rollWidthMm,
      lengthMm: rollTail,
      areaSqM: (rollWidthMm / 1000) * (rollTail / 1000),
    });
  }

  const rollSpec: RollSpecification = {
    widthMm: rollWidthMm,
    lengthM: ROLL_LENGTH_MAX_M,
    areaSqM: (rollWidthMm / 1000) * ROLL_LENGTH_MAX_M,
    lanes: 1,
    laneWidthMm: rollWidthMm,
  };

  const totalUsedSqM = cuts.reduce(
    (sum, cut) => sum + (cut.widthMm / 1000) * (cut.lengthMm / 1000),
    0,
  );
  const wastePercentage =
    rollSpec.areaSqM > 0 ? ((rollSpec.areaSqM - totalUsedSqM) / rollSpec.areaSqM) * 100 : 0;

  return {
    rollIndex,
    rollSpec,
    cuts,
    usedLengthMm: [totalBandHeight],
    wastePercentage,
    hasLengthwiseCut: bands.some((b) => b.lanes > 1),
    bands,
    offcuts,
  };
}

function buildRollsForItems(parsedItems: ParsedPipeItem[]): RollAllocation[] {
  const items = expandAndRotateItems(parsedItems);
  if (items.length === 0) return [];

  const widestItemDim = items.reduce(
    (max, item) => Math.max(max, narrowestOrientationWidth(item)),
    0,
  );
  const rollWidthMm = roundUpToNearest(
    Math.max(ROLL_WIDTH_MIN_MM, Math.min(ROLL_WIDTH_MAX_MM, widestItemDim)),
    ROLL_WIDTH_INCREMENT_MM,
  );

  const rollLengthMm = ROLL_LENGTH_MAX_M * 1000;

  const buildNextRoll = (
    remaining: ParsedPipeItem[],
    rollsAcc: RollAllocation[],
  ): RollAllocation[] => {
    if (remaining.length === 0) return rollsAcc;
    const { placements, unplaced } = packRollSkyline(remaining, rollWidthMm, rollLengthMm);
    if (placements.length === 0) return rollsAcc;
    const roll = finalizeRollFromPlacements(rollsAcc.length + 1, placements, rollWidthMm);
    return buildNextRoll(unplaced, [...rollsAcc, roll]);
  };

  return buildNextRoll(items, []);
}

function rollStats(rolls: RollAllocation[]): {
  totalUsedSqM: number;
  totalWasteSqM: number;
  wastePercentage: number;
} {
  const { totalUsedSqM, totalRollAreaSqM } = rolls.reduce(
    (acc, roll) => {
      const usedAreaSqM = roll.cuts.reduce(
        (sum, cut) => sum + (cut.widthMm / 1000) * (cut.lengthMm / 1000),
        0,
      );
      return {
        totalUsedSqM: acc.totalUsedSqM + usedAreaSqM,
        totalRollAreaSqM: acc.totalRollAreaSqM + roll.rollSpec.areaSqM,
      };
    },
    { totalUsedSqM: 0, totalRollAreaSqM: 0 },
  );

  const totalWasteSqM = totalRollAreaSqM - totalUsedSqM;
  const wastePercentage = totalRollAreaSqM > 0 ? (totalWasteSqM / totalRollAreaSqM) * 100 : 0;

  return { totalUsedSqM, totalWasteSqM, wastePercentage };
}

function scorePlyCombination(
  combo: number[],
  parsedItems: ParsedPipeItem[],
  stockQuery: StockQuery | null,
): { plies: PlyLayer[]; score: number } {
  const thicknessMap = new Map<number, number>();
  combo.forEach((t) => {
    thicknessMap.set(t, (thicknessMap.get(t) || 0) + 1);
  });

  let rollIdx = 1;
  const plies: PlyLayer[] = Array.from(thicknessMap.entries()).map(([thickness, plyCount]) => {
    const multipliedItems =
      plyCount > 1
        ? parsedItems.map((item) => ({ ...item, quantity: item.quantity * plyCount }))
        : parsedItems;
    const baseRolls = buildRollsForItems(multipliedItems);
    const rolls = baseRolls.map((roll) => ({
      ...roll,
      rollIndex: rollIdx++,
      plyThicknessMm: thickness,
    }));
    return {
      thicknessMm: thickness,
      rolls,
      totalRollsNeeded: rolls.length,
      plyCount,
    };
  });

  const totalRolls = plies.reduce((sum, ply) => sum + ply.totalRollsNeeded, 0);
  const totalWaste = plies.reduce((sum, ply) => sum + rollStats(ply.rolls).totalWasteSqM, 0);

  let stockScore = 0;
  if (stockQuery) {
    stockScore = Array.from(thicknessMap.entries()).reduce((score, [thickness]) => {
      const available = stockQuery.rolls.filter((r) => r.thicknessMm === thickness);
      const totalAvailable = available.reduce((s, r) => s + r.quantityAvailable, 0);
      const needed = plies.find((p) => p.thicknessMm === thickness)?.totalRollsNeeded || 0;
      return score + (totalAvailable >= needed ? 1000 : totalAvailable > 0 ? 500 : 0);
    }, 0);
  }

  const score = stockScore - totalRolls * 10 - totalWaste;
  return { plies, score };
}

export function calculateCuttingPlan(
  lineItems: Array<{
    id?: number;
    itemCode: string | null;
    itemDescription: string | null;
    itemNo?: string | null;
    quantity: number | null;
    m2: number | null;
    notes?: string | null;
  }>,
  stockQuery?: StockQuery | null,
  selectedPlyCombination?: number[] | null,
): CuttingPlan {
  const { parsedItems, genericM2Items, rubberSpec } = lineItems.reduce(
    (acc, item) => {
      const desc = item.itemDescription || item.itemCode || "";
      const qty = item.quantity || 1;
      const m2 = item.m2 ? Number(item.m2) : null;
      const itemNo = item.itemNo || null;

      const parsed = parsePipeItem(String(item.id || Math.random()), desc, Number(qty), m2, itemNo);

      if (parsed.isValidPipe) {
        const specFromNotes =
          !acc.rubberSpec && item.notes ? parseRubberSpecNote(item.notes) : null;
        return {
          ...acc,
          parsedItems: [...acc.parsedItems, parsed],
          rubberSpec: specFromNotes || acc.rubberSpec,
        };
      } else if (/R\/L|rubber|lining|lagging/i.test(desc) && !acc.rubberSpec) {
        const spec = parseRubberSpecNote(desc);
        if (!spec && m2 && m2 > 0) {
          return { ...acc, genericM2Items: [...acc.genericM2Items, { description: desc, m2 }] };
        }
        return { ...acc, rubberSpec: spec };
      } else if (m2 && m2 > 0) {
        return { ...acc, genericM2Items: [...acc.genericM2Items, { description: desc, m2 }] };
      }

      if (!acc.rubberSpec && item.notes) {
        const specFromNotes = parseRubberSpecNote(item.notes);
        if (specFromNotes) {
          return { ...acc, rubberSpec: specFromNotes };
        }
      }

      return acc;
    },
    {
      parsedItems: [] as ParsedPipeItem[],
      genericM2Items: [] as { description: string; m2: number }[],
      rubberSpec: null as RubberSpec | null,
    },
  );

  const hasPipeItems = parsedItems.length > 0;
  const genericM2Total = genericM2Items.reduce((sum, item) => sum + item.m2, 0);

  const emptyPlan: CuttingPlan = {
    rolls: [],
    totalRollsNeeded: 0,
    totalWasteSqM: 0,
    totalUsedSqM: 0,
    wastePercentage: 0,
    hasPipeItems: false,
    genericM2Items,
    genericM2Total,
    rubberSpec,
    plies: [],
    totalThicknessMm: rubberSpec?.thicknessMm || 0,
    isMultiPly: false,
    offcuts: [],
  };

  if (!hasPipeItems) {
    return emptyPlan;
  }

  const baseRolls = buildRollsForItems(parsedItems);

  const hasMultiPlyEligibleItems = parsedItems.some(isMultiPlyEligible);
  let plies: PlyLayer[] = [];
  let isMultiPly = false;

  if (selectedPlyCombination && selectedPlyCombination.length > 0) {
    const scored = scorePlyCombination(selectedPlyCombination, parsedItems, stockQuery || null);
    plies = scored.plies;
    isMultiPly = selectedPlyCombination.length > 1;
  } else if (rubberSpec && hasMultiPlyEligibleItems && stockQuery) {
    const combos = suggestPlyCombinations(rubberSpec.thicknessMm);
    const viableCombos = combos.filter((combo) =>
      combo.every((t) => stockQuery.availableThicknesses.includes(t)),
    );

    const candidates = (viableCombos.length > 0 ? viableCombos : combos).map((combo) =>
      scorePlyCombination(combo, parsedItems, stockQuery),
    );

    const best = candidates.sort((a, b) => b.score - a.score)[0];
    if (best) {
      plies = best.plies;
      isMultiPly = plies.some((p) => p.plyCount > 1) || plies.length > 1;
    }
  }

  if (plies.length === 0) {
    plies = [
      {
        thicknessMm: rubberSpec?.thicknessMm || 0,
        rolls: baseRolls,
        totalRollsNeeded: baseRolls.length,
        plyCount: 1,
      },
    ];
  }

  const combinedRolls = plies.flatMap((ply) => ply.rolls);
  const combinedStats = rollStats(combinedRolls);
  const allOffcuts = combinedRolls.flatMap((roll) => roll.offcuts);

  return {
    rolls: combinedRolls,
    totalRollsNeeded: combinedRolls.length,
    totalWasteSqM: combinedStats.totalWasteSqM,
    totalUsedSqM: combinedStats.totalUsedSqM,
    wastePercentage: combinedStats.wastePercentage,
    hasPipeItems: true,
    genericM2Items,
    genericM2Total,
    rubberSpec,
    plies,
    totalThicknessMm: rubberSpec?.thicknessMm || 0,
    isMultiPly,
    offcuts: allOffcuts,
  };
}
