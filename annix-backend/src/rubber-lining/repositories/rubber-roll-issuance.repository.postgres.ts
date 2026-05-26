import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberRollIssuance } from "../entities/rubber-roll-issuance.entity";
import { RubberRollIssuanceRepository } from "./rubber-roll-issuance.repository";

const ISSUANCE_RELATIONS = ["rollStock", "rollStock.compoundCoding", "items", "items.lineItems"];

@Injectable()
export class PostgresRubberRollIssuanceRepository
  extends TypeOrmCrudRepository<RubberRollIssuance>
  implements RubberRollIssuanceRepository
{
  constructor(@InjectRepository(RubberRollIssuance) repository: Repository<RubberRollIssuance>) {
    super(repository);
  }

  build(data: Partial<RubberRollIssuance>): RubberRollIssuance {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRollIssuance>);
  }

  findAllWithRelations(): Promise<RubberRollIssuance[]> {
    return this.repository.find({
      relations: ISSUANCE_RELATIONS,
      order: { createdAt: "DESC" },
    });
  }

  findOneByIdWithRelations(id: number): Promise<RubberRollIssuance | null> {
    return this.repository.findOne({ where: { id }, relations: ISSUANCE_RELATIONS });
  }

  findOneByIdWithRollStock(id: number): Promise<RubberRollIssuance | null> {
    return this.repository.findOne({ where: { id }, relations: ["rollStock"] });
  }

  findOneByIdWithRollStockAndItems(id: number): Promise<RubberRollIssuance | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["rollStock", "rollStock.compoundCoding", "items"],
    });
  }
}
