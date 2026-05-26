import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaintReturn } from "../entities/paint-return.entity";

export abstract class PaintReturnRepository extends CrudRepository<PaintReturn> {
  abstract build(data: DeepPartial<PaintReturn>): PaintReturn;
  abstract withTransaction(context: TransactionContext): PaintReturnRepository;
}
