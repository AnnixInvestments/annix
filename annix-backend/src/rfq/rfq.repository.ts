import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { Rfq } from "./entities/rfq.entity";

export interface RfqPaginationParams {
  status?: string | null;
  search?: string | null;
  skip: number;
  take: number;
}

export abstract class RfqRepository extends CrudRepository<Rfq> {
  abstract withTransaction(context: TransactionContext): CrudRepository<Rfq>;
  abstract findBySubmissionId(submissionId: string): Promise<Rfq | null>;
  abstract findAllWithItemsOrdered(): Promise<Rfq[]>;
  abstract findPaginatedWithItems(params: RfqPaginationParams): Promise<[Rfq[], number]>;
  abstract updateById(id: number, changes: DeepPartial<Rfq>): Promise<void>;
  abstract findStatusesByCreator(userId: number): Promise<Rfq[]>;
  abstract findPumpRfqsAssignedToSupplier(supplierId: number, status?: string): Promise<Rfq[]>;
  abstract findUpcomingNonRejected(
    today: Date,
    until: Date,
    limit: number,
    excludedStatuses: string[],
  ): Promise<Rfq[]>;
}
