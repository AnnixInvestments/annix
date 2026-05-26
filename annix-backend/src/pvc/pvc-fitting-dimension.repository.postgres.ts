import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  PvcFittingDimension,
  PvcFittingDimensionType,
} from "./entities/pvc-fitting-dimension.entity";
import { PvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository";

@Injectable()
export class PostgresPvcFittingDimensionRepository
  extends TypeOrmCrudRepository<PvcFittingDimension>
  implements PvcFittingDimensionRepository
{
  constructor(@InjectRepository(PvcFittingDimension) repository: Repository<PvcFittingDimension>) {
    super(repository);
  }

  findByCriteria(
    fittingType: PvcFittingDimensionType,
    mainDnMm: number,
    branchDnMm: number | null,
  ): Promise<PvcFittingDimension | null> {
    const where: FindOptionsWhere<PvcFittingDimension> = {
      fittingType,
      mainDnMm,
      branchDnMm: branchDnMm ?? (null as unknown as number),
    };
    return this.repository.findOne({ where });
  }

  findAllOrderedByTypeAndSize(): Promise<PvcFittingDimension[]> {
    return this.repository.find({
      order: { fittingType: "ASC", mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }

  findByType(fittingType: PvcFittingDimensionType): Promise<PvcFittingDimension[]> {
    return this.repository.find({
      where: { fittingType },
      order: { mainDnMm: "ASC", branchDnMm: "ASC" },
    });
  }
}
