import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { HdpeFittingWeight } from "./entities/hdpe-fitting-weight.entity";
import { HdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository";

@Injectable()
export class PostgresHdpeFittingWeightRepository
  extends TypeOrmCrudRepository<HdpeFittingWeight>
  implements HdpeFittingWeightRepository
{
  constructor(@InjectRepository(HdpeFittingWeight) repository: Repository<HdpeFittingWeight>) {
    super(repository);
  }

  findByFittingTypeId(fittingTypeId: number): Promise<HdpeFittingWeight[]> {
    return this.repository.find({
      where: { fittingTypeId, isActive: true },
      order: { nominalBore: "ASC" },
    });
  }

  findByFittingTypeIdAndNominalBore(
    fittingTypeId: number,
    nominalBore: number,
  ): Promise<HdpeFittingWeight | null> {
    return this.repository.findOne({ where: { fittingTypeId, nominalBore, isActive: true } });
  }
}
