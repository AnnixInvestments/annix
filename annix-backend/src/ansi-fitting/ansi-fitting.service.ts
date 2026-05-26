import { Injectable } from "@nestjs/common";
import {
  AnsiFittingDimensionRepository,
  AnsiFittingTypeRepository,
} from "./ansi-fitting.repository";
import { AnsiB169FittingDimension } from "./entities/ansi-b16-9-fitting-dimension.entity";

@Injectable()
export class AnsiFittingService {
  constructor(
    private readonly dimensionRepository: AnsiFittingDimensionRepository,
    private readonly typeRepository: AnsiFittingTypeRepository,
  ) {}

  async fittingTypes(): Promise<{ code: string; name: string }[]> {
    const types = await this.typeRepository.findAllOrderedByName();
    return types.map((t) => ({ code: t.code, name: t.name }));
  }

  async sizes(fittingTypeCode: string, schedule?: string): Promise<number[]> {
    return this.dimensionRepository.sizesByFittingType(fittingTypeCode, schedule);
  }

  async schedules(fittingTypeCode: string): Promise<string[]> {
    return this.dimensionRepository.schedulesByFittingType(fittingTypeCode);
  }

  async dimensions(
    fittingTypeCode: string,
    nbMm: number,
    schedule: string,
    branchNbMm?: number,
  ): Promise<AnsiB169FittingDimension | null> {
    return this.dimensionRepository.dimensionByTypeNbSchedule(
      fittingTypeCode,
      nbMm,
      schedule,
      branchNbMm,
    );
  }

  async allDimensions(
    fittingTypeCode: string,
    schedule: string,
  ): Promise<AnsiB169FittingDimension[]> {
    return this.dimensionRepository.allDimensionsByTypeAndSchedule(fittingTypeCode, schedule);
  }
}
