import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ReconciliationEvent } from "../entities/reconciliation-event.entity";
import { ReconciliationEventRepository } from "./reconciliation-event.repository";

@Injectable()
export class PostgresReconciliationEventRepository
  extends TypeOrmCrudRepository<ReconciliationEvent>
  implements ReconciliationEventRepository
{
  constructor(
    @InjectRepository(ReconciliationEvent)
    repository: Repository<ReconciliationEvent>,
  ) {
    super(repository);
  }

  findForItemsOrdered(itemIds: number[]): Promise<ReconciliationEvent[]> {
    return this.repository.find({
      where: itemIds.map((id) => ({ reconciliationItemId: id })),
      order: { createdAt: "DESC" },
    });
  }
}
