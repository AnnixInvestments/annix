import { Injectable } from "@nestjs/common";
import {
  CalculateSupportSpacingMultiStandardDto,
  MultiStandardSpacingResponseDto,
  StandardComparisonDto,
  SupportStandardDto,
} from "./dto/pipe-steel-work.dto";
import {
  findClosestNb,
  interpolateSpacingFromTable,
  STANDARD_FULL_NAMES,
  STANDARD_SPACING_TABLES,
} from "./pipe-steel-work-data";

@Injectable()
export class SupportSpacingService {
  multiStandard(dto: CalculateSupportSpacingMultiStandardDto): MultiStandardSpacingResponseDto {
    const standards = dto.standards?.length ? dto.standards : Object.values(SupportStandardDto);
    const nbMm = findClosestNb(dto.nominalDiameterMm);

    const comparisons: StandardComparisonDto[] = standards.map((standard) => {
      const table = STANDARD_SPACING_TABLES[standard];
      const spacing = table[nbMm] || interpolateSpacingFromTable(dto.nominalDiameterMm, table);

      return {
        standard,
        standardFullName: STANDARD_FULL_NAMES[standard],
        waterFilledSpacingM: spacing.water,
        vaporGasSpacingM: spacing.vapor,
        rodSizeMm: spacing.rod,
        notes:
          standard === SupportStandardDto.DIN_2509
            ? "More conservative European approach"
            : undefined,
      };
    });

    const conservativeRecommendation = comparisons.reduce((min, curr) =>
      curr.waterFilledSpacingM < min.waterFilledSpacingM ? curr : min,
    );

    return {
      nominalDiameterMm: dto.nominalDiameterMm,
      comparisons,
      conservativeRecommendation,
    };
  }
}
