import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ReconciliationDocument } from "../entities/reconciliation-document.entity";

export abstract class ReconciliationDocumentRepository extends CrudRepository<ReconciliationDocument> {
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationDocument[]>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationDocument[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<ReconciliationDocument | null>;
  abstract findById(id: number): Promise<ReconciliationDocument | null>;
  abstract updateById(id: number, changes: DeepPartial<ReconciliationDocument>): Promise<void>;
}
