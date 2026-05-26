import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockAllocation } from "../entities/stock-allocation.entity";

export interface CostByJobRow {
  jobCardId: number;
  jobNumber: string;
  jobName: string;
  customerName: string;
  totalCost: number;
  totalItemsAllocated: number;
}

export abstract class StockAllocationRepository extends CrudRepository<StockAllocation> {
  abstract withTransaction(context: TransactionContext): CrudRepository<StockAllocation>;
  abstract findActiveExistingByJobAndStockItem(
    companyId: number,
    jobCardId: number,
    stockItemId: number,
  ): Promise<StockAllocation[]>;
  abstract findPendingForCompany(companyId: number): Promise<StockAllocation[]>;
  abstract findForJobCardWithRelations(
    companyId: number,
    jobCardId: number,
  ): Promise<StockAllocation[]>;
  abstract findForJobCardPaginated(
    companyId: number,
    jobCardId: number,
    page: number,
    limit: number,
  ): Promise<[StockAllocation[], number]>;
  abstract findOnePendingForCompany(id: number, companyId: number): Promise<StockAllocation | null>;
  abstract findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<StockAllocation | null>;
  abstract findOneByJobAndStockItem(
    jobCardId: number,
    stockItemId: number,
  ): Promise<StockAllocation | null>;
  abstract findForJobCardWithStockItem(
    companyId: number,
    jobCardId: number,
  ): Promise<StockAllocation[]>;
  abstract findPendingByIdsForJobCard(
    ids: number[],
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation[]>;
  abstract findActiveByIdForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation | null>;
  abstract findActiveUnissuedByIdForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation | null>;
  abstract saveMany(entities: StockAllocation[]): Promise<StockAllocation[]>;
  abstract costByJob(companyId: number): Promise<CostByJobRow[]>;
}
