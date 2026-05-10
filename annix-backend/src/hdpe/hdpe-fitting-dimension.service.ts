import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository } from "typeorm";
import {
  HdpeFittingDimension,
  type HdpeFittingDimensionType,
} from "./entities/hdpe-fitting-dimension.entity";

export interface HdpeFittingDimensionLookupCriteria {
  fittingType: HdpeFittingDimensionType;
  mainDnMm: number;
  branchDnMm?: number | null;
}

@Injectable()
export class HdpeFittingDimensionService {
  constructor(
    @InjectRepository(HdpeFittingDimension)
    private readonly repository: Repository<HdpeFittingDimension>,
  ) {}

  async findByCriteria(
    criteria: HdpeFittingDimensionLookupCriteria,
  ): Promise<HdpeFittingDimension | null> {
    const where: FindOptionsWhere<HdpeFittingDimension> = {
      fittingType: criteria.fittingType,
      mainDnMm: criteria.mainDnMm,
    };
    // Reducer + reducing-tee rows are keyed by (mainDn, branchDn).
    // Symmetric fitting rows (elbow / equal-tee / lateral / end-cap)
    // store branchDn as NULL — match accordingly so the unique
    // constraint resolves the right row.
    where.branchDnMm = criteria.branchDnMm ?? (null as unknown as number);
    return this.repository.findOne({ where });
  }

  async findAll(): Promise<HdpeFittingDimension[]> {
    return this.repository.find({
      order: { fittingType: "ASC", mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }

  async findByType(fittingType: HdpeFittingDimensionType): Promise<HdpeFittingDimension[]> {
    return this.repository.find({
      where: { fittingType },
      order: { mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }
}
