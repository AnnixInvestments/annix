import { Injectable } from "@nestjs/common";
import { ForgedFittingDimension } from "./entities/forged-fitting-dimension.entity";
import { ForgedFittingRepository } from "./forged-fitting.repository";

@Injectable()
export class ForgedFittingService {
  constructor(private readonly forgedFittingRepository: ForgedFittingRepository) {}

  fittingTypes(): Promise<{ code: string; name: string }[]> {
    return this.forgedFittingRepository.fittingTypes();
  }

  seriesList(): Promise<{ id: number; pressureClass: number; connectionType: string }[]> {
    return this.forgedFittingRepository.seriesList();
  }

  sizes(fittingTypeCode: string, pressureClass: number, connectionType: string): Promise<number[]> {
    return this.forgedFittingRepository.sizes(fittingTypeCode, pressureClass, connectionType);
  }

  dimensions(
    fittingTypeCode: string,
    nominalBoreMm: number,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension | null> {
    return this.forgedFittingRepository.dimensionByFilter(
      fittingTypeCode,
      nominalBoreMm,
      pressureClass,
      connectionType,
    );
  }

  allDimensions(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension[]> {
    return this.forgedFittingRepository.allDimensions(
      fittingTypeCode,
      pressureClass,
      connectionType,
    );
  }
}
