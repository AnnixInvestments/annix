import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ProductDatasheet, type ProductDatasheetType } from "../entities/product-datasheet.entity";

export type DatasheetOwnerField =
  | "paintProductId"
  | "rubberCompoundId"
  | "solutionProductId"
  | "consumableProductId";

export abstract class ProductDatasheetRepository extends CrudRepository<ProductDatasheet> {
  abstract build(data: DeepPartial<ProductDatasheet>): ProductDatasheet;
  abstract findActiveByOwner(
    companyId: number,
    ownerField: DatasheetOwnerField,
    ownerId: number,
  ): Promise<ProductDatasheet[]>;
  abstract findActiveForCompany(
    companyId: number,
    productType: ProductDatasheetType | undefined,
  ): Promise<ProductDatasheet[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<ProductDatasheet | null>;
  abstract findByIdOrFail(id: number): Promise<ProductDatasheet>;
  abstract updateActiveFlagForIds(ids: number[], isActive: boolean): Promise<void>;
  abstract updateById(id: number, patch: DeepPartial<ProductDatasheet>): Promise<void>;
}
