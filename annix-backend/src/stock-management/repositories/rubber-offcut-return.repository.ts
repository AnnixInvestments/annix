import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberOffcutReturn } from "../entities/rubber-offcut-return.entity";

export abstract class RubberOffcutReturnRepository extends CrudRepository<RubberOffcutReturn> {
  abstract build(data: DeepPartial<RubberOffcutReturn>): RubberOffcutReturn;
  abstract withTransaction(context: TransactionContext): RubberOffcutReturnRepository;
}
