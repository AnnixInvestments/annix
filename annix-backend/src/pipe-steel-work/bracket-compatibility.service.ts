import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  BracketCompatibilityResponseDto,
  BracketTypeResponseDto,
  CalculateSupportSpacingDto,
  SupportSpacingResponseDto,
  ValidateBracketCompatibilityDto,
  ValidationIssue,
} from "./dto/pipe-steel-work.dto";
import { BracketDimensionBySizeEntity } from "./entities/bracket-dimension-by-size.entity";
import {
  estimatePipeWeightPerMeter,
  findClosestNb,
  interpolateSpacing,
  SUPPORT_SPACING_TABLE,
} from "./pipe-steel-work-data";

@Injectable()
export class BracketCompatibilityService {
  private readonly STEEL_DENSITY_KG_M3 = 7850;

  constructor(
    @InjectRepository(BracketDimensionBySizeEntity)
    private readonly bracketDimensionRepo: Repository<BracketDimensionBySizeEntity>,
  ) {}

  async dimension(
    bracketTypeCode: string,
    nbMm: number,
  ): Promise<BracketDimensionBySizeEntity | null> {
    return this.bracketDimensionRepo.findOne({
      where: { bracketTypeCode, nbMm },
    });
  }

  async dimensionsForType(bracketTypeCode: string): Promise<BracketDimensionBySizeEntity[]> {
    return this.bracketDimensionRepo.find({
      where: { bracketTypeCode },
      order: { nbMm: "ASC" },
    });
  }

  async types(nominalDiameterMm?: number): Promise<BracketTypeResponseDto[]> {
    const defaultBrackets: BracketTypeResponseDto[] = [
      {
        typeCode: "CLEVIS_HANGER",
        displayName: "Clevis Hanger",
        description: "For suspended pipelines, allows slight movement",
        isSuitable: true,
        baseCostPerUnit: 150,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: "THREE_BOLT_CLAMP",
        displayName: "Three-Bolt Pipe Clamp",
        description: "Heavy-duty support for larger pipes",
        isSuitable: nominalDiameterMm ? nominalDiameterMm >= 100 : true,
        baseCostPerUnit: 250,
        allowsExpansion: false,
        isAnchorType: false,
      },
      {
        typeCode: "WELDED_BRACKET",
        displayName: "Welded Bracket",
        description: "Fixed support welded to structure",
        isSuitable: true,
        baseCostPerUnit: 180,
        allowsExpansion: false,
        isAnchorType: true,
      },
      {
        typeCode: "PIPE_SADDLE",
        displayName: "Pipe Saddle",
        description: "Base-mounted support with curved cradle",
        isSuitable: nominalDiameterMm ? nominalDiameterMm >= 150 : true,
        baseCostPerUnit: 280,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: "U_BOLT",
        displayName: "U-Bolt Clamp",
        description: "Simple, economical support for smaller pipes",
        isSuitable: nominalDiameterMm ? nominalDiameterMm <= 150 : true,
        baseCostPerUnit: 80,
        allowsExpansion: false,
        isAnchorType: false,
      },
      {
        typeCode: "ROLLER_SUPPORT",
        displayName: "Roller Support",
        description: "Allows axial thermal expansion movement",
        isSuitable: true,
        baseCostPerUnit: 450,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: "SLIDE_PLATE",
        displayName: "Slide Plate",
        description: "Low-friction support for thermal expansion",
        isSuitable: nominalDiameterMm ? nominalDiameterMm >= 200 : true,
        baseCostPerUnit: 350,
        allowsExpansion: true,
        isAnchorType: false,
      },
    ];

    return defaultBrackets;
  }

