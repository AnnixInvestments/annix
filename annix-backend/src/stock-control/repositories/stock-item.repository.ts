import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockItem } from "../entities/stock-item.entity";

export interface StockItemListFilters {
  category?: string;
  belowMinStock?: boolean;
  locationId?: string;
}

export interface SohSummaryRow {
  category: string;
  totalQuantity: number;
  totalValue: number;
}

export interface SohByLocationRow {
  location: string;
  totalQuantity: number;
  totalValue: number;
}

export abstract class StockItemRepository extends CrudRepository<StockItem> {
  abstract withTransaction(context: TransactionContext): StockItemRepository;
  abstract build(data: DeepPartial<StockItem>): StockItem;
  abstract buildMany(rows: DeepPartial<StockItem>[]): StockItem[];
  abstract saveMany(entities: StockItem[]): Promise<StockItem[]>;
  abstract updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<StockItem>,
  ): Promise<void>;
  abstract incrementQuantityForCompany(
    id: number,
    companyId: number,
    amount: number,
  ): Promise<boolean>;
  abstract decrementQuantityForCompany(
    id: number,
    companyId: number,
    amount: number,
    enforceNonNegative: boolean,
  ): Promise<boolean>;
  abstract setQuantityForCompany(id: number, companyId: number, value: number): Promise<boolean>;
  abstract setQuantityAndFieldsForCompany(
    id: number,
    companyId: number,
    quantity: number,
    fields: DeepPartial<StockItem>,
  ): Promise<boolean>;
  abstract incrementQuantityAndSetFieldsForCompany(
    id: number,
    companyId: number,
    amount: number,
    fields: DeepPartial<StockItem>,
  ): Promise<boolean>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockItem | null>;
  abstract findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<StockItem | null>;
  abstract findOneBySkuForCompany(sku: string, companyId: number): Promise<StockItem | null>;
  abstract findOneWastageForCompany(
    companyId: number,
    sku: string,
    category: string,
  ): Promise<StockItem | null>;
  abstract findByIdsForCompanyOrderedByName(ids: number[], companyId: number): Promise<StockItem[]>;
  abstract findAllForCompany(companyId: number): Promise<StockItem[]>;
  abstract findAllForCompanyOrderedByName(companyId: number): Promise<StockItem[]>;
  abstract findForCompanySelectMatch(companyId: number): Promise<StockItem[]>;
  abstract findUncategorizedForCompany(companyId: number): Promise<StockItem[]>;
  abstract findRubberCategoryForCompanyOrderedByName(companyId: number): Promise<StockItem[]>;
  abstract findRubberInStockForCompanyOrdered(companyId: number): Promise<StockItem[]>;
  abstract findRubberInStockForCompany(companyId: number): Promise<StockItem[]>;
  abstract findLeftoverForCompany(companyId: number): Promise<StockItem[]>;
  abstract findByTermForCompany(companyId: number, term: string): Promise<StockItem[]>;
  abstract findFilteredForCompany(
    companyId: number,
    filters: StockItemListFilters,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }>;
  abstract searchForCompany(
    companyId: number,
    search: string,
    skip: number,
    limit: number,
    belowMinStock: boolean,
    locationId?: string,
  ): Promise<{ items: StockItem[]; total: number }>;
  abstract searchSummaryForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<StockItem[]>;
  abstract groupedForCompany(
    companyId: number,
    search: string | undefined,
    locationId: number | null,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }>;
  abstract categoriesForCompany(companyId: number): Promise<string[]>;
  abstract totalValueForCompany(companyId: number): Promise<number>;
  abstract lowStockCountForCompany(companyId: number): Promise<number>;
  abstract reorderAlertCountForCompany(companyId: number): Promise<number>;
  abstract reorderAlertsForCompany(companyId: number): Promise<StockItem[]>;
  abstract lowStockForCompany(companyId: number): Promise<StockItem[]>;
  abstract sohSummaryForCompany(companyId: number): Promise<SohSummaryRow[]>;
  abstract sohByLocationForCompany(companyId: number): Promise<SohByLocationRow[]>;
  abstract overAllocationCountForCompany(companyId: number): Promise<number>;
  abstract findOneByQrTokenForCompany(
    companyId: number,
    qrToken: string,
  ): Promise<StockItem | null>;
  abstract mostCommonLocationIdForCategory(
    companyId: number,
    category: string,
  ): Promise<number | null>;
}
