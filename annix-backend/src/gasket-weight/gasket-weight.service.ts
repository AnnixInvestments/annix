import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { GasketWeight } from "./entities/gasket-weight.entity";

export interface FlangeWeightResult {
  found: boolean;
  weightKg: number | null;
  nominalBoreMm: number;
  pressureClass: string;
  notes?: string;
}

export interface GasketWeightResult {
  found: boolean;
  weightKg: number | null;
  gasketType: string;
  nominalBoreMm: number;
}

export interface BoltSetInfo {
  boltHoles: number;
  boltDesignation: string;
  pcdMm: number;
}

@Injectable()
export class GasketWeightService {
  constructor(
    @InjectRepository(GasketWeight)
    private gasketWeightRepository: Repository<GasketWeight>,
    @InjectRepository(FlangeDimension)
    private flangeDimensionRepository: Repository<FlangeDimension>,
  ) {}

  async findAll(): Promise<GasketWeight[]> {
    return this.gasketWeightRepository.find();
  }

  async gasketWeight(gasketType: string, nominalBoreMm: number): Promise<GasketWeightResult> {
    const gasket = await this.gasketWeightRepository.findOne({
      where: {
        gasket_type: gasketType.toUpperCase(),
        nominal_bore_mm: nominalBoreMm,
      },
    });

    if (!gasket) {
      // Estimate based on bore size (fallback)
      const estimatedWeight = nominalBoreMm * 0.015;
      return {
        found: false,
        weightKg: estimatedWeight,
        gasketType,
        nominalBoreMm,
      };
    }

    return {
      found: true,
      weightKg: Number(gasket.weight_kg),
      gasketType,
      nominalBoreMm,
    };
  }

  async flangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeWeightResult> {
    // Build query
    const query = this.flangeDimensionRepository
      .createQueryBuilder("fd")
      .leftJoinAndSelect("fd.nominalOutsideDiameter", "nb")
      .leftJoinAndSelect("fd.pressureClass", "pc")
      .leftJoinAndSelect("fd.standard", "std")
      .where("nb.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("pc.designation = :pressureClass", { pressureClass });

    if (flangeStandardCode) {
      query.andWhere("std.code = :flangeStandardCode", { flangeStandardCode });
    }

    const flangeDimension = await query.getOne();

    if (!flangeDimension) {
      // Fallback estimate
      const estimatedWeight = nominalBoreMm * 0.15;
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        pressureClass,
        notes: `No data found for NB${nominalBoreMm} ${pressureClass}. Using estimate.`,
      };
    }

    return {
      found: true,
      weightKg: flangeDimension.mass_kg,
      nominalBoreMm,
      pressureClass,
    };
  }

  async boltSetInfo(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<BoltSetInfo | null> {
    const query = this.flangeDimensionRepository
      .createQueryBuilder("fd")
      .leftJoinAndSelect("fd.nominalOutsideDiameter", "nb")
      .leftJoinAndSelect("fd.pressureClass", "pc")
      .leftJoinAndSelect("fd.standard", "std")
      .leftJoinAndSelect("fd.bolt", "bolt")
      .where("nb.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("pc.designation = :pressureClass", { pressureClass });

    if (flangeStandardCode) {
      query.andWhere("std.code = :flangeStandardCode", { flangeStandardCode });
    }

    const flangeDimension = await query.getOne();

    if (!flangeDimension || !flangeDimension.bolt) {
      return null;
    }

    return {
      boltHoles: flangeDimension.num_holes,
      boltDesignation: flangeDimension.bolt.designation,
      pcdMm: flangeDimension.pcd,
    };
  }

  async blankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeWeightResult> {
    // Blank flanges are typically ~2x the weight of slip-on flanges
    // This is a rough estimate - in reality would need separate table
    const slipOnResult = await this.flangeWeight(nominalBoreMm, pressureClass);

    return {
      ...slipOnResult,
      weightKg: slipOnResult.weightKg ? slipOnResult.weightKg * 1.8 : null,
      notes: slipOnResult.notes
        ? `${slipOnResult.notes} (Blank flange estimated at 1.8x slip-on)`
        : "Blank flange estimated at 1.8x slip-on weight",
    };
  }

  async availableGasketTypes(): Promise<string[]> {
    const result = await this.gasketWeightRepository
      .createQueryBuilder("gasket")
      .select("DISTINCT gasket.gasket_type", "type")
      .orderBy("gasket.gasket_type", "ASC")
      .getRawMany();

    return result.map((r) => r.type);
  }
}
