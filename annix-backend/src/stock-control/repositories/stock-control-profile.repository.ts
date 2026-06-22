import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlProfile } from "../entities/stock-control-profile.entity";

export abstract class StockControlProfileRepository extends TenantScopedRepository<StockControlProfile> {
  abstract withTransaction(context: TransactionContext): StockControlProfileRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlProfile,
  ): Promise<StockControlProfile>;
  abstract removeForCompany(companyId: number, entity: StockControlProfile): Promise<void>;
  abstract findOneByUserId(userId: number): Promise<StockControlProfile | null>;
  abstract findOneByUserIdWithRelations(
    userId: number,
    relations: string[],
  ): Promise<StockControlProfile | null>;
  abstract findOneOrFailByUserId(userId: number): Promise<StockControlProfile>;
  abstract updateByUserId(userId: number, updates: DeepPartial<StockControlProfile>): Promise<void>;
}
