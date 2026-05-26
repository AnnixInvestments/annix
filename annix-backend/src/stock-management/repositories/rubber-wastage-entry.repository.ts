import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberWastageEntry } from "../entities/rubber-wastage-entry.entity";

export abstract class RubberWastageEntryRepository extends CrudRepository<RubberWastageEntry> {
  abstract build(data: DeepPartial<RubberWastageEntry>): RubberWastageEntry;
  abstract withTransaction(context: TransactionContext): RubberWastageEntryRepository;
}
