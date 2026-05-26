import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";

export abstract class StockControlSupplierRepository extends CrudRepository<StockControlSupplier> {
  abstract build(data: DeepPartial<StockControlSupplier>): StockControlSupplier;
  abstract findAllForCompanyOrderedByName(companyId: number): Promise<StockControlSupplier[]>;
  abstract findAllForCompany(companyId: number): Promise<StockControlSupplier[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlSupplier | null>;
  abstract findOneForCompanyByNameCaseInsensitive(
    companyId: number,
    name: string,
  ): Promise<StockControlSupplier | null>;
}
