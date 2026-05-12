import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository } from "typeorm";
import {
  PvcFittingDimension,
  type PvcFittingDimensionType,
} from "./entities/pvc-fitting-dimension.entity";

export interface PvcFittingDimensionLookupCriteria {
  fittingType: PvcFittingDimensionType;
  mainDnMm: number;
  branchDnMm?: number | null;
}

@Injectable()
export class PvcFittingDimensionService {
  constructor(
    @InjectRepository(PvcFittingDimension)
    private readonly repository: Repository<PvcFittingDimension>,
  ) {}

  async findByCriteria(
    criteria: PvcFittingDimensionLookupCriteria,
  ): Promise<PvcFittingDimension | null> {
    const where: FindOptionsWhere<PvcFittingDimension> = {
      fittingType: criteria.fittingType,
      mainDnMm: criteria.mainDnMm,
    };
    // Reducer / reducing-tee / saddle rows are keyed by
    // (mainDn, branchDn). Symmetric fitting rows (elbow / equal-tee
    // / end-cap / coupling / flange-adapter) store branchDn as NULL
    // — match accordingly so the unique constraint resolves the
    // right row.
    where.branchDnMm = criteria.branchDnMm ?? (null as unknown as number);
    return this.repository.findOne({ where });
  }

  async findAll(): Promise<PvcFittingDimension[]> {
    return this.repository.find({
      order: { fittingType: "ASC", mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }

  async findByType(fittingType: PvcFittingDimensionType): Promise<PvcFittingDimension[]> {
    return this.repository.find({
      where: { fittingType },
      order: { mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }
}
