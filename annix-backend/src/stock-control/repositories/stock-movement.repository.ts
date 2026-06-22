import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { MovementType, StockMovement } from "../entities/stock-movement.entity";

export interface MovementListFilters {
  stockItemId?: number;
  movementType?: MovementType;
  startDate?: string;
  endDate?: string;
}

export interface MovementHistoryFilters {
  startDate?: string;
  endDate?: string;
  movementType?: string;
  stockItemId?: number;
}

export abstract class StockMovementRepository extends TenantScopedRepository<StockMovement> {
  abstract withTransaction(context: TransactionContext): StockMovementRepository;
  abstract build(data: DeepPartial<StockMovement>): StockMovement;
  abstract saveForCompany(companyId: number, entity: StockMovement): Promise<StockMovement>;
  abstract removeForCompany(companyId: number, entity: StockMovement): Promise<void>;
  abstract findManyByStockItemForCompany(
    companyId: number,
    stockItemId: number,
  ): Promise<StockMovement[]>;
  abstract findManyByReferenceForCompany(
    companyId: number,
    referenceType: string,
    referenceId: number,
  ): Promise<StockMovement[]>;
  abstract findFilteredForCompany(
    companyId: number,
    filters: MovementListFilters | undefined,
    page: number,
    limit: number,
  ): Promise<StockMovement[]>;
  abstract findByItemForCompany(companyId: number, stockItemId: number): Promise<StockMovement[]>;
  abstract recentActivityForCompany(companyId: number, limit: number): Promise<StockMovement[]>;
  abstract countCreatedSinceForCompany(companyId: number, since: Date): Promise<number>;
  abstract movementHistoryForCompany(
    companyId: number,
    filters: MovementHistoryFilters | undefined,
  ): Promise<StockMovement[]>;
  abstract findForItemSinceExcludingStockTake(
    companyId: number,
    stockItemId: number,
    since: Date,
  ): Promise<StockMovement[]>;
}
