import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BnwSetWeight } from "./entities/bnw-set-weight.entity";

export interface BnwSetInfoResult {
  found: boolean;
  boltSize: string;
  weightPerHoleKg: number;
  numHoles: number;
  totalWeightKg: number;
  pressureClass: string;
  nominalBoreMm: number;
  notes?: string;
}

@Injectable()
export class BnwSetWeightService {
  constructor(
    @InjectRepository(BnwSetWeight)
    private bnwSetWeightRepository: Repository<BnwSetWeight>,
  ) {}

  async findAll(): Promise<BnwSetWeight[]> {
    return this.bnwSetWeightRepository.find();
  }

  async bnwSetInfo(nominalBoreMm: number, pressureClass: string): Promise<BnwSetInfoResult> {
    const result = await this.bnwSetWeightRepository.findOne({
      where: {
        nominal_bore_mm: nominalBoreMm,
        pressure_class: pressureClass,
      },
    });

    if (!result) {
      const defaultHoles = 8;
      const defaultWeight = 0.18;
      return {
        found: false,
        boltSize: "M16x65",
        weightPerHoleKg: defaultWeight,
        numHoles: defaultHoles,
        totalWeightKg: defaultHoles * defaultWeight,
        pressureClass,
        nominalBoreMm,
        notes: `No data found for NB${nominalBoreMm} ${pressureClass}. Using defaults.`,
      };
    }

    const weightPerHole = Number(result.weight_per_hole_kg);
    return {
      found: true,
      boltSize: result.bolt_size,
      weightPerHoleKg: weightPerHole,
      numHoles: result.num_holes,
      totalWeightKg: result.num_holes * weightPerHole,
      pressureClass,
      nominalBoreMm,
    };
  }

  async availablePressureClasses(): Promise<string[]> {
    const result = await this.bnwSetWeightRepository
      .createQueryBuilder("bnw")
      .select("DISTINCT bnw.pressure_class", "pressureClass")
      .orderBy("bnw.pressure_class", "ASC")
      .getRawMany<{ pressureClass: string }>();

    return result.map((r) => r.pressureClass);
  }
}
