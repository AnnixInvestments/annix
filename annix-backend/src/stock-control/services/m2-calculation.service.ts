import { Injectable, Logger } from "@nestjs/common";
import { FlangeDimensionService } from "../../flange-dimension/flange-dimension.service";
import { NbOdLookupService } from "../../nb-od-lookup/nb-od-lookup.service";
import { NixItemParserService } from "../../nix/services/nix-item-parser.service";
import { PipeScheduleService } from "../../pipe-schedule/pipe-schedule.service";

export interface M2Result {
  description: string;
  totalM2: number | null;
  externalM2: number | null;
  internalM2: number | null;
  parsedDiameterMm: number | null;
  parsedLengthM: number | null;
  parsedFlangeConfig: string | null;
  parsedSchedule: string | null;
  parsedItemType: string | null;
  parsedWallThicknessMm: number | null;
  parsedBendAngle: number | null;
  parsedBendType: string | null;
  parsedFittingType: string | null;
  parsedFlangeCount: number;
  parsedPressureClass: string | null;
  parsedFlangeStandard: string | null;
  confidence: number;
  error: string | null;
}

interface RegexParseResult {
  diameterMm: number | null;
  lengthMm: number | null;
  flangeConfig: string | null;
  schedule: string | null;
  itemType: string | null;
  wallThicknessMm: number | null;
  bendAngle: number | null;
  bendType: string | null;
  fittingType: string | null;
  flangeCount: number;
  pressureClass: string | null;
  flangeStandard: string | null;
  fittingDimensionsA: number | null;
  fittingDimensionsB: number | null;
  cfDimensionMm: number | null;
  branchDiameterMm: number | null;
}

const REDUCING_NB_PATTERN = /(\d+)\s*x\s*(\d+)\s*NB/i;
const NB_PATTERN = /(\d+)\s*NB/i;
const NB_PREFIX_PATTERN = /\bNB\s*(\d+)/i;
const BARE_REDUCING_PATTERN = /^(\d{2,4})\s*x\s*\d{2,4}\b/;
const LG_PATTERN = /(\d+)\s*LG/i;
const LG_METERS_PATTERN = /(\d+\.\d+)\s*Lg\b/i;
const MM_PATTERN = /(\d+)\s*mm\b/i;
const LENGTH_M_PATTERN = /(\d+(?:\.\d+)?)\s*[Mm](?:\s|$)/;
const SCHEDULE_PATTERN = /\bSCH(?:EDULE)?\s*(\d+[SsHh]?)\b/i;
const BEND_ANGLE_PATTERN = /(?:(\d+)\s*x\s*)?(\d+)\s*[°deg]/i;
const BEND_RADIUS_PATTERN = /(\d+)\s*\/\s*(\d+)/;
const WALL_THICKNESS_DIRECT_PATTERN = /W\/T\s+(\d+(?:\.\d+)?)mm/i;
const WALL_THICKNESS_PARENS_PATTERN = /\bSCH(?:EDULE)?\s*\d+[SsHh]?\s*\((\d+(?:\.\d+)?)mm\)/i;
const BEND_ANGLE_DEGREES_PATTERN = /(\d+)°/;
const BEND_TYPE_PATTERN = /\b(\d+(?:\.\d+)?)\s*D\b/;
const CF_SINGLE_PATTERN = /C\/F\s+(\d+)mm/i;
const CF_SINGLE_NO_MM_PATTERN = /\bC\/F\s+(\d+)(?!\s*(?:mm|[Dd]))\b/i;
const CF_PAIR_PATTERN = /(\d+)\s*x\s*(\d+)\s*C\/F/i;
const FITTING_DIMS_PATTERN = /\((\d+)\s*x\s*(\d+)\)/;
const FITTING_DIMS_BARE_PATTERN = /\b(\d{3,5})\s*[xX]\s*(\d{3,5})\b(?!\s*NB)/i;
const BEND_CF_BARE_PATTERN = /(\d{3,})\s*x\s*(\d{3,})\s+(?:BEND|ELBOW)/i;
const FLANGE_STANDARD_ASME_PATTERN = /\bASME\s+B16\.5\s+(\d+)\b/i;
const FLANGE_STANDARD_SABS_PATTERN = /\bSABS\s+1123\s+(\d+(?:\/\d+)?)\b/i;
const FLANGE_STANDARD_BS_PATTERN = /\bBS\s+4504\s+PN(\d+)\b/i;
const FLANGE_SABS_BARE_CLASS_PATTERN = /\b(1000|1600|2500|4000)\s*\/\s*\d+\b/;
const FLANGE_CLASS_BARE_PATTERN = /\bCLASS\s+(\d+)\b/i;

