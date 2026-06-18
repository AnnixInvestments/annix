import { Injectable } from "@nestjs/common";
import { FlangeTypeWeightService } from "../flange-type-weight/flange-type-weight.service";
import { GasketWeight } from "./entities/gasket-weight.entity";
import { GasketWeightRepository } from "./gasket-weight.repository";

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
    private readonly gasketWeightRepository: GasketWeightRepository,
    private readonly flangeTypeWeightService: FlangeTypeWeightService,
  ) {}

  async findAll(): Promise<GasketWeight[]> {
    return this.gasketWeightRepository.findAllGaskets();
  }

  async gasketWeight(gasketType: string, nominalBoreMm: number): Promise<GasketWeightResult> {
    const gasket = await this.gasketWeightRepository.findGasketByTypeAndBore(
      gasketType,
      nominalBoreMm,
    );

    if (!gasket) {
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
    const flangeDimension = await this.gasketWeightRepository.findFlangeDimension(
      nominalBoreMm,
      pressureClass,
      flangeStandardCode,
    );

    if (!flangeDimension) {
      const estimatedWeight = nominalBoreMm * 0.15;
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        pressureClass,
        notes: `No data found for NB${nominalBoreMm} ${pressureClass}. Using estimate.`,
      };
    }

    // Prefer the authoritative per-type weight table (true weight varies by
    // flange type /1,/2,/3,...); fall back to the type-ambiguous
    // flange_dimensions.mass_kg only when no per-type row is found.
    const perTypeWeight = await this.flangeTypeWeightService.flangeTypeWeightForDesignation(
      nominalBoreMm,
      pressureClass,
      flangeStandardCode ?? null,
    );

    return {
      found: true,
      weightKg:
        perTypeWeight.found && perTypeWeight.weightKg !== null
          ? perTypeWeight.weightKg
          : flangeDimension.mass_kg,
      nominalBoreMm,
      pressureClass,
    };
  }

  async boltSetInfo(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<BoltSetInfo | null> {
    const flangeDimension = await this.gasketWeightRepository.findFlangeDimensionWithBolt(
      nominalBoreMm,
      pressureClass,
      flangeStandardCode,
    );

    if (!flangeDimension?.bolt) {
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
    const result = await this.gasketWeightRepository.distinctGasketTypes();
    return result.map((r) => r.type);
  }
}
