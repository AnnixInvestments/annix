import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberPurchaseRequisitionItem } from "../entities/rubber-purchase-requisition.entity";
import { RubberPurchaseRequisitionItemRepository } from "./rubber-purchase-requisition-item.repository";

@Injectable()
export class PostgresRubberPurchaseRequisitionItemRepository
  extends TypeOrmCrudRepository<RubberPurchaseRequisitionItem>
  implements RubberPurchaseRequisitionItemRepository
{
  constructor(
    @InjectRepository(RubberPurchaseRequisitionItem)
    repository: Repository<RubberPurchaseRequisitionItem>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberPurchaseRequisitionItem>): RubberPurchaseRequisitionItem {
    return this.repository.create(data as TypeOrmDeepPartial<RubberPurchaseRequisitionItem>);
  }
}
