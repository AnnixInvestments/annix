import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcBatchAssignment } from "../entities/qc-batch-assignment.entity";

export abstract class QcBatchAssignmentRepository extends CrudRepository<QcBatchAssignment> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcBatchAssignment[]>;
  abstract findForJobCardOrderedByLineItemAndFieldKey(
    companyId: number,
    jobCardId: number,
  ): Promise<QcBatchAssignment[]>;
  abstract findForCpo(companyId: number, cpoId: number): Promise<QcBatchAssignment[]>;
  abstract findByLineItemAndFieldKey(
    lineItemId: number,
    fieldKey: string,
  ): Promise<QcBatchAssignment | null>;
  abstract deleteByIdForCompany(id: number, companyId: number): Promise<void>;
  abstract findLineItemsForFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<QcBatchAssignment[]>;
  abstract findForJobCardAndBatch(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
  ): Promise<QcBatchAssignment[]>;
  abstract linkPositectorUpload(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
    positectorUploadId: number,
  ): Promise<void>;
}
