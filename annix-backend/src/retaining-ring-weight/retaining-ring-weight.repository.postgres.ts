import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RetainingRingWeight } from "./entities/retaining-ring-weight.entity";
import { RetainingRingWeightRepository } from "./retaining-ring-weight.repository";

@Injectable()
export class PostgresRetainingRingWeightRepository
  extends TypeOrmCrudRepository<RetainingRingWeight>
  implements RetainingRingWeightRepository
{
  constructor(@InjectRepository(RetainingRingWeight) repository: Repository<RetainingRingWeight>) {
    super(repository);
  }

  findAllOrdered(): Promise<RetainingRingWeight[]> {
    return this.repository.find({
      order: { nominal_bore_mm: "ASC" },
    });
  }

  findByNominalBore(nominalBoreMm: number): Promise<RetainingRingWeight | null> {
    return this.repository.findOne({
      where: { nominal_bore_mm: nominalBoreMm },
    });
  }
}