  async validateCompatibility(
    dto: ValidateBracketCompatibilityDto,
  ): Promise<BracketCompatibilityResponseDto> {
    const issues: ValidationIssue[] = [];
    const {
      bracketTypeCode,
      nominalDiameterMm,
      pipelineLengthM,
      schedule,
      isWaterFilled,
      expectedExpansionMm,
    } = dto;

    const bracketSizeRanges: Record<string, { min: number; max: number }> = {
      CLEVIS_HANGER: { min: 15, max: 600 },
      THREE_BOLT_CLAMP: { min: 100, max: 600 },
      WELDED_BRACKET: { min: 15, max: 600 },
      PIPE_SADDLE: { min: 150, max: 900 },
      U_BOLT: { min: 15, max: 150 },
      ROLLER_SUPPORT: { min: 15, max: 600 },
      SLIDE_PLATE: { min: 200, max: 600 },
      BAND_HANGER: { min: 15, max: 100 },
      SPRING_HANGER: { min: 50, max: 600 },
      RISER_CLAMP: { min: 25, max: 350 },
      CONSTANT_SUPPORT: { min: 50, max: 600 },
    };

    const expansionBrackets = [
      "ROLLER_SUPPORT",
      "SLIDE_PLATE",
      "SPRING_HANGER",
      "CLEVIS_HANGER",
      "PIPE_SADDLE",
    ];
    const anchorBrackets = ["WELDED_BRACKET", "THREE_BOLT_CLAMP", "RISER_CLAMP"];

    const range = bracketSizeRanges[bracketTypeCode.toUpperCase()];
    if (!range) {
      issues.push({
        severity: "error",
        code: "UNKNOWN_BRACKET_TYPE",
        message: `Unknown bracket type: ${bracketTypeCode}`,
      });
    } else {
      if (nominalDiameterMm < range.min) {
        issues.push({
          severity: "error",
          code: "PIPE_TOO_SMALL",
          message: `Pipe size ${nominalDiameterMm}mm is below minimum ${range.min}mm for ${bracketTypeCode}`,
        });
      }
      if (nominalDiameterMm > range.max) {
        issues.push({
          severity: "error",
          code: "PIPE_TOO_LARGE",
          message: `Pipe size ${nominalDiameterMm}mm exceeds maximum ${range.max}mm for ${bracketTypeCode}`,
        });
      }
    }

    let estimatedLoadKg: number | undefined;
    let bracketMaxLoadKg: number | undefined;
    let loadUtilizationPercent: number | undefined;

    if (pipelineLengthM) {
      const spacing = this.supportSpacingCalc({
        nominalDiameterMm,
        scheduleNumber: schedule,
        isWaterFilled,
      });
      const spacingM =
        isWaterFilled !== false ? spacing.waterFilledSpacingM : spacing.vaporGasSpacingM;

      const pipeWeight = estimatePipeWeightPerMeter(
        nominalDiameterMm,
        schedule,
        isWaterFilled !== false,
        this.STEEL_DENSITY_KG_M3,
      );
      estimatedLoadKg = Math.round(pipeWeight * spacingM * 1.25 * 100) / 100;

      const bracketDim = await this.dimension(bracketTypeCode.toUpperCase(), nominalDiameterMm);
      if (bracketDim) {
        bracketMaxLoadKg = bracketDim.maxLoadKg;
        loadUtilizationPercent = Math.round((estimatedLoadKg / bracketMaxLoadKg) * 100);

        if (loadUtilizationPercent > 100) {
          issues.push({
            severity: "error",
            code: "LOAD_EXCEEDS_CAPACITY",
            message: `Estimated load ${estimatedLoadKg}kg exceeds bracket capacity ${bracketMaxLoadKg}kg (${loadUtilizationPercent}% utilization)`,
          });
        } else if (loadUtilizationPercent > 80) {
          issues.push({
            severity: "warning",
            code: "HIGH_LOAD_UTILIZATION",
            message: `High load utilization at ${loadUtilizationPercent}%. Consider a higher-capacity bracket.`,
          });
        }
      }
    }

    if (expectedExpansionMm && expectedExpansionMm > 10) {
      const isExpansionBracket = expansionBrackets.includes(bracketTypeCode.toUpperCase());
      if (!isExpansionBracket) {
        issues.push({
          severity: "warning",
          code: "EXPANSION_NOT_ACCOMMODATED",
          message: `${bracketTypeCode} does not allow thermal movement. Expected expansion: ${expectedExpansionMm}mm. Consider roller or slide plate supports.`,
        });
      }
    }

    if (expectedExpansionMm === 0 || expectedExpansionMm === undefined) {
      const isAnchor = anchorBrackets.includes(bracketTypeCode.toUpperCase());
      if (!isAnchor) {
        issues.push({
          severity: "info",
          code: "NOT_ANCHOR_TYPE",
          message: `${bracketTypeCode} allows movement. If this is an anchor point, consider welded bracket or three-bolt clamp.`,
        });
      }
    }

    const hasErrors = issues.some((i) => i.severity === "error");
    const hasWarnings = issues.some((i) => i.severity === "warning");

    let recommendation: string;
    if (hasErrors) {
      recommendation = "Not recommended. Please address the errors above.";
    } else if (hasWarnings) {
      recommendation = "Acceptable with caution. Review warnings above.";
    } else if (issues.length === 0) {
      recommendation = "Excellent choice. Bracket is well-suited for this application.";
    } else {
      recommendation = "Acceptable. Review informational notes above.";
    }

    return {
      isCompatible: !hasErrors,
      bracketTypeCode,
      nominalDiameterMm,
      issues,
      estimatedLoadKg,
      bracketMaxLoadKg,
      loadUtilizationPercent,
      recommendation,
    };
  }

  estimateWeight(nominalDiameterMm: number, bracketType?: string): number {
    const baseWeight = 0.5 + (nominalDiameterMm / 100) * 1.5;

    const multipliers: Record<string, number> = {
      clevis_hanger: 0.8,
      three_bolt_clamp: 1.5,
      welded_bracket: 2.0,
      pipe_saddle: 2.5,
      u_bolt: 0.5,
      roller_support: 3.0,
      slide_plate: 2.5,
    };

    const multiplier = bracketType ? multipliers[bracketType] || 1.0 : 1.0;
    return Math.round(baseWeight * multiplier * 100) / 100;
  }

  estimateCost(bracketType?: string): number {
    const costs: Record<string, number> = {
      clevis_hanger: 150,
      three_bolt_clamp: 250,
      welded_bracket: 180,
      pipe_saddle: 280,
      u_bolt: 80,
      band_hanger: 120,
      roller_support: 450,
      slide_plate: 350,
    };

    return bracketType ? costs[bracketType] || 200 : 200;
  }

  private supportSpacingCalc(dto: CalculateSupportSpacingDto): SupportSpacingResponseDto {
    const nbMm = findClosestNb(dto.nominalDiameterMm);
    const spacing = SUPPORT_SPACING_TABLE[nbMm];

    if (!spacing) {
      const defaultSpacing = interpolateSpacing(dto.nominalDiameterMm);
      return {
        nominalDiameterMm: dto.nominalDiameterMm,
        waterFilledSpacingM: defaultSpacing.water,
        vaporGasSpacingM: defaultSpacing.vapor,
        rodSizeMm: defaultSpacing.rod,
        standard: "MSS-SP-58 (interpolated)",
      };
    }

    return {
      nominalDiameterMm: dto.nominalDiameterMm,
      waterFilledSpacingM: spacing.water,
      vaporGasSpacingM: spacing.vapor,
      rodSizeMm: spacing.rod,
      standard: "MSS-SP-58",
    };
  }
}
