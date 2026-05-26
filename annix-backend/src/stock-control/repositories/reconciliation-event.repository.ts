import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ReconciliationEvent } from "../entities/reconciliation-event.entity";

export abstract class ReconciliationEventRepository extends CrudRepository<ReconciliationEvent> {
  abstract findForItemsOrdered(itemIds: number[]): Promise<ReconciliationEvent[]>;
}
