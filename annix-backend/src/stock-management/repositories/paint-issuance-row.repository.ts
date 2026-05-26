import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaintIssuanceRow } from "../entities/paint-issuance-row.entity";

export abstract class PaintIssuanceRowRepository extends CrudRepository<PaintIssuanceRow> {
  abstract build(data: DeepPartial<PaintIssuanceRow>): PaintIssuanceRow;
  abstract withTransaction(context: TransactionContext): PaintIssuanceRowRepository;
}
