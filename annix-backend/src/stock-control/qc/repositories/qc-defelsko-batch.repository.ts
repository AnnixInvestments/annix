import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcDefelskoBatch } from "../entities/qc-defelsko-batch.entity";

export interface DefelskoBatchMatch {
  batch: QcDefelskoBatch;
  jobNumber: string | null;
  jcNumber: string | null;
}

export abstract class QcDefelskoBatchRepository extends CrudRepository<QcDefelskoBatch> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcDefelskoBatch[]>;
  abstract findByJobCardAndFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<QcDefelskoBatch | null>;
  abstract matchActiveByBatchNumber(
    companyId: number,
    batchNumber: string,
  ): Promise<DefelskoBatchMatch | null>;
  abstract findForJobCardWithCertLinked(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDefelskoBatch[]>;
  abstract findUnlinkedByCategories(
    companyId: number,
    categories: string[],
  ): Promise<QcDefelskoBatch[]>;
  abstract updateSupplierCertificateId(id: number, supplierCertificateId: number): Promise<void>;
}
