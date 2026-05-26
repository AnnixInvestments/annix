import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { IssuanceItemCoatTracking } from "../entities/issuance-item-coat-tracking.entity";

export abstract class IssuanceItemCoatTrackingRepository extends CrudRepository<IssuanceItemCoatTracking> {
  abstract build(data: DeepPartial<IssuanceItemCoatTracking>): IssuanceItemCoatTracking;
  abstract withTransaction(context: TransactionContext): IssuanceItemCoatTrackingRepository;
}
