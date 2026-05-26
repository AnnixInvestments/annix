import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";

export abstract class JobCardLineItemRepository extends CrudRepository<JobCardLineItem> {
  abstract withTransaction(context: TransactionContext): CrudRepository<JobCardLineItem>;
  abstract findForJobCardAndCompany(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem[]>;
  abstract findForJobCardOrderedBySort(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem[]>;
  abstract findForJobCard(jobCardId: number): Promise<JobCardLineItem[]>;
  abstract findForJobCardOrderedBySortAnyCompany(jobCardId: number): Promise<JobCardLineItem[]>;
  abstract findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem | null>;
  abstract findOneByIdAndJobCard(id: number, jobCardId: number): Promise<JobCardLineItem | null>;
  abstract countForJobCard(jobCardId: number): Promise<number>;
  abstract deleteForJobCard(jobCardId: number): Promise<void>;
  abstract saveMany(entities: JobCardLineItem[]): Promise<JobCardLineItem[]>;
  abstract buildMany(rows: DeepPartial<JobCardLineItem>[]): JobCardLineItem[];
}
