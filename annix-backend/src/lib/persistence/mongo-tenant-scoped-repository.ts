import type { ClientSession, Model } from "mongoose";
import type { PaginatedResult } from "../dto/pagination-query.dto";
import type { DeepPartial, FindPageOptions, PersistedEntity } from "./crud-repository";
import { MongoCrudRepository } from "./mongo-crud-repository";
import type { TenantScopedRepository } from "./tenant-scoped-repository";
import { MongoTransactionContext, type TransactionContext } from "./transaction-context";

export abstract class MongoTenantScopedRepository<Entity extends PersistedEntity>
  extends MongoCrudRepository<Entity>
  implements TenantScopedRepository<Entity>
{
  constructor(model: Model<Entity>, session: ClientSession | null = null) {
    super(model, session);
  }

  protected pageForCompany(
    companyId: number,
    criteria: DeepPartial<Entity>,
    options?: FindPageOptions<Entity>,
  ): Promise<PaginatedResult<Entity>> {
    return this.findPage({ ...criteria, companyId } as DeepPartial<Entity>, options);
  }

  withTransaction(context: TransactionContext): MongoTenantScopedRepository<Entity> {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoTenantScopedRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected abstract cloneForSession(session: ClientSession): MongoTenantScopedRepository<Entity>;
}
