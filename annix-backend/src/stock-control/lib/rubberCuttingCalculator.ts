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
    600: 28.58,
    750: 31.75,
    900: 34.93,
    1000: 38.1,
    1050: 38.1,
    1200: 38.1,
  },
};

const ROLL_WIDTH_MIN_MM = 800;
const ROLL_WIDTH_MAX_MM = 1450;
const ROLL_WIDTH_INCREMENT_MM = 50;
const ROLL_LENGTH_MAX_M = 12.5;
const OPEN_END_ALLOWANCE_MM = 100;

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
  quantity: number;
  isValidPipe: boolean;
  m2: number | null;
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
}

export interface RollAllocation {
  rollIndex: number;
  rollSpec: RollSpecification;
  cuts: CutPiece[];
  usedLengthMm: number[];
  wastePercentage: number;
  hasLengthwiseCut: boolean;
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
}

function parseNb(description: string): number | null {
  const match = description.match(/(\d+)\s*NB/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseLength(description: string): number | null {
  const lgMatch = description.match(/(\d+)\s*LG/i);
  if (lgMatch) return parseInt(lgMatch[1], 10);

  const mmMatch = description.match(/(\d+)\s*mm\b/i);
  if (mmMatch) return parseInt(mmMatch[1], 10);

  const mMatch = description.match(/(\d+(?:\.\d+)?)\s*[Mm](?:\s|$)/);
  if (mMatch) return parseFloat(mMatch[1]) * 1000;

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
    { pattern: /\bF(?:OE|1E)\b/i, config: "one_end" },
    { pattern: /\bPE\b/, config: "plain_ends" },
    { pattern: /\bL\/FLG\b/i, config: "loose_flange" },
    { pattern: /\bFLG[SD]?\s*(?:B(?:OTH)?|2)\s*(?:END|E)/i, config: "both_ends" },
    { pattern: /\bFLG[SD]?\s*(?:1|ONE)\s*(?:END|E)/i, config: "one_end" },
  ];

  for (const { pattern, config } of patterns) {
    if (pattern.test(description)) return config;
  }
  return null;
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
  ];

  for (const { pattern, type } of patterns) {
    if (pattern.test(description)) return type;
  }
  return null;
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

export function parsePipeItem(
  id: string,
  description: string,
  quantity: number,
  m2: number | null,
  itemNo: string | null,
): ParsedPipeItem {
  const nbMm = parseNb(description);
  const lengthMm = parseLength(description);
  const schedule = parseSchedule(description);
  const flangeConfig = parseFlangeConfig(description);
  const itemType = parseItemType(description);
  const openEnds = openEndsFromConfig(flangeConfig);

  const isValidPipe = nbMm !== null && lengthMm !== null && lengthMm > 0;

  let odMm: number | null = null;
  let idMm: number | null = null;
  let rubberWidthMm = 0;
  let rubberLengthMm = 0;

  if (isValidPipe && nbMm) {
    odMm = nbToOd(nbMm);
    const wt = wallThickness(nbMm, schedule);
    idMm = odMm - 2 * wt;

    const circumference = Math.PI * idMm;
    rubberWidthMm = roundUpToNearest(circumference, ROLL_WIDTH_INCREMENT_MM);

    rubberLengthMm = lengthMm + openEnds * OPEN_END_ALLOWANCE_MM;
  }

  return {
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
    quantity,
    isValidPipe,
    m2,
  };
}

function determineRollSpec(itemWidthMm: number): RollSpecification {
  const canDouble = itemWidthMm * 2 <= ROLL_WIDTH_MAX_MM;
  const canTriple = itemWidthMm * 3 <= ROLL_WIDTH_MAX_MM;

  let lanes = 1;
  let rollWidthMm = itemWidthMm;

  if (canTriple && itemWidthMm <= 450) {
    lanes = 3;
    rollWidthMm = roundUpToNearest(itemWidthMm * 3, ROLL_WIDTH_INCREMENT_MM);
  } else if (canDouble && itemWidthMm <= 700) {
    lanes = 2;
    rollWidthMm = roundUpToNearest(itemWidthMm * 2, ROLL_WIDTH_INCREMENT_MM);
  }

  rollWidthMm = Math.max(ROLL_WIDTH_MIN_MM, Math.min(ROLL_WIDTH_MAX_MM, rollWidthMm));
  const laneWidthMm = Math.floor(rollWidthMm / lanes);

  return {
    widthMm: rollWidthMm,
    lengthM: ROLL_LENGTH_MAX_M,
    areaSqM: (rollWidthMm / 1000) * ROLL_LENGTH_MAX_M,
    lanes,
    laneWidthMm,
  };
}

interface ItemWithLane extends ParsedPipeItem {
  assignedLane: number;
}

function optimizeCuttingWithLanes(
  items: ParsedPipeItem[],
  rollSpec: RollSpecification,
): RollAllocation[] {
  const rolls: RollAllocation[] = [];
  const rollLengthMm = rollSpec.lengthM * 1000;
  const lanes = rollSpec.lanes;

  const sortedItems = [...items].sort((a, b) => b.rubberLengthMm - a.rubberLengthMm);
  const placed = new Set<string>();

  while (placed.size < sortedItems.length) {
    const lanePositions: number[] = Array(lanes).fill(0);
    const cuts: CutPiece[] = [];

    for (const item of sortedItems) {
      if (placed.has(item.id)) continue;

      for (let lane = 0; lane < lanes; lane++) {
        if (lanePositions[lane] + item.rubberLengthMm <= rollLengthMm) {
          cuts.push({
            itemId: item.id,
            itemNo: item.itemNo,
            description: item.description,
            widthMm: item.rubberWidthMm,
            lengthMm: item.rubberLengthMm,
            positionMm: lanePositions[lane],
            lane,
          });
          lanePositions[lane] += item.rubberLengthMm;
          placed.add(item.id);
          break;
        }
      }
    }

    const totalUsed = lanePositions.reduce((sum, pos) => sum + pos, 0);
    const totalCapacity = rollLengthMm * lanes;
    const wastePercentage = ((totalCapacity - totalUsed) / totalCapacity) * 100;

    rolls.push({
      rollIndex: rolls.length + 1,
      rollSpec,
      cuts,
      usedLengthMm: lanePositions,
      wastePercentage,
      hasLengthwiseCut: lanes > 1,
    });
  }

  return rolls;
}

function groupItemsByRequiredWidth(items: ParsedPipeItem[]): Map<number, ParsedPipeItem[]> {
  const groups = new Map<number, ParsedPipeItem[]>();

  for (const item of items) {
    if (!item.isValidPipe) continue;

    const widthKey = item.rubberWidthMm;
    const existing = groups.get(widthKey) || [];

    for (let i = 0; i < item.quantity; i++) {
      existing.push({
        ...item,
        id: item.quantity > 1 ? `${item.id}-${i + 1}` : item.id,
      });
    }

    groups.set(widthKey, existing);
  }

  return groups;
}

export function calculateCuttingPlan(
  lineItems: Array<{
    id?: number;
    itemCode: string | null;
    itemDescription: string | null;
    itemNo?: string | null;
    quantity: number | null;
    m2: number | null;
  }>,
): CuttingPlan {
  const parsedItems: ParsedPipeItem[] = [];
  const genericM2Items: { description: string; m2: number }[] = [];

  for (const item of lineItems) {
    const desc = item.itemDescription || item.itemCode || "";
    const qty = item.quantity || 1;
    const m2 = item.m2 ? Number(item.m2) : null;
    const itemNo = item.itemNo || null;

    const parsed = parsePipeItem(String(item.id || Math.random()), desc, qty, m2, itemNo);

    if (parsed.isValidPipe) {
      parsedItems.push(parsed);
    } else if (m2 && m2 > 0) {
      genericM2Items.push({ description: desc, m2 });
    }
  }

  const hasPipeItems = parsedItems.length > 0;
  const genericM2Total = genericM2Items.reduce((sum, item) => sum + item.m2, 0);

  if (!hasPipeItems) {
    return {
      rolls: [],
      totalRollsNeeded: 0,
      totalWasteSqM: 0,
      totalUsedSqM: 0,
      wastePercentage: 0,
      hasPipeItems: false,
      genericM2Items,
      genericM2Total,
    };
  }

  const widthGroups = groupItemsByRequiredWidth(parsedItems);
  const allRolls: RollAllocation[] = [];

  for (const [widthMm, items] of widthGroups) {
    const rollSpec = determineRollSpec(widthMm);
    const rolls = optimizeCuttingWithLanes(items, rollSpec);
    allRolls.push(...rolls);
  }

  let totalUsedSqM = 0;
  let totalRollAreaSqM = 0;

  for (const roll of allRolls) {
    const usedAreaSqM = roll.cuts.reduce(
      (sum, cut) => sum + (cut.widthMm / 1000) * (cut.lengthMm / 1000),
      0,
    );
    totalUsedSqM += usedAreaSqM;
    totalRollAreaSqM += roll.rollSpec.areaSqM;
  }

  const totalWasteSqM = totalRollAreaSqM - totalUsedSqM;
  const wastePercentage = totalRollAreaSqM > 0 ? (totalWasteSqM / totalRollAreaSqM) * 100 : 0;

  return {
    rolls: allRolls,
    totalRollsNeeded: allRolls.length,
    totalWasteSqM,
    totalUsedSqM,
    wastePercentage,
    hasPipeItems: true,
    genericM2Items,
    genericM2Total,
  };
}
