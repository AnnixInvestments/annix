import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  RubberCompoundOrder,
  RubberCompoundOrderStatus,
} from "../entities/rubber-compound-order.entity";

export abstract class RubberCompoundOrderRepository extends CrudRepository<RubberCompoundOrder> {
  abstract build(data: Partial<RubberCompoundOrder>): RubberCompoundOrder;
  abstract findByStatusWithRelations(
    status?: RubberCompoundOrderStatus,
  ): Promise<RubberCompoundOrder[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberCompoundOrder | null>;
  abstract findLastById(): Promise<RubberCompoundOrder | null>;
  abstract findOneActiveForStock(compoundStockId: number): Promise<RubberCompoundOrder | null>;
}
