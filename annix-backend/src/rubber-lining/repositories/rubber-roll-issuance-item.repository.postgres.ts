import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberRollIssuanceItem } from "../entities/rubber-roll-issuance.entity";
import { RubberRollIssuanceItemRepository } from "./rubber-roll-issuance-item.repository";

@Injectable()
export class PostgresRubberRollIssuanceItemRepository
  extends TypeOrmCrudRepository<RubberRollIssuanceItem>
  implements RubberRollIssuanceItemRepository
{
  constructor(
    @InjectRepository(RubberRollIssuanceItem) repository: Repository<RubberRollIssuanceItem>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberRollIssuanceItem>): RubberRollIssuanceItem {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRollIssuanceItem>);
  }

  saveMany(entities: RubberRollIssuanceItem[]): Promise<RubberRollIssuanceItem[]> {
    return this.repository.save(entities);
  }
}
