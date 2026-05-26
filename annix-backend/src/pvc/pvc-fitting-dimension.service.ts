import { Injectable } from "@nestjs/common";
import {
  PvcFittingDimension,
  type PvcFittingDimensionType,
} from "./entities/pvc-fitting-dimension.entity";
import { PvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository";

export interface PvcFittingDimensionLookupCriteria {
  fittingType: PvcFittingDimensionType;
  mainDnMm: number;
  branchDnMm?: number | null;
}

@Injectable()
export class PvcFittingDimensionService {
  constructor(private readonly repository: PvcFittingDimensionRepository) {}

  findByCriteria(criteria: PvcFittingDimensionLookupCriteria): Promise<PvcFittingDimension | null> {
    return this.repository.findByCriteria(
      criteria.fittingType,
      criteria.mainDnMm,
      criteria.branchDnMm ?? null,
    );
  }

  findAll(): Promise<PvcFittingDimension[]> {
    return this.repository.findAllOrderedByTypeAndSize();
  }

  findByType(fittingType: PvcFittingDimensionType): Promise<PvcFittingDimension[]> {
    return this.repository.findByType(fittingType);
  }
}
