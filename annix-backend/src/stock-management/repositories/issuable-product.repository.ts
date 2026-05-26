import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { IssuableProduct, type IssuableProductType } from "../entities/issuable-product.entity";

export interface IssuableProductWhere {
  companyId: number;
  productType?: IssuableProductType;
  categoryId?: number;
  active?: boolean;
}

export abstract class IssuableProductRepository extends CrudRepository<IssuableProduct> {
  abstract build(data: DeepPartial<IssuableProduct>): IssuableProduct;
  abstract withTransaction(context: TransactionContext): IssuableProductRepository;
  abstract findByIdForCompany(companyId: number, id: number): Promise<IssuableProduct | null>;
  abstract findByIdForCompanyWithDetail(
    companyId: number,
    id: number,
  ): Promise<IssuableProduct | null>;
  abstract findNameSkuForProduct(companyId: number, id: number): Promise<IssuableProduct | null>;
  abstract findPaginatedForCompany(
    where: IssuableProductWhere,
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ items: IssuableProduct[]; total: number }>;
  abstract findBySkuForCompany(companyId: number, sku: string): Promise<IssuableProduct | null>;
  abstract findByNameForCompany(companyId: number, name: string): Promise<IssuableProduct | null>;
  abstract findByLegacyStockItemId(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null>;
  abstract findByLegacyStockItemIdWithPaint(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null>;
  abstract findAllOfTypeWithPaint(
    companyId: number,
    productType: IssuableProductType,
  ): Promise<IssuableProduct[]>;
  abstract countByType(companyId: number): Promise<Record<IssuableProductType, number>>;
  abstract findActiveForCompany(companyId: number): Promise<IssuableProduct[]>;
  abstract findAllForCompany(companyId: number): Promise<IssuableProduct[]>;
  abstract findUnassignedActive(companyId: number): Promise<IssuableProduct[]>;
  abstract searchBySkuLike(
    companyId: number,
    term: string,
    take: number,
  ): Promise<IssuableProduct[]>;
  abstract searchByNameLike(
    companyId: number,
    term: string,
    take: number,
  ): Promise<IssuableProduct[]>;
  abstract updateLocation(companyId: number, productId: number, locationId: number): Promise<void>;
  abstract updateLocationForIds(
    companyId: number,
    productIds: number[],
    locationId: number,
  ): Promise<number>;
  abstract findStockControlLocationByName(
    companyId: number,
    name: string,
  ): Promise<{ id: number; name: string } | null>;
  abstract insertStockControlLocation(
    companyId: number,
    name: string,
    description: string,
  ): Promise<{ id: number; name: string }>;
}
