import type { DeepPartial, PersistedEntity } from "./crud-repository";
import type { TransactionContext } from "./transaction-context";

export abstract class TenantScopedRepository<Entity extends PersistedEntity> {
  abstract create(data: DeepPartial<Entity>): Promise<Entity>;
  abstract count(criteria?: DeepPartial<Entity>): Promise<number>;
  abstract withTransaction(context: TransactionContext): TenantScopedRepository<Entity>;
}
