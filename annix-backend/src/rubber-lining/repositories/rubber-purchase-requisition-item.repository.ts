import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberPurchaseRequisitionItem } from "../entities/rubber-purchase-requisition.entity";

export abstract class RubberPurchaseRequisitionItemRepository extends CrudRepository<RubberPurchaseRequisitionItem> {
  abstract build(data: Partial<RubberPurchaseRequisitionItem>): RubberPurchaseRequisitionItem;
}
