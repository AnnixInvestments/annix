import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { RfqItem } from "./entities/rfq-item.entity";

export abstract class RfqItemRepository extends CrudRepository<RfqItem> {
  abstract withTransaction(context: TransactionContext): CrudRepository<RfqItem>;
  abstract countByRfqId(rfqId: number): Promise<number>;
  abstract deleteByRfqId(rfqId: number): Promise<void>;
  abstract findByRfqIdOrderedByLineNumber(rfqId: number): Promise<RfqItem[]>;
  abstract findByRfqIdWithRelationsOrderedByLineNumber(
    rfqId: number,
    relations: string[],
  ): Promise<RfqItem[]>;
}