const FLANGE_COUNT_PATTERNS: { pattern: RegExp; count: number }[] = [
  { pattern: /(\d+)\s*[Xx]\s*R\/F\s*,\s*(\d+)\s*[Xx]\s*L\/F/i, count: -1 },
  { pattern: /(\d+)\s*[Xx]\s*L\/F\s*,\s*(\d+)\s*[Xx]\s*R\/F/i, count: -1 },
  { pattern: /(\d+)\s*[Xx]\s*R\/F/i, count: -1 },
  { pattern: /(\d+)\s*[Xx]\s*L\/F/i, count: -1 },
  { pattern: /\bBLANK\s+FLANGE\b/i, count: 1 },
  { pattern: /\bBLIND\s+FLANGE\b/i, count: 1 },
  { pattern: /\bFBE\b/i, count: 2 },
  { pattern: /\bF2E\b/i, count: 2 },
  { pattern: /\bFFE\b/i, count: 2 },
  { pattern: /\bF(?:OE|1E)\b/i, count: 1 },
  { pattern: /\bFAE\b/i, count: 3 },
  { pattern: /\bPE\b/, count: 0 },
];

const FLANGE_CONFIG_PATTERNS: { pattern: RegExp; config: string }[] = [
  { pattern: /\bBLANK\s+FLANGE\b/i, config: "blank_flange" },
  { pattern: /\bBLIND\s+FLANGE\b/i, config: "blind_flange" },
  { pattern: /\bFBE\b/i, config: "both_ends" },
  { pattern: /\bF(?:OE|1E)\b/i, config: "one_end" },
  { pattern: /\bFFE\b/i, config: "both_ends" },
  { pattern: /\bF2E\b/i, config: "both_ends" },
  { pattern: /\bFAE\b/i, config: "all_ends" },
  { pattern: /\bL\/FLG\b/i, config: "loose_flange" },
  { pattern: /\bFLG[SD]?\s*(?:B(?:OTH)?|2)\s*(?:END|E)\b/i, config: "both_ends" },
  { pattern: /\bFLG[SD]?\s*(?:1|ONE)\s*(?:END|E)\b/i, config: "one_end" },
  { pattern: /\bPE\b/, config: "plain_ends" },
  { pattern: /\d+\s*[Xx]\s*R\/F/i, config: "rotating_flange" },
  { pattern: /\d+\s*[Xx]\s*L\/F/i, config: "loose_flange" },
];

const ITEM_TYPE_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /\bPIPE\b/i, type: "pipe" },
  { pattern: /\bBEND\b/i, type: "bend" },
  { pattern: /\bELBOW\b/i, type: "bend" },
  { pattern: /\bREDUCER\b/i, type: "reducer" },
  { pattern: /\bTEE\b/i, type: "tee" },
  { pattern: /\bT[- ]?PIECE\b/i, type: "tee" },
  { pattern: /\bLATERAL\b/i, type: "lateral" },
  { pattern: /\bFLANGE\b/i, type: "flange" },
  { pattern: /\bOFFSET\b/i, type: "offset" },
  { pattern: /\bVALVE\b/i, type: "valve" },
];

const FITTING_TYPE_PATTERNS: { pattern: RegExp; fittingType: string }[] = [
  { pattern: /\bEQUAL\s+TEE\b/i, fittingType: "equal_tee" },
  { pattern: /\bUNEQUAL\s+TEE\b/i, fittingType: "unequal_tee" },
  { pattern: /\bRED(?:UCING)?[\s/]+TEE\b/i, fittingType: "reducing_tee" },
  { pattern: /\bCONCENTRIC\s+REDUCER\b/i, fittingType: "concentric_reducer" },
  { pattern: /\bECCENTRIC\s+REDUCER\b/i, fittingType: "eccentric_reducer" },
  { pattern: /\bREDUCER\b/i, fittingType: "reducer" },
  { pattern: /\bLATERAL\b/i, fittingType: "lateral" },
  { pattern: /\bSHORT\s+EQUAL\s+TEE\b/i, fittingType: "equal_tee" },
  { pattern: /\bLONG\s+EQUAL\s+TEE\b/i, fittingType: "equal_tee" },
  { pattern: /\bTEE\b/i, fittingType: "equal_tee" },
];

