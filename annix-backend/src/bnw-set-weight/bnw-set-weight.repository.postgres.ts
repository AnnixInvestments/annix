import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BnwSetWeightRepository } from "./bnw-set-weight.repository";
import { BnwSetWeight } from "./entities/bnw-set-weight.entity";

@Injectable()
export class PostgresBnwSetWeightRepository
  extends TypeOrmCrudRepository<BnwSetWeight>
  implements BnwSetWeightRepository
{
  constructor(@InjectRepository(BnwSetWeight) repository: Repository<BnwSetWeight>) {
    super(repository);
  }

  async availablePressureClasses(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder("bnw")
      .select("DISTINCT bnw.pressure_class", "pressureClass")
      .orderBy("bnw.pressure_class", "ASC")
      .getRawMany<{ pressureClass: string }>();

    return result.map((r) => r.pressureClass);
  }
}
