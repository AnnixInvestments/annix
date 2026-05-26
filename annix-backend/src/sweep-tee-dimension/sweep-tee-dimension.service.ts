import { Injectable } from "@nestjs/common";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";
import { SweepTeeDimensionRepository } from "./sweep-tee-dimension.repository";

@Injectable()
export class SweepTeeDimensionService {
  constructor(private readonly sweepTeeDimensionRepository: SweepTeeDimensionRepository) {}

  async findAll(): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionRepository.findAllOrdered();
  }

  async findByNominalBore(nominalBoreMm: number): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionRepository.findByNominalBore(nominalBoreMm);
  }

  async findByRadiusType(radiusType: string): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionRepository.findByRadiusType(radiusType);
  }

  async findByCriteria(
    nominalBoreMm: number,
    radiusType: string,
  ): Promise<SweepTeeDimension | null> {
    return this.sweepTeeDimensionRepository.findByCriteria(nominalBoreMm, radiusType);
  }

  async availableNominalBores(): Promise<number[]> {
    return this.sweepTeeDimensionRepository.availableNominalBores();
  }

  async availableRadiusTypes(): Promise<string[]> {
    return this.sweepTeeDimensionRepository.availableRadiusTypes();
  }
}
