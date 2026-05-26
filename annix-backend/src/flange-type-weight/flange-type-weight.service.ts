import { Injectable } from "@nestjs/common";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";

export interface FlangeTypeWeightResult {
  found: boolean;
  weightKg: number | null;
  nominalBoreMm: number;
  pressureClass: string;
  flangeTypeCode: string;
  flangeStandardCode: string | null;
  notes?: string;
}

@Injectable()
export class FlangeTypeWeightService {
  constructor(private readonly flangeTypeWeightRepository: FlangeTypeWeightRepository) {}

  async findAll(): Promise<FlangeTypeWeight[]> {
    return this.flangeTypeWeightRepository.findAllWithStandard();
  }

  async flangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode: string | null,
    flangeTypeCode: string,
  ): Promise<FlangeTypeWeightResult> {
    const result = await this.flangeTypeWeightRepository.findFlangeTypeWeight(
      nominalBoreMm,
      pressureClass,
      flangeTypeCode,
      flangeStandardCode,
    );

    if (!result) {
      const estimatedWeight = nominalBoreMm * 0.15;
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        pressureClass,
        flangeTypeCode,
        flangeStandardCode,
        notes: `No data found for NB${nominalBoreMm} ${pressureClass} ${flangeTypeCode}. Using estimate.`,
      };
    }

    return {
      found: true,
      weightKg: Number(result.weight_kg),
      nominalBoreMm,
      pressureClass,
      flangeTypeCode,
      flangeStandardCode,
    };
  }

  async blankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeTypeWeightResult> {
    const result = await this.flangeTypeWeightRepository.findBlankFlangeWeight(
      nominalBoreMm,
      pressureClass,
    );

    if (!result) {
      const estimatedWeight = nominalBoreMm * 0.2;
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        pressureClass,
        flangeTypeCode: "BLANK",
        flangeStandardCode: null,
        notes: `No blank flange data found for NB${nominalBoreMm} ${pressureClass}. Using estimate.`,
      };
    }

    return {
      found: true,
      weightKg: Number(result.weight_kg),
      nominalBoreMm,
      pressureClass,
      flangeTypeCode: "BLANK",
      flangeStandardCode: null,
    };
  }

  async availablePressureClasses(): Promise<string[]> {
    const result = await this.flangeTypeWeightRepository.distinctPressureClasses();
    return result.map((r) => r.pressureClass);
  }

  async availableFlangeTypes(): Promise<string[]> {
    const result = await this.flangeTypeWeightRepository.distinctFlangeTypeCodes();
    return result.map((r) => r.flangeTypeCode);
  }
}
