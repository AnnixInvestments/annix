import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";

export abstract class IssuanceBatchRecordRepository extends CrudRepository<IssuanceBatchRecord> {
  abstract findForJobCardWithCertificate(
    companyId: number,
    jobCardId: number,
  ): Promise<IssuanceBatchRecord[]>;
  abstract findForJobCardWithDetails(
    companyId: number,
    jobCardId: number,
  ): Promise<IssuanceBatchRecord[]>;
  abstract findByBatchNumberWithDetails(
    companyId: number,
    batchNumber: string,
  ): Promise<IssuanceBatchRecord[]>;
  abstract certificateCountsByJobCard(
    companyId: number,
    jobCardIds: number[],
  ): Promise<Array<{ jobCardId: number; certCount: string }>>;
  abstract recentBatchNumbers(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<string[]>;
  abstract findUnlinkedToCertificate(companyId: number): Promise<IssuanceBatchRecord[]>;
  abstract updateById(id: number, changes: DeepPartial<IssuanceBatchRecord>): Promise<void>;
}
