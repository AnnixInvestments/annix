import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberRollIssuanceLineItem } from "../entities/rubber-roll-issuance.entity";
import { RubberRollIssuanceLineItemRepository } from "./rubber-roll-issuance-line-item.repository";

@Injectable()
export class PostgresRubberRollIssuanceLineItemRepository
  extends TypeOrmCrudRepository<RubberRollIssuanceLineItem>
  implements RubberRollIssuanceLineItemRepository
{
  constructor(
    @InjectRepository(RubberRollIssuanceLineItem)
    repository: Repository<RubberRollIssuanceLineItem>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberRollIssuanceLineItem>): RubberRollIssuanceLineItem {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRollIssuanceLineItem>);
  }

  saveMany(entities: RubberRollIssuanceLineItem[]): Promise<RubberRollIssuanceLineItem[]> {
    return this.repository.save(entities);
  }
}
