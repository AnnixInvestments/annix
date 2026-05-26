import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberOrder, RubberOrderStatus } from "../entities/rubber-order.entity";

export abstract class RubberOrderRepository extends CrudRepository<RubberOrder> {
  abstract build(data: Partial<RubberOrder>): RubberOrder;
  abstract deleteById(id: number): Promise<boolean>;
  abstract findFilteredWithRelations(status?: RubberOrderStatus): Promise<RubberOrder[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberOrder | null>;
  abstract findLatest(): Promise<RubberOrder | null>;
}
