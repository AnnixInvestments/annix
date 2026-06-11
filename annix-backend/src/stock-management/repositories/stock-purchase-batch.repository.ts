import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import {
  StockPurchaseBatch,
  type StockPurchaseBatchSourceType,
  type StockPurchaseBatchStatus,
} from "../entities/stock-purchase-batch.entity";

export interface CompanyValuationTotals {
  totalValueR: number;
  legacyValueR: number;
  activeBatchCount: number;
}

export interface ProductValuationTotals {
  totalQuantity: number;
  totalValueR: number;
  legacyQuantity: number;
  legacyValueR: number;
  activeBatchCount: number;
}

export abstract class StockPurchaseBatchRepository extends CrudRepository<StockPurchaseBatch> {
  abstract build(data: DeepPartial<StockPurchaseBatch>): StockPurchaseBatch;
  abstract withTransaction(context: TransactionContext): StockPurchaseBatchRepository;
  abstract findActiveForProductLocked(
    companyId: number,
    productId: number,
  ): Promise<StockPurchaseBatch[]>;
  abstract valuationForProduct(
    companyId: number,
    productId: number,
  ): Promise<ProductValuationTotals>;
  abstract valuationForCompany(companyId: number): Promise<CompanyValuationTotals>;
  abstract findForProduct(
    companyId: number,
    productId: number,
    status: StockPurchaseBatchStatus | undefined,
  ): Promise<StockPurchaseBatch[]>;
  abstract findLegacyForProduct(
    companyId: number,
    productId: number,
  ): Promise<StockPurchaseBatch | null>;
  abstract findBySourceRefs(
    companyId: number,
    sourceType: StockPurchaseBatchSourceType,
    sourceRefIds: number[],
  ): Promise<StockPurchaseBatch[]>;
}
