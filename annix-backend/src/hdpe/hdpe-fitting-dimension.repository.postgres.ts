import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  HdpeFittingDimension,
  HdpeFittingDimensionType,
} from "./entities/hdpe-fitting-dimension.entity";
import { HdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository";

@Injectable()
export class PostgresHdpeFittingDimensionRepository
  extends TypeOrmCrudRepository<HdpeFittingDimension>
  implements HdpeFittingDimensionRepository
{
  constructor(
    @InjectRepository(HdpeFittingDimension) repository: Repository<HdpeFittingDimension>,
  ) {
    super(repository);
  }

  findByCriteria(
    fittingType: HdpeFittingDimensionType,
    mainDnMm: number,
    branchDnMm: number | null,
  ): Promise<HdpeFittingDimension | null> {
    const where: FindOptionsWhere<HdpeFittingDimension> = {
      fittingType,
      mainDnMm,
      branchDnMm: branchDnMm ?? (null as unknown as number),
    };
    return this.repository.findOne({ where });
  }

  findAllOrderedByTypeAndSize(): Promise<HdpeFittingDimension[]> {
    return this.repository.find({
      order: { fittingType: "ASC", mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }

  findByType(fittingType: HdpeFittingDimensionType): Promise<HdpeFittingDimension[]> {
    return this.repository.find({
      where: { fittingType },
      order: { mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }
}
