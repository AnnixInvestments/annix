import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";

export abstract class IssuanceBatchRecordRepository extends TenantScopedRepository<IssuanceBatchRecord> {
  abstract withTransaction(context: TransactionContext): IssuanceBatchRecordRepository;
  abstract saveForCompany(
    companyId: number,
    entity: IssuanceBatchRecord,
  ): Promise<IssuanceBatchRecord>;
  abstract removeForCompany(companyId: number, entity: IssuanceBatchRecord): Promise<void>;
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