const FLANGE_OVERLAP_ALLOWANCE_MM = 100;
const STEINMETZ_FACTOR_EQUAL_TEE = 2.7;

@Injectable()
export class M2CalculationService {
  private readonly logger = new Logger(M2CalculationService.name);

  constructor(
    private readonly nixItemParser: NixItemParserService,
    private readonly nbOdLookup: NbOdLookupService,
    private readonly pipeSchedule: PipeScheduleService,
    private readonly flangeDimension: FlangeDimensionService,
  ) {}

  async calculateM2ForItems(descriptions: string[]): Promise<M2Result[]> {
    return Promise.all(descriptions.map((desc) => this.calculateSingle(desc)));
  }

  private regexParse(description: string): RegexParseResult {
    const reducingMatch = description.match(REDUCING_NB_PATTERN);
    const nbMatch = description.match(NB_PATTERN);
    const nbPrefixMatch = description.match(NB_PREFIX_PATTERN);
    const bareReducingMatch = description.match(BARE_REDUCING_PATTERN);
    const diameterMm = reducingMatch
      ? parseInt(reducingMatch[1], 10)
      : nbMatch
        ? parseInt(nbMatch[1], 10)
        : nbPrefixMatch
          ? parseInt(nbPrefixMatch[1], 10)
          : bareReducingMatch
            ? parseInt(bareReducingMatch[1], 10)
            : null;

    const branchDiameterMm = reducingMatch ? parseInt(reducingMatch[2], 10) : null;

    const itemType = ITEM_TYPE_PATTERNS.find((it) => it.pattern.test(description))?.type ?? null;

    const bendAngle = this.parseBendAngleDegrees(description);
    const bendType = this.parseBendRadiusType(description);
    const cfDimensionMm = this.parseCfDimension(description);

    let lengthMm: number | null = null;

    if (itemType === "bend" || itemType === "offset") {
      if (cfDimensionMm) {
        const isSingleCf =
          !CF_PAIR_PATTERN.test(description) && !BEND_CF_BARE_PATTERN.test(description);
        lengthMm = isSingleCf ? cfDimensionMm * 2 : cfDimensionMm;
      } else {
        lengthMm = this.parseBendArcLength(description);
      }
    }

    if (lengthMm === null) {
      const lgMetersMatch = description.match(LG_METERS_PATTERN);
      const lgMatch = description.match(LG_PATTERN);
      const mmMatch = description.match(MM_PATTERN);
      const mMatch = description.match(LENGTH_M_PATTERN);

      if (lgMetersMatch) {
        lengthMm = Math.round(parseFloat(lgMetersMatch[1]) * 1000);
      } else if (lgMatch) {
        lengthMm = parseInt(lgMatch[1], 10);
      } else if (mmMatch) {
        lengthMm = parseInt(mmMatch[1], 10);
      } else if (mMatch) {
        lengthMm = parseFloat(mMatch[1]) * 1000;
      }
    }

    if (itemType === "reducer" && cfDimensionMm && lengthMm === null) {
      lengthMm = 2 * cfDimensionMm;
    }

    if (itemType === "tee" && cfDimensionMm && lengthMm === null) {
      const isSingleCfTee =
        !CF_PAIR_PATTERN.test(description) && !BEND_CF_BARE_PATTERN.test(description);
      lengthMm = isSingleCfTee ? cfDimensionMm * 3 : cfDimensionMm;
    }

    const schedMatch = description.match(SCHEDULE_PATTERN);
    const schedule = schedMatch ? `Sch ${schedMatch[1]}` : null;

    const flangeConfig =
      FLANGE_CONFIG_PATTERNS.find((fp) => fp.pattern.test(description))?.config ?? null;

    const wallThicknessMm = this.parseWallThickness(description);
    const fittingType = this.parseFittingType(description);
    const flangeCount = this.parseFlangeCount(description);
    const { standard: flangeStandard, pressureClass } =
      this.parseFlangeStandardAndClass(description);
    const { a: fittingDimensionsA, b: fittingDimensionsB } =
      this.parseFittingDimensions(description);

    return {
      diameterMm,
      lengthMm,
      flangeConfig,
      schedule,
      itemType,
      wallThicknessMm,
      bendAngle,
      bendType,
      fittingType,
      flangeCount,
      pressureClass,
      flangeStandard,
      fittingDimensionsA,
      fittingDimensionsB,
      cfDimensionMm,
      branchDiameterMm,
    };
  }

