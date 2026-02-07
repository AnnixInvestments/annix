import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";

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
  constructor(
    @InjectRepository(FlangeTypeWeight)
    private flangeTypeWeightRepository: Repository<FlangeTypeWeight>,
  ) {}

  async findAll(): Promise<FlangeTypeWeight[]> {
    return this.flangeTypeWeightRepository.find({
      relations: ["flangeStandard"],
    });
  }

  async flangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode: string | null,
    flangeTypeCode: string,
  ): Promise<FlangeTypeWeightResult> {
    const query = this.flangeTypeWeightRepository
      .createQueryBuilder("ftw")
      .leftJoinAndSelect("ftw.flangeStandard", "fs")
      .where("ftw.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("ftw.pressure_class = :pressureClass", { pressureClass })
      .andWhere("ftw.flange_type_code = :flangeTypeCode", { flangeTypeCode });

    if (flangeStandardCode) {
      query.andWhere("fs.code = :flangeStandardCode", { flangeStandardCode });
    } else {
      query.andWhere("ftw.flange_standard_id IS NULL");
    }

    const result = await query.getOne();

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
    const query = this.flangeTypeWeightRepository
      .createQueryBuilder("ftw")
      .where("ftw.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("ftw.pressure_class = :pressureClass", { pressureClass })
      .andWhere("ftw.flange_type_code = :flangeTypeCode", {
        flangeTypeCode: "BLANK",
      })
      .andWhere("ftw.flange_standard_id IS NULL");

    const result = await query.getOne();

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
    const result = await this.flangeTypeWeightRepository
      .createQueryBuilder("ftw")
      .select("DISTINCT ftw.pressure_class", "pressureClass")
      .orderBy("ftw.pressure_class", "ASC")
      .getRawMany<{ pressureClass: string }>();

    return result.map((r) => r.pressureClass);
  }

  async availableFlangeTypes(): Promise<string[]> {
    const result = await this.flangeTypeWeightRepository
      .createQueryBuilder("ftw")
      .select("DISTINCT ftw.flange_type_code", "flangeTypeCode")
      .orderBy("ftw.flange_type_code", "ASC")
      .getRawMany<{ flangeTypeCode: string }>();

    return result.map((r) => r.flangeTypeCode);
  }
}
