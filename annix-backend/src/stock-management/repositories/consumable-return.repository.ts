import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ConsumableReturn } from "../entities/consumable-return.entity";

export abstract class ConsumableReturnRepository extends CrudRepository<ConsumableReturn> {
  abstract build(data: DeepPartial<ConsumableReturn>): ConsumableReturn;
  abstract withTransaction(context: TransactionContext): ConsumableReturnRepository;
}
