import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RetainingRingWeight } from './entities/retaining-ring-weight.entity';

export interface RetainingRingWeightResult {
  found: boolean;
  weightKg: number;
  nominalBoreMm: number;
  notes?: string;
}

@Injectable()
export class RetainingRingWeightService {
  private readonly STEEL_DENSITY_KG_M3 = 7850;

  constructor(
    @InjectRepository(RetainingRingWeight)
    private retainingRingWeightRepository: Repository<RetainingRingWeight>,
  ) {}

  async findAll(): Promise<RetainingRingWeight[]> {
    return this.retainingRingWeightRepository.find({
      order: { nominal_bore_mm: 'ASC' },
    });
  }

  async retainingRingWeight(
    nominalBoreMm: number,
  ): Promise<RetainingRingWeightResult> {
    const result = await this.retainingRingWeightRepository.findOne({
      where: { nominal_bore_mm: nominalBoreMm },
    });

    if (!result) {
      const estimatedWeight = this.estimateRetainingRingWeight(nominalBoreMm);
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        notes: `No data found for NB${nominalBoreMm}. Using calculated estimate.`,
      };
    }

    return {
      found: true,
      weightKg: Number(result.weight_kg),
      nominalBoreMm,
    };
  }

  private estimateRetainingRingWeight(nbMm: number): number {
    const pipeOd = nbMm * 1.05;
    const ringOdMm = pipeOd * 1.25;
    const ringIdMm = pipeOd;
    const ringThicknessMm = Math.max(10, Math.min(25, nbMm * 0.02));

    const ringOdM = ringOdMm / 1000;
    const ringIdM = ringIdMm / 1000;
    const thicknessM = ringThicknessMm / 1000;

    const volumeM3 =
      Math.PI *
      ((Math.pow(ringOdM, 2) - Math.pow(ringIdM, 2)) / 4) *
      thicknessM;
    const weightKg = volumeM3 * this.STEEL_DENSITY_KG_M3;

    return Math.round(weightKg * 100) / 100;
  }
}
