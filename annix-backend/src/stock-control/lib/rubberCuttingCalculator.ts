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

const ROLL_WIDTH_MIN_MM = 800;
const ROLL_WIDTH_MAX_MM = 1450;
const ROLL_WIDTH_INCREMENT_MM = 50;
const ROLL_LENGTH_MAX_M = 12.5;
const OPEN_END_ALLOWANCE_MM = 100;
const BEVEL_ALLOWANCE_MM = 50;

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
  band: number;
  stripsPerPiece: number;
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
}

export interface StockRollInfo {
  stockItemId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  color: string | null;
  compoundCode: string | null;
  quantityAvailable: number;
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

function parseNb(description: string): number | null {
  const match = description.match(/(\d+)\s*(?:mm\s*)?NB/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseOd(description: string): number | null {
  const match = description.match(/(\d+)\s*(?:mm\s*)?OD/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseLength(description: string): number | null {
  const lgMatch = description.match(/(\d+)\s*(?:mm\s*)?LG/i);
  if (lgMatch) return parseInt(lgMatch[1], 10);

  const longMatch = description.match(/(\d+)\s*(?:mm\s*)?LONG/i);
  if (longMatch) return parseInt(longMatch[1], 10);

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
  const combos: number[][] = [
    [thicknessMm],
    ...COMMON_STOCK_THICKNESSES.filter((a) => {
      const b = thicknessMm - a;
      return b >= 3 && a <= b && COMMON_STOCK_THICKNESSES.includes(b);
    }).map((a) => [a, thicknessMm - a]),
  ];

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
  const directOd = parseOd(description);
  const lengthMm = parseLength(description);
  const schedule = parseSchedule(description);
  const flangeConfig = parseFlangeConfig(description);
  const itemType = parseItemType(description);
  const openEnds = openEndsFromConfig(flangeConfig);

  const hasDimensions = (nbMm !== null || directOd !== null) && lengthMm !== null && lengthMm > 0;
  const isExternalLining = itemType === "pulley" || itemType === "drum" || itemType === "roller";
  const isOdBased = isExternalLining || (nbMm === null && directOd !== null);

  const dims = ((): {
    odMm: number | null;
    idMm: number | null;
    rubberWidthMm: number;
    rubberLengthMm: number;
    stripsPerPiece: number;
  } => {
    const defaults = {
      odMm: null,
      idMm: null,
      rubberWidthMm: 0,
      rubberLengthMm: 0,
      stripsPerPiece: 1,
    };

    if (!hasDimensions) return defaults;

    if (isOdBased) {
      const od = directOd || (nbMm ? nbToOd(nbMm) : null);
      if (!od) return { ...defaults, odMm: od };

      const circumference = Math.PI * od;
      return {
        odMm: od,
        idMm: null,
        rubberWidthMm: roundUpToNearest(
          circumference + BEVEL_ALLOWANCE_MM,
          ROLL_WIDTH_INCREMENT_MM,
        ),
        rubberLengthMm: lengthMm + BEVEL_ALLOWANCE_MM,
        stripsPerPiece: 1,
      };
    } else if (nbMm) {
      const od = nbToOd(nbMm);
      const wt = wallThickness(nbMm, schedule);
      const id = od - 2 * wt;
      const circumference = Math.PI * id;
      const singleStripWidth = circumference + BEVEL_ALLOWANCE_MM;
      const strips =
        singleStripWidth <= ROLL_WIDTH_MAX_MM ? 1 : Math.ceil(circumference / ROLL_WIDTH_MAX_MM);
      const width =
        singleStripWidth <= ROLL_WIDTH_MAX_MM
          ? roundUpToNearest(singleStripWidth, ROLL_WIDTH_INCREMENT_MM)
          : roundUpToNearest(circumference / strips, ROLL_WIDTH_INCREMENT_MM);

      return {
        odMm: od,
        idMm: id,
        rubberWidthMm: width,
        rubberLengthMm: lengthMm + 2 * OPEN_END_ALLOWANCE_MM + BEVEL_ALLOWANCE_MM,
        stripsPerPiece: strips,
      };
    }

    return defaults;
  })();

  const { odMm, idMm, rubberWidthMm, rubberLengthMm, stripsPerPiece } = dims;

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
    stripsPerPiece,
    quantity,
    isValidPipe: hasDimensions && rubberWidthMm > 0,
    m2,
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

function expandAndRotateItems(parsedItems: ParsedPipeItem[]): ParsedPipeItem[] {
  return parsedItems
    .filter((item) => item.isValidPipe)
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

interface BandBuild {
  items: ParsedPipeItem[];
  lanes: number;
  laneWidthMm: number;
  heightMm: number;
  widthUsedMm: number;
  rotated: boolean;
}

function lanesForWidth(widthMm: number): number {
  const maxPossible = Math.floor(ROLL_WIDTH_MAX_MM / widthMm) || 1;
  if (widthMm <= 450) return Math.min(3, maxPossible);
  if (widthMm <= 700) return Math.min(2, maxPossible);
  return 1;
}

function buildBands(items: ParsedPipeItem[]): BandBuild[] {
  const widthGroups = items.reduce((acc, item) => {
    const group = acc.get(item.rubberWidthMm) || [];
    return new Map([...acc, [item.rubberWidthMm, [...group, item]]]);
  }, new Map<number, ParsedPipeItem[]>());

  return Array.from(widthGroups.entries()).flatMap(([widthMm, groupItems]) => {
    const lanes = lanesForWidth(widthMm);
    const sorted = [...groupItems].sort((a, b) => b.rubberLengthMm - a.rubberLengthMm);

    const batchIndices = Array.from(
      { length: Math.ceil(sorted.length / lanes) },
      (_, i) => i * lanes,
    );

    return batchIndices.map((startIdx) => {
      const batch = sorted.slice(startIdx, startIdx + lanes);
      const batchLanes = batch.length;

      const normalHeight = Math.max(...batch.map((it) => it.rubberLengthMm));
      const normalWidthUsed = batchLanes * widthMm;

      const rotatedLaneWidth = Math.max(...batch.map((it) => it.rubberLengthMm));
      const rotatedHeight = widthMm;
      const rotatedWidthUsed = batchLanes * rotatedLaneWidth;
      const rotatedFitsOnRoll = rotatedWidthUsed <= ROLL_WIDTH_MAX_MM;

      if (rotatedFitsOnRoll && rotatedHeight < normalHeight) {
        return {
          items: batch,
          lanes: batchLanes,
          laneWidthMm: rotatedLaneWidth,
          heightMm: rotatedHeight,
          widthUsedMm: rotatedWidthUsed,
          rotated: true,
        };
      }
      return {
        items: batch,
        lanes: batchLanes,
        laneWidthMm: widthMm,
        heightMm: normalHeight,
        widthUsedMm: normalWidthUsed,
        rotated: false,
      };
    });
  });
}

function finalizeRoll(
  rollIndex: number,
  placedBands: { band: BandBuild; startMm: number }[],
  totalBandHeight: number,
  rollWidthMm: number,
): RollAllocation {
  const rollLengthMm = ROLL_LENGTH_MAX_M * 1000;

  const bands: BandSpec[] = placedBands.map(({ band, startMm }, bandIdx) => ({
    bandIndex: bandIdx,
    lanes: band.lanes,
    laneWidthMm: band.laneWidthMm,
    startMm,
    heightMm: band.heightMm,
    widthUsedMm: band.widthUsedMm,
  }));

  const cuts: CutPiece[] = placedBands.flatMap(({ band, startMm }, bandIdx) =>
    band.items.map((item, laneIdx) => {
      const cutWidth = band.rotated ? item.rubberLengthMm : item.rubberWidthMm;
      const cutLength = band.rotated ? item.rubberWidthMm : item.rubberLengthMm;

      return {
        itemId: item.id,
        itemNo: item.itemNo,
        description: item.description,
        widthMm: cutWidth,
        lengthMm: cutLength,
        positionMm: startMm,
        lane: laneIdx,
        band: bandIdx,
        stripsPerPiece: item.stripsPerPiece,
      };
    }),
  );

  const bandOffcuts: Offcut[] = placedBands
    .filter(({ band }) => rollWidthMm - band.widthUsedMm > 0)
    .map(({ band }) => {
      const widthWaste = rollWidthMm - band.widthUsedMm;
      return {
        widthMm: widthWaste,
        lengthMm: band.heightMm,
        areaSqM: (widthWaste / 1000) * (band.heightMm / 1000),
      };
    });

  const rollTail = rollLengthMm - totalBandHeight;
  const offcuts: Offcut[] = [
    ...bandOffcuts,
    ...(rollTail > 0
      ? [
          {
            widthMm: rollWidthMm,
            lengthMm: rollTail,
            areaSqM: (rollWidthMm / 1000) * (rollTail / 1000),
          },
        ]
      : []),
  ];

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

  const allBands = buildBands(items);

  const maxBandWidth = Math.max(...allBands.map((b) => b.widthUsedMm));
  const rollWidthMm = roundUpToNearest(
    Math.max(ROLL_WIDTH_MIN_MM, Math.min(ROLL_WIDTH_MAX_MM, maxBandWidth)),
    ROLL_WIDTH_INCREMENT_MM,
  );

  const sortedBands = [...allBands].sort((a, b) => b.heightMm - a.heightMm);

  const rollLengthMm = ROLL_LENGTH_MAX_M * 1000;

  const { rolls, remaining, currentHeight } = sortedBands.reduce(
    (acc, band) => {
      if (acc.currentHeight + band.heightMm > rollLengthMm && acc.remaining.length > 0) {
        const newRoll = finalizeRoll(
          acc.rolls.length + 1,
          acc.remaining,
          acc.currentHeight,
          rollWidthMm,
        );
        return {
          rolls: [...acc.rolls, newRoll],
          remaining: [{ band, startMm: 0 }],
          currentHeight: band.heightMm,
        };
      }
      return {
        rolls: acc.rolls,
        remaining: [...acc.remaining, { band, startMm: acc.currentHeight }],
        currentHeight: acc.currentHeight + band.heightMm,
      };
    },
    {
      rolls: [] as RollAllocation[],
      remaining: [] as { band: BandBuild; startMm: number }[],
      currentHeight: 0,
    },
  );

  return remaining.length > 0
    ? [...rolls, finalizeRoll(rolls.length + 1, remaining, currentHeight, rollWidthMm)]
    : rolls;
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
  const plies: PlyLayer[] = combo.map((thickness) => {
    const rolls = buildRollsForItems(parsedItems).map((roll) => ({
      ...roll,
      plyThicknessMm: thickness,
    }));
    return {
      thicknessMm: thickness,
      rolls,
      totalRollsNeeded: rolls.length,
    };
  });

  const totalRolls = plies.reduce((sum, ply) => sum + ply.totalRollsNeeded, 0);
  const totalWaste = plies.reduce((sum, ply) => sum + rollStats(ply.rolls).totalWasteSqM, 0);

  const stockScore = stockQuery
    ? combo.reduce((score, thickness) => {
        const available = stockQuery.rolls.filter((r) => r.thicknessMm === thickness);
        const totalAvailable = available.reduce((s, r) => s + r.quantityAvailable, 0);
        const needed = plies.find((p) => p.thicknessMm === thickness)?.totalRollsNeeded || 0;
        return score + (totalAvailable >= needed ? 1000 : totalAvailable > 0 ? 500 : 0);
      }, 0)
    : 0;

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
  const enrichedItems = lineItems.map((item) => {
    const desc = item.itemDescription || item.itemCode || "";
    const qty = item.quantity || 1;
    const m2 = item.m2 ? Number(item.m2) : null;
    const itemNo = item.itemNo || null;
    const parsed = parsePipeItem(String(item.id || Math.random()), desc, Number(qty), m2, itemNo);
    return { item, desc, m2, parsed };
  });

  const { parsedItems, genericM2Items, rubberSpec } = enrichedItems.reduce(
    (acc, { item, desc, m2, parsed }) => {
      if (parsed.isValidPipe) {
        return { ...acc, parsedItems: [...acc.parsedItems, parsed] };
      }
      const specFromDesc =
        !acc.rubberSpec && /R\/L|rubber|lining|lagging/i.test(desc)
          ? parseRubberSpecNote(desc)
          : null;
      const specFromNotes =
        !acc.rubberSpec && !specFromDesc && item.notes ? parseRubberSpecNote(item.notes) : null;
      const newSpec = acc.rubberSpec || specFromDesc || specFromNotes;

      const isRubberLine = /R\/L|rubber|lining|lagging/i.test(desc) && !acc.rubberSpec;
      const shouldAddGenericM2 =
        (isRubberLine && !specFromDesc && m2 && m2 > 0) ||
        (!parsed.isValidPipe && !isRubberLine && m2 && m2 > 0);

      return {
        parsedItems: acc.parsedItems,
        genericM2Items: shouldAddGenericM2
          ? [...acc.genericM2Items, { description: desc, m2: m2 as number }]
          : acc.genericM2Items,
        rubberSpec: newSpec,
      };
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

  const allRolls = buildRollsForItems(parsedItems);
  const stats = rollStats(allRolls);

  const hasMultiPlyEligibleItems = parsedItems.some(isMultiPlyEligible);

  const resolvedPlies = ((): PlyLayer[] => {
    if (selectedPlyCombination && selectedPlyCombination.length > 0) {
      return scorePlyCombination(selectedPlyCombination, parsedItems, stockQuery || null).plies;
    } else if (rubberSpec && hasMultiPlyEligibleItems && stockQuery) {
      const combos = suggestPlyCombinations(rubberSpec.thicknessMm);
      const viableCombos = combos.filter((combo) =>
        combo.every((t) => stockQuery.availableThicknesses.includes(t)),
      );

      const candidates = (viableCombos.length > 0 ? viableCombos : combos).map((combo) =>
        scorePlyCombination(combo, parsedItems, stockQuery),
      );

      const best = candidates.sort((a, b) => b.score - a.score)[0];
      return best ? best.plies : [];
    }
    return [];
  })();

  const plies: PlyLayer[] =
    resolvedPlies.length > 0
      ? resolvedPlies
      : [
          {
            thicknessMm: rubberSpec?.thicknessMm || 0,
            rolls: allRolls,
            totalRollsNeeded: allRolls.length,
          },
        ];

  const isMultiPly = resolvedPlies.length > 1;

  const allOffcuts = allRolls.flatMap((roll) => roll.offcuts);

  return {
    rolls: allRolls,
    totalRollsNeeded: allRolls.length,
    totalWasteSqM: stats.totalWasteSqM,
    totalUsedSqM: stats.totalUsedSqM,
    wastePercentage: stats.wastePercentage,
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
