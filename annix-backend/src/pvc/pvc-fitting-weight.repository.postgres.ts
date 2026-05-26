import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";
import { PvcFittingWeightRepository } from "./pvc-fitting-weight.repository";

@Injectable()
export class PostgresPvcFittingWeightRepository
  extends TypeOrmCrudRepository<PvcFittingWeight>
  implements PvcFittingWeightRepository
{
  constructor(@InjectRepository(PvcFittingWeight) repository: Repository<PvcFittingWeight>) {
    super(repository);
  }

  findByFittingTypeId(fittingTypeId: number): Promise<PvcFittingWeight[]> {
    return this.repository.find({
      where: { fittingTypeId, isActive: true },
      order: { nominalDiameter: "ASC" },
    });
  }

  findByFittingTypeIdAndDN(
    fittingTypeId: number,
    nominalDiameter: number,
    pressureRating?: number,
  ): Promise<PvcFittingWeight | null> {
    const where: FindOptionsWhere<PvcFittingWeight> = {
      fittingTypeId,
      nominalDiameter,
      isActive: true,
    };
    if (pressureRating !== undefined) {
      where.pressureRating = pressureRating;
    }
    return this.repository.findOne({ where });
  }
}
