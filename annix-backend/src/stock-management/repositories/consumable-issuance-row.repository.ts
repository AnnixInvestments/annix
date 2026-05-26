import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ConsumableIssuanceRow } from "../entities/consumable-issuance-row.entity";

export abstract class ConsumableIssuanceRowRepository extends CrudRepository<ConsumableIssuanceRow> {
  abstract build(data: DeepPartial<ConsumableIssuanceRow>): ConsumableIssuanceRow;
  abstract withTransaction(context: TransactionContext): ConsumableIssuanceRowRepository;
}
