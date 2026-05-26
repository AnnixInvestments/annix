import { Injectable } from "@nestjs/common";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";
import { MalleableFittingRepository } from "./malleable-fitting.repository";

@Injectable()
export class MalleableFittingService {
  constructor(private readonly malleableFittingRepository: MalleableFittingRepository) {}

  async fittingTypes(): Promise<string[]> {
    const rows = await this.malleableFittingRepository.distinctFittingTypes();
    return rows.map((r) => r.fittingType);
  }

  dimensions(
    fittingType: string,
    pressureClass?: number,
  ): Promise<MalleableIronFittingDimension[]> {
    return this.malleableFittingRepository.dimensionsByType(fittingType, pressureClass);
  }

  async sizes(fittingType: string, pressureClass: number): Promise<number[]> {
    const rows = await this.malleableFittingRepository.sizesByTypeAndClass(
      fittingType,
      pressureClass,
    );
    return rows.map((r) => Number(r.nominalBoreMm));
  }

  dimensionBySize(
    fittingType: string,
    nominalBoreMm: number,
    pressureClass: number,
  ): Promise<MalleableIronFittingDimension | null> {
    return this.malleableFittingRepository.findByTypeAndSize(
      fittingType,
      nominalBoreMm,
      pressureClass,
    );
  }
}
