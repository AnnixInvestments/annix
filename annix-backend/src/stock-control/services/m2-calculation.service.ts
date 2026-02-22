import { Injectable, Logger } from "@nestjs/common";
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
  confidence: number;
  error: string | null;
}

interface RegexParseResult {
  diameterMm: number | null;
  lengthMm: number | null;
  flangeConfig: string | null;
  schedule: string | null;
  itemType: string | null;
}

const NB_PATTERN = /(\d+)\s*NB/i;
const LG_PATTERN = /(\d+)\s*LG/i;
const MM_PATTERN = /(\d+)\s*mm\b/i;
const LENGTH_M_PATTERN = /(\d+(?:\.\d+)?)\s*[Mm](?:\s|$)/;
const SCHEDULE_PATTERN = /\bSCH(?:EDULE)?\s*(\d+[SsHh]?)\b/i;
const BEND_ANGLE_PATTERN = /(?:(\d+)\s*x\s*)?(\d+)\s*[°deg]/i;
const BEND_RADIUS_PATTERN = /(\d+)\s*\/\s*(\d+)/;

const FLANGE_PATTERNS: { pattern: RegExp; config: string }[] = [
  { pattern: /\bFBE\b/i, config: "both_ends" },
  { pattern: /\bF(?:OE|1E)\b/i, config: "one_end" },
  { pattern: /\bFFE\b/i, config: "both_ends" },
  { pattern: /\bL\/FLG\b/i, config: "loose_flange" },
  { pattern: /\bFLG[SD]?\s*(?:B(?:OTH)?|2)\s*(?:END|E)\b/i, config: "both_ends" },
  { pattern: /\bFLG[SD]?\s*(?:1|ONE)\s*(?:END|E)\b/i, config: "one_end" },
  { pattern: /\bPE\b/, config: "plain_ends" },
];

const ITEM_TYPE_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /\bPIPE\b/i, type: "pipe" },
  { pattern: /\bBEND\b/i, type: "bend" },
  { pattern: /\bELBOW\b/i, type: "bend" },
  { pattern: /\bREDUCER\b/i, type: "reducer" },
  { pattern: /\bTEE\b/i, type: "tee" },
  { pattern: /\bFLANGE\b/i, type: "flange" },
  { pattern: /\bOFFSET\b/i, type: "offset" },
  { pattern: /\bVALVE\b/i, type: "valve" },
];

@Injectable()
export class M2CalculationService {
  private readonly logger = new Logger(M2CalculationService.name);

  constructor(
    private readonly nixItemParser: NixItemParserService,
    private readonly nbOdLookup: NbOdLookupService,
    private readonly pipeSchedule: PipeScheduleService,
  ) {}

  async calculateM2ForItems(descriptions: string[]): Promise<M2Result[]> {
    return Promise.all(descriptions.map((desc) => this.calculateSingle(desc)));
  }

  private regexParse(description: string): RegexParseResult {
    const nbMatch = description.match(NB_PATTERN);
    const diameterMm = nbMatch ? parseInt(nbMatch[1], 10) : null;

    const itemType = ITEM_TYPE_PATTERNS.find((it) => it.pattern.test(description))?.type ?? null;

    let lengthMm: number | null = null;

    if (itemType === "bend" || itemType === "offset") {
      lengthMm = this.parseBendArcLength(description);
    }

    if (lengthMm === null) {
      const lgMatch = description.match(LG_PATTERN);
      const mmMatch = description.match(MM_PATTERN);
      const mMatch = description.match(LENGTH_M_PATTERN);
      lengthMm = lgMatch
        ? parseInt(lgMatch[1], 10)
        : mmMatch
          ? parseInt(mmMatch[1], 10)
          : mMatch
            ? parseFloat(mMatch[1]) * 1000
            : null;
    }

    const schedMatch = description.match(SCHEDULE_PATTERN);
    const schedule = schedMatch ? `Sch ${schedMatch[1]}` : null;

    const flangeConfig = FLANGE_PATTERNS.find((fp) => fp.pattern.test(description))?.config ?? null;

    return { diameterMm, lengthMm, flangeConfig, schedule, itemType };
  }

  private parseBendArcLength(description: string): number | null {
    const angleMatch = description.match(BEND_ANGLE_PATTERN);
    if (!angleMatch) return null;

    const multiplier = angleMatch[1] ? parseInt(angleMatch[1], 10) : 1;
    const angleDegrees = parseInt(angleMatch[2], 10);

    const radiusMatch = description.match(BEND_RADIUS_PATTERN);
    if (!radiusMatch) return null;

    const bendRadiusMm = parseInt(radiusMatch[1], 10);
    const arcLengthMm = multiplier * (angleDegrees / 360) * 2 * Math.PI * bendRadiusMm;
    return Math.round(arcLengthMm);
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

      if (!diameterMm || !lengthM) {
        return {
          description,
          totalM2: null,
          externalM2: null,
          internalM2: null,
          parsedDiameterMm: diameterMm,
          parsedLengthM: lengthM,
          parsedFlangeConfig: flangeConfig,
          parsedSchedule: schedule,
          parsedItemType: itemType,
          confidence,
          error:
            !diameterMm && !lengthM
              ? "Could not parse diameter or length"
              : !diameterMm
                ? "Could not parse diameter"
                : "Could not parse length",
        };
      }

      const odResult = await this.nbOdLookup.nbToOd(diameterMm);
      const odMm = odResult.outsideDiameterMm;

      let wallThicknessMm = 0;
      if (schedule) {
        const schedules = await this.pipeSchedule.getSchedulesByNbMm(diameterMm);
        const normalizedSchedule = schedule.replace(/\s+/g, "").toLowerCase();
        const matched = schedules.find(
          (s) => s.schedule.replace(/\s+/g, "").toLowerCase() === normalizedSchedule,
        );
        if (matched) {
          wallThicknessMm = Number(matched.wallThicknessMm);
        }
      }

      if (wallThicknessMm === 0) {
        const schedules = await this.pipeSchedule.getSchedulesByNbMm(diameterMm);
        const std = schedules.find(
          (s) => s.schedule.toLowerCase() === "std" || s.schedule === "40",
        );
        if (std) {
          wallThicknessMm = Number(std.wallThicknessMm);
        }
      }

      const idMm = wallThicknessMm > 0 ? odMm - 2 * wallThicknessMm : odMm * 0.9;
      const externalM2 = Math.PI * (odMm / 1000) * lengthM;
      const internalM2 = Math.PI * (idMm / 1000) * lengthM;
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
        confidence,
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Failed to calculate m2 for "${description}": ${message}`);
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
        confidence: 0,
        error: message,
      };
    }
  }
}
