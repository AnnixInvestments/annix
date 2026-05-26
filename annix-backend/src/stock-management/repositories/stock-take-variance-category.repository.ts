import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { StockTakeVarianceCategory } from "../entities/stock-take-variance-category.entity";

export abstract class StockTakeVarianceCategoryRepository extends CrudRepository<StockTakeVarianceCategory> {
  abstract build(data: DeepPartial<StockTakeVarianceCategory>): StockTakeVarianceCategory;
  abstract saveMany(categories: StockTakeVarianceCategory[]): Promise<StockTakeVarianceCategory[]>;
  abstract findByIds(ids: number[]): Promise<StockTakeVarianceCategory[]>;
  abstract findById(id: number): Promise<StockTakeVarianceCategory | null>;
  abstract findOneForCompany(
    companyId: number,
    id: number,
  ): Promise<StockTakeVarianceCategory | null>;
  abstract findForCompany(
    companyId: number,
    includeInactive: boolean,
  ): Promise<StockTakeVarianceCategory[]>;
  abstract findOneByCompanySlug(
    companyId: number,
    slug: string,
  ): Promise<StockTakeVarianceCategory | null>;
  abstract findAllForCompany(companyId: number): Promise<StockTakeVarianceCategory[]>;
}
