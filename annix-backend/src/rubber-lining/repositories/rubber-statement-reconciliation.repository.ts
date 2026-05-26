import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  ReconciliationStatus,
  RubberStatementReconciliation,
} from "../entities/rubber-statement-reconciliation.entity";

export interface ReconciliationListFilters {
  companyId?: number;
  status?: ReconciliationStatus;
  year?: number;
  month?: number;
}

export abstract class RubberStatementReconciliationRepository extends CrudRepository<RubberStatementReconciliation> {
  abstract build(data: Partial<RubberStatementReconciliation>): RubberStatementReconciliation;
  abstract findByIdWithCompany(id: number): Promise<RubberStatementReconciliation | null>;
  abstract findAllWithCompanyOrdered(
    filters?: ReconciliationListFilters,
  ): Promise<RubberStatementReconciliation[]>;
}
