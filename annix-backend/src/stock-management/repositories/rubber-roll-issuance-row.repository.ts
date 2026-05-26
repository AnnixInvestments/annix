import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberRollIssuanceRow } from "../entities/rubber-roll-issuance-row.entity";

export abstract class RubberRollIssuanceRowRepository extends CrudRepository<RubberRollIssuanceRow> {
  abstract build(data: DeepPartial<RubberRollIssuanceRow>): RubberRollIssuanceRow;
  abstract withTransaction(context: TransactionContext): RubberRollIssuanceRowRepository;
}
