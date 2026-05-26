import { CrudRepository } from "../lib/persistence/crud-repository";
import { PumpOrderItem } from "./entities/pump-order-item.entity";

export abstract class PumpOrderItemRepository extends CrudRepository<PumpOrderItem> {
  abstract deleteByOrderId(orderId: number): Promise<void>;
  abstract saveMany(items: Partial<PumpOrderItem>[]): Promise<PumpOrderItem[]>;
}
