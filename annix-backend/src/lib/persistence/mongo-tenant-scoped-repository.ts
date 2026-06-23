import { Logger } from "@nestjs/common";
import type { ClientSession, Model } from "mongoose";
import type { PaginatedResult } from "../dto/pagination-query.dto";
import type { DeepPartial, FindPageOptions, PersistedEntity } from "./crud-repository";
import { MongoCrudRepository } from "./mongo-crud-repository";
import type { TenantScopedRepository } from "./tenant-scoped-repository";
import { MongoTransactionContext, type TransactionContext } from "./transaction-context";

const TENANT_FULL_LOAD_CAP = 25_000;

export abstract class MongoTenantScopedRepository<Entity extends PersistedEntity>
  extends MongoCrudRepository<Entity>
  implements TenantScopedRepository<Entity>
{
  private readonly fullLoadLogger = new Logger("TenantFullLoad");

  constructor(model: Model<Entity>, session: ClientSession | null = null) {
    super(model, session);
  }

  protected async cappedFullLoad(
    label: string,
    query: Record<string, unknown>,
    options?: { sort?: Record<string, 1 | -1>; allowDiskUse?: boolean; populate?: string[] },
  ): Promise<Entity[]> {
    const cursor = this.documents.find(query);
    if (options?.allowDiskUse) {
      cursor.allowDiskUse(true);
    }
    if (options?.populate) {
      cursor.populate(options.populate);
    }
    if (options?.sort) {
      cursor.sort(options.sort);
    }
    const docs = await cursor.limit(TENANT_FULL_LOAD_CAP).lean().exec();
    if (docs.length === TENANT_FULL_LOAD_CAP) {
      this.fullLoadLogger.warn(
        `${label} hit the ${TENANT_FULL_LOAD_CAP}-row cap for company ${query.companyId ?? "?"}; results truncated — migrate this path to paginated or search-on-type loading`,
      );
    }
    return this.toDomainList(docs);
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
