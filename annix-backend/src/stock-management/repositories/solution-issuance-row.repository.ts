import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { SolutionIssuanceRow } from "../entities/solution-issuance-row.entity";

export abstract class SolutionIssuanceRowRepository extends CrudRepository<SolutionIssuanceRow> {
  abstract build(data: DeepPartial<SolutionIssuanceRow>): SolutionIssuanceRow;
  abstract withTransaction(context: TransactionContext): SolutionIssuanceRowRepository;
}