  private parseWallThickness(description: string): number | null {
    const directMatch = description.match(WALL_THICKNESS_DIRECT_PATTERN);
    if (directMatch) {
      return parseFloat(directMatch[1]);
    }

    const parensMatch = description.match(WALL_THICKNESS_PARENS_PATTERN);
    if (parensMatch) {
      return parseFloat(parensMatch[1]);
    }

    return null;
  }

  private parseBendAngleDegrees(description: string): number | null {
    const match = description.match(BEND_ANGLE_DEGREES_PATTERN);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  private parseBendRadiusType(description: string): string | null {
    const match = description.match(BEND_TYPE_PATTERN);
    if (match) {
      return `${match[1]}D`;
    }
    return null;
  }

  private parseCfDimension(description: string): number | null {
    const singleMatch = description.match(CF_SINGLE_PATTERN);
    if (singleMatch) {
      return parseInt(singleMatch[1], 10);
    }

    const singleNoMmMatch = description.match(CF_SINGLE_NO_MM_PATTERN);
    if (singleNoMmMatch) {
      return parseInt(singleNoMmMatch[1], 10);
    }

    const pairMatch = description.match(CF_PAIR_PATTERN);
    if (pairMatch) {
      return parseInt(pairMatch[1], 10) + parseInt(pairMatch[2], 10);
    }

    const bareMatch = description.match(BEND_CF_BARE_PATTERN);
    if (bareMatch) {
      return parseInt(bareMatch[1], 10) + parseInt(bareMatch[2], 10);
    }

    return null;
  }

  private parseFittingType(description: string): string | null {
    return FITTING_TYPE_PATTERNS.find((fp) => fp.pattern.test(description))?.fittingType ?? null;
  }

  private parseFlangeCount(description: string): number {
    const comboMatch =
      description.match(FLANGE_COUNT_PATTERNS[0].pattern) ||
      description.match(FLANGE_COUNT_PATTERNS[1].pattern);
    if (comboMatch) {
      return parseInt(comboMatch[1], 10) + parseInt(comboMatch[2], 10);
    }

    const rfMatch = description.match(FLANGE_COUNT_PATTERNS[2].pattern);
    if (rfMatch) {
      const lfMatch = description.match(FLANGE_COUNT_PATTERNS[3].pattern);
      const rfCount = parseInt(rfMatch[1], 10);
      const lfCount = lfMatch ? parseInt(lfMatch[1], 10) : 0;
      return rfCount + lfCount;
    }

    const lfOnly = description.match(FLANGE_COUNT_PATTERNS[3].pattern);
    if (lfOnly) {
      return parseInt(lfOnly[1], 10);
    }

    const fixedCount = FLANGE_COUNT_PATTERNS.slice(4).find((fp) => fp.pattern.test(description));
    if (fixedCount) {
      return fixedCount.count;
    }

    return 0;
  }

  private parseFlangeStandardAndClass(description: string): {
    standard: string | null;
    pressureClass: string | null;
  } {
    const asmeMatch = description.match(FLANGE_STANDARD_ASME_PATTERN);
    if (asmeMatch) {
      return { standard: "ASME B16.5", pressureClass: asmeMatch[1] };
    }

    const sabsMatch = description.match(FLANGE_STANDARD_SABS_PATTERN);
    if (sabsMatch) {
      return { standard: "SABS 1123", pressureClass: sabsMatch[1] };
    }

    const bsMatch = description.match(FLANGE_STANDARD_BS_PATTERN);
    if (bsMatch) {
      return { standard: "BS 4504", pressureClass: `PN${bsMatch[1]}` };
    }

    const sabsBareMatch = description.match(FLANGE_SABS_BARE_CLASS_PATTERN);
    if (sabsBareMatch) {
      return { standard: "SABS 1123", pressureClass: sabsBareMatch[1] };
    }

    const classBareMatch = description.match(FLANGE_CLASS_BARE_PATTERN);
    if (classBareMatch) {
      return { standard: null, pressureClass: classBareMatch[1] };
    }

    return { standard: null, pressureClass: null };
  }

  private parseFittingDimensions(description: string): {
    a: number | null;
    b: number | null;
  } {
    const match = description.match(FITTING_DIMS_PATTERN);
    if (match) {
      return { a: parseInt(match[1], 10), b: parseInt(match[2], 10) };
    }

    const bareMatch = description.match(FITTING_DIMS_BARE_PATTERN);
    if (bareMatch) {
      return { a: parseInt(bareMatch[1], 10), b: parseInt(bareMatch[2], 10) };
    }

    return { a: null, b: null };
  }

  private parseBendArcLength(description: string): number | null {
    const angleMatch = description.match(BEND_ANGLE_PATTERN);
    if (!angleMatch) {
      return null;
    }

    const multiplier = angleMatch[1] ? parseInt(angleMatch[1], 10) : 1;
    const angleDegrees = parseInt(angleMatch[2], 10);

    const radiusMatch = description.match(BEND_RADIUS_PATTERN);
    if (!radiusMatch) {
      return null;
    }

    const bendRadiusMm = parseInt(radiusMatch[1], 10);
    const arcLengthMm = multiplier * (angleDegrees / 360) * 2 * Math.PI * bendRadiusMm;
    return Math.round(arcLengthMm);
  }

  private calculateBendM2(
    odMm: number,
    idMm: number,
    bendAngle: number,
    bendMultiplier: number,
    nbMm: number,
    cfTotalMm: number | null,
  ): { external: number; internal: number } {
    let totalLengthM: number;
    if (cfTotalMm !== null) {
      totalLengthM = cfTotalMm / 1000;
    } else {
      const bendRadiusMm = bendMultiplier * nbMm;
      totalLengthM = ((bendAngle / 360) * 2 * Math.PI * bendRadiusMm) / 1000;
    }

    return {
      external: Math.PI * (odMm / 1000) * totalLengthM,
      internal: Math.PI * (idMm / 1000) * totalLengthM,
    };
  }

  private calculateTeeM2(
    odMm: number,
    idMm: number,
    fittingType: string | null,
    dimA: number | null,
    dimB: number | null,
    branchOdMm: number | null,
    branchIdMm: number | null,
  ): { external: number; internal: number } {
    const armA = dimA ? dimA / 1000 : odMm / 1000;
    const armB = dimB ? dimB / 1000 : odMm / 1000;

    const mainRunExternal = Math.PI * (odMm / 1000) * (armA + armB);
    const mainRunInternal = Math.PI * (idMm / 1000) * (armA + armB);

    const isReducing = fittingType === "unequal_tee" || fittingType === "reducing_tee";
    const effectiveBranchOd = isReducing && branchOdMm ? branchOdMm : odMm;
    const effectiveBranchId = isReducing && branchIdMm ? branchIdMm : idMm;

    const branchLengthM = dimB ? dimB / 1000 : effectiveBranchOd / 1000;
    let branchExternal: number;
    let branchInternal: number;

    if (isReducing && branchOdMm) {
      branchExternal = Math.PI * (effectiveBranchOd / 1000) * branchLengthM;
      branchInternal = Math.PI * (effectiveBranchId / 1000) * branchLengthM;
    } else {
      const branchFactor = isReducing ? 2.0 : STEINMETZ_FACTOR_EQUAL_TEE;
      branchExternal = (branchFactor * (odMm / 1000) * (odMm / 1000)) / 4;
      branchInternal = (branchFactor * (idMm / 1000) * (idMm / 1000)) / 4;
    }

    return {
      external: mainRunExternal + branchExternal,
      internal: mainRunInternal + branchInternal,
    };
  }

  private calculateReducerM2(
    odMm: number,
    idMm: number,
    lengthM: number,
    smallEndOdMm: number | null,
    smallEndIdMm: number | null,
  ): { external: number; internal: number } {
    const smallEndOd = smallEndOdMm || odMm * 0.7;
    const smallEndId = smallEndIdMm || idMm * 0.7;
    const avgOd = (odMm + smallEndOd) / 2;
    const avgId = (idMm + smallEndId) / 2;

    return {
      external: Math.PI * (avgOd / 1000) * lengthM,
      internal: Math.PI * (avgId / 1000) * lengthM,
    };
  }

  private async calculateFlangeAreaM2(
    odMm: number,
    idMm: number,
    nbMm: number,
    flangeCount: number,
    flangeStandard: string | null,
    pressureClass: string | null,
  ): Promise<{ external: number; internal: number }> {
    if (flangeCount === 0) {
      return { external: 0, internal: 0 };
    }

    const dims = await this.flangeDimension.flangeDimensionsForM2(
      nbMm,
      flangeStandard,
      pressureClass,
    );

    if (dims) {
      const flangeOdMm = dims.D;
      const flangeBoreMm = dims.d4;
      const flangeThicknessMm = dims.b;

      const backAnnularArea = (Math.PI / 4) * (flangeOdMm ** 2 - odMm ** 2);
      const faceAnnularArea = (Math.PI / 4) * (flangeOdMm ** 2 - flangeBoreMm ** 2);
      const boreInternal = Math.PI * (flangeBoreMm / 1000) * (flangeThicknessMm / 1000);

      const externalPerFlange = backAnnularArea / 1_000_000;
      const internalPerFlange = faceAnnularArea / 1_000_000 + boreInternal;

      return {
        external: externalPerFlange * flangeCount,
        internal: internalPerFlange * flangeCount,
      };
    }

    this.logger.warn(
      `No flange dimensions found for NB ${nbMm}mm, falling back to overlap allowance`,
    );
    const overlapExternal = Math.PI * (odMm / 1000) * (FLANGE_OVERLAP_ALLOWANCE_MM / 1000);
    const overlapInternal = Math.PI * (idMm / 1000) * (FLANGE_OVERLAP_ALLOWANCE_MM / 1000);

    return {
      external: overlapExternal * flangeCount,
      internal: overlapInternal * flangeCount,
    };
  }

  private async calculateStandaloneFlangeM2(
    nbMm: number,
    flangeCount: number,
    flangeStandard: string | null,
    pressureClass: string | null,
    flangeConfig: string | null,
  ): Promise<{ external: number; internal: number } | null> {
    if (flangeCount === 0) {
      return null;
    }

    const isBlind = flangeConfig === "blank_flange" || flangeConfig === "blind_flange";

    const dims = await this.flangeDimension.flangeDimensionsForM2(
      nbMm,
      flangeStandard,
      pressureClass,
    );

    let flangeOdMm: number;
    let flangeBoreMm: number;
    let flangeThicknessMm: number;

    if (dims) {
      flangeOdMm = dims.D;
      flangeBoreMm = isBlind ? 0 : dims.d4;
      flangeThicknessMm = dims.b;
    } else {
      const odResult = await this.nbOdLookup.nbToOd(nbMm);
      const pipeOdMm = odResult.outsideDiameterMm;
      flangeOdMm = pipeOdMm + (nbMm <= 150 ? 80 : 120);
      flangeBoreMm = isBlind ? 0 : pipeOdMm;
      flangeThicknessMm = nbMm <= 150 ? 18 : 25;

      this.logger.warn(
        `No flange dimensions for NB ${nbMm}mm, estimating from pipe OD ${pipeOdMm}mm`,
      );
    }

    const faceArea = ((Math.PI / 4) * (flangeOdMm ** 2 - flangeBoreMm ** 2)) / 1_000_000;
    const edgeArea = Math.PI * (flangeOdMm / 1000) * (flangeThicknessMm / 1000);

    return {
      external: (faceArea + edgeArea) * flangeCount,
      internal: faceArea * flangeCount,
    };
  }

  private async resolveWallThickness(
    parsedWt: number | null,
    schedule: string | null,
    diameterMm: number,
  ): Promise<number> {
    if (parsedWt !== null && parsedWt > 0) {
      return parsedWt;
    }

    if (schedule) {
      const schedules = await this.pipeSchedule.getSchedulesByNbMm(diameterMm);
      const normalizedSchedule = schedule.replace(/\s+/g, "").toLowerCase();
      const matched = schedules.find(
        (s) => s.schedule.replace(/\s+/g, "").toLowerCase() === normalizedSchedule,
      );
      if (matched) {
        return Number(matched.wallThicknessMm);
      }
    }

    const schedules = await this.pipeSchedule.getSchedulesByNbMm(diameterMm);
    const std = schedules.find((s) => s.schedule.toLowerCase() === "std" || s.schedule === "40");
    if (std) {
      return Number(std.wallThicknessMm);
    }

    return 0;
  }

  private emptyResult(description: string): M2Result {
    return {
      description,
      totalM2: null,
      externalM2: null,
      internalM2: null,
      parsedDiameterMm: null,
      parsedLengthM: null,
      parsedFlangeConfig: null,
      parsedSchedule: null,
      parsedItemType: null,
      parsedWallThicknessMm: null,
      parsedBendAngle: null,
      parsedBendType: null,
      parsedFittingType: null,
      parsedFlangeCount: 0,
      parsedPressureClass: null,
      parsedFlangeStandard: null,
      confidence: 0,
      error: null,
    };
  }

  private async calculateSingle(description: string): Promise<M2Result> {
    try {
      const regex = this.regexParse(description);

      let diameterMm = regex.diameterMm;
      let lengthMm = regex.lengthMm;
      let flangeConfig = regex.flangeConfig;
      let schedule = regex.schedule;
      let itemType = regex.itemType;
      let confidence = diameterMm && lengthMm ? 0.9 : 0.5;

      if (!diameterMm || !lengthMm) {
        try {
          const parsed = await this.nixItemParser.parseUserIntent(description);
          confidence = parsed.confidence;

          if (!diameterMm && parsed.specifications?.diameter) {
            diameterMm = parsed.specifications.diameter;
          }
          if (!lengthMm && parsed.specifications?.length) {
            lengthMm = parsed.specifications.length * 1000;
          }
          if (!flangeConfig && parsed.specifications?.flangeConfig) {
            flangeConfig = parsed.specifications.flangeConfig;
          }
          if (!schedule && parsed.specifications?.schedule) {
            schedule = parsed.specifications.schedule;
          }
          if (!itemType && parsed.itemType) {
            itemType = parsed.itemType;
          }
        } catch (aiErr) {
          this.logger.warn(
            `AI parser failed for "${description}": ${aiErr instanceof Error ? aiErr.message : "unknown"}`,
          );
        }
      }

      const lengthM = lengthMm ? lengthMm / 1000 : null;
      const needsLength = itemType !== "tee" && itemType !== "lateral" && itemType !== "flange";

      if (!diameterMm || (needsLength && !lengthM)) {
        const errorMsg =
          !diameterMm && !lengthM && needsLength
            ? "Could not parse diameter or length"
            : !diameterMm
              ? "Could not parse diameter"
              : "Could not parse length";

        return {
          ...this.emptyResult(description),
          parsedDiameterMm: diameterMm,
          parsedLengthM: lengthM,
          parsedFlangeConfig: flangeConfig,
          parsedSchedule: schedule,
          parsedItemType: itemType,
          parsedWallThicknessMm: regex.wallThicknessMm,
          parsedBendAngle: regex.bendAngle,
          parsedBendType: regex.bendType,
          parsedFittingType: regex.fittingType,
          parsedFlangeCount: regex.flangeCount,
          parsedPressureClass: regex.pressureClass,
          parsedFlangeStandard: regex.flangeStandard,
          confidence,
          error: errorMsg,
        };
      }

      const odResult = await this.nbOdLookup.nbToOd(diameterMm);
      const odMm = odResult.outsideDiameterMm;

      const wallThicknessMm = await this.resolveWallThickness(
        regex.wallThicknessMm,
        schedule,
        diameterMm,
      );

      const idMm = wallThicknessMm > 0 ? odMm - 2 * wallThicknessMm : odMm * 0.9;

      let externalM2 = 0;
      let internalM2 = 0;

      if (itemType === "bend" || (itemType === "offset" && regex.bendAngle && regex.bendType)) {
        const bendMultiplier = parseFloat(regex.bendType?.replace("D", "") || "1.5");
        const isSingleCf =
          regex.cfDimensionMm !== null &&
          !CF_PAIR_PATTERN.test(description) &&
          !BEND_CF_BARE_PATTERN.test(description);
        let cfTotalMm: number | null = null;
        if (regex.cfDimensionMm !== null) {
          cfTotalMm = isSingleCf ? regex.cfDimensionMm * 2 : regex.cfDimensionMm;
        } else if (regex.fittingDimensionsA !== null && regex.fittingDimensionsB !== null) {
          cfTotalMm = regex.fittingDimensionsA + regex.fittingDimensionsB;
        }
        const bendResult = this.calculateBendM2(
          odMm,
          idMm,
          regex.bendAngle || 90,
          bendMultiplier,
          diameterMm,
          cfTotalMm,
        );
        externalM2 = bendResult.external;
        internalM2 = bendResult.internal;
      } else if (itemType === "tee" || itemType === "lateral") {
        const isSingleCfTee =
          regex.cfDimensionMm !== null &&
          !CF_PAIR_PATTERN.test(description) &&
          !BEND_CF_BARE_PATTERN.test(description);
        const dimA = regex.fittingDimensionsA || (isSingleCfTee ? regex.cfDimensionMm! * 2 : null);
        const dimB = regex.fittingDimensionsB || (isSingleCfTee ? regex.cfDimensionMm! : null);

        let branchOdMm: number | null = null;
        let branchIdMm: number | null = null;
        if (regex.branchDiameterMm) {
          const branchOdResult = await this.nbOdLookup.nbToOd(regex.branchDiameterMm);
          branchOdMm = branchOdResult.outsideDiameterMm;
          const branchWt = await this.resolveWallThickness(null, schedule, regex.branchDiameterMm);
          branchIdMm = branchWt > 0 ? branchOdMm - 2 * branchWt : branchOdMm * 0.9;
        }

        const teeResult = this.calculateTeeM2(
          odMm,
          idMm,
          regex.fittingType,
          dimA,
          dimB,
          branchOdMm,
          branchIdMm,
        );
        externalM2 = teeResult.external;
        internalM2 = teeResult.internal;
      } else if (itemType === "reducer") {
        let smallEndOdMm: number | null = null;
        let smallEndIdMm: number | null = null;
        if (regex.branchDiameterMm) {
          const branchOdResult = await this.nbOdLookup.nbToOd(regex.branchDiameterMm);
          smallEndOdMm = branchOdResult.outsideDiameterMm;
          const branchWt = await this.resolveWallThickness(null, schedule, regex.branchDiameterMm);
          smallEndIdMm = branchWt > 0 ? smallEndOdMm - 2 * branchWt : smallEndOdMm * 0.9;
        }
        const reducerResult = this.calculateReducerM2(
          odMm,
          idMm,
          lengthM || 0,
          smallEndOdMm,
          smallEndIdMm,
        );
        externalM2 = reducerResult.external;
        internalM2 = reducerResult.internal;
      } else if (itemType === "flange" && regex.flangeCount > 0) {
        const standaloneResult = await this.calculateStandaloneFlangeM2(
          diameterMm,
          regex.flangeCount,
          regex.flangeStandard,
          regex.pressureClass,
          regex.flangeConfig,
        );
        if (standaloneResult) {
          externalM2 = standaloneResult.external;
          internalM2 = standaloneResult.internal;
        }
      } else {
        externalM2 = Math.PI * (odMm / 1000) * (lengthM || 0);
        internalM2 = Math.PI * (idMm / 1000) * (lengthM || 0);
      }

      if (itemType !== "flange" || regex.flangeCount === 0) {
        const flangeArea = await this.calculateFlangeAreaM2(
          odMm,
          idMm,
          diameterMm,
          regex.flangeCount,
          regex.flangeStandard,
          regex.pressureClass,
        );
        externalM2 += flangeArea.external;
        internalM2 += flangeArea.internal;
      }

      if (itemType === "lateral") {
        const unFlangedEnds = Math.max(3 - regex.flangeCount, 0);
        if (unFlangedEnds > 0) {
          const allowanceM = FLANGE_OVERLAP_ALLOWANCE_MM / 1000;
          externalM2 += unFlangedEnds * Math.PI * (odMm / 1000) * allowanceM;
          internalM2 += unFlangedEnds * Math.PI * (idMm / 1000) * allowanceM;
        }
      }

      const totalM2 = externalM2 + internalM2;

      return {
        description,
        totalM2: Math.round(totalM2 * 10000) / 10000,
        externalM2: Math.round(externalM2 * 10000) / 10000,
        internalM2: Math.round(internalM2 * 10000) / 10000,
        parsedDiameterMm: diameterMm,
        parsedLengthM: lengthM,
        parsedFlangeConfig: flangeConfig,
        parsedSchedule: schedule,
        parsedItemType: itemType,
        parsedWallThicknessMm: regex.wallThicknessMm,
        parsedBendAngle: regex.bendAngle,
        parsedBendType: regex.bendType,
        parsedFittingType: regex.fittingType,
        parsedFlangeCount: regex.flangeCount,
        parsedPressureClass: regex.pressureClass,
        parsedFlangeStandard: regex.flangeStandard,
        confidence,
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Failed to calculate m2 for "${description}": ${message}`);
      return {
        ...this.emptyResult(description),
        error: message,
      };
    }
  }
}
