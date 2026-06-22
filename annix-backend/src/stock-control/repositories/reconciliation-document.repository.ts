import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ReconciliationDocument } from "../entities/reconciliation-document.entity";

export abstract class ReconciliationDocumentRepository extends TenantScopedRepository<ReconciliationDocument> {
  abstract withTransaction(context: TransactionContext): ReconciliationDocumentRepository;
  abstract saveForCompany(
    companyId: number,
    entity: ReconciliationDocument,
  ): Promise<ReconciliationDocument>;
  abstract removeForCompany(companyId: number, entity: ReconciliationDocument): Promise<void>;
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationDocument[]>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationDocument[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<ReconciliationDocument | null>;
  abstract findById(id: number): Promise<ReconciliationDocument | null>;
  abstract updateById(id: number, changes: DeepPartial<ReconciliationDocument>): Promise<void>;
}
