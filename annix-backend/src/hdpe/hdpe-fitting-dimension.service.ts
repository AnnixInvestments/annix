import { Injectable } from "@nestjs/common";
import {
  HdpeFittingDimension,
  HdpeFittingDimensionType,
} from "./entities/hdpe-fitting-dimension.entity";
import { HdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository";

export interface HdpeFittingDimensionLookupCriteria {
  fittingType: HdpeFittingDimensionType;
  mainDnMm: number;
  branchDnMm?: number | null;
}

@Injectable()
export class HdpeFittingDimensionService {
  constructor(private readonly repository: HdpeFittingDimensionRepository) {}

  findByCriteria(
    criteria: HdpeFittingDimensionLookupCriteria,
  ): Promise<HdpeFittingDimension | null> {
    return this.repository.findByCriteria(
      criteria.fittingType,
      criteria.mainDnMm,
      criteria.branchDnMm ?? null,
    );
  }

  findAll(): Promise<HdpeFittingDimension[]> {
    return this.repository.findAllOrderedByTypeAndSize();
  }

  findByType(fittingType: HdpeFittingDimensionType): Promise<HdpeFittingDimension[]> {
    return this.repository.findByType(fittingType);
  }
}
