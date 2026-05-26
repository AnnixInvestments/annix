import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberOrderItem } from "../entities/rubber-order-item.entity";

export abstract class RubberOrderItemRepository extends CrudRepository<RubberOrderItem> {
  abstract build(data: Partial<RubberOrderItem>): RubberOrderItem;
  abstract saveMany(entities: RubberOrderItem[]): Promise<RubberOrderItem[]>;
  abstract deleteByOrderId(orderId: number): Promise<void>;
}
