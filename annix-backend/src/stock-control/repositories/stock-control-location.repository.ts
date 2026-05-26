import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StockControlLocation } from "../entities/stock-control-location.entity";

export abstract class StockControlLocationRepository extends CrudRepository<StockControlLocation> {
  abstract findActiveForCompanyOrdered(companyId: number): Promise<StockControlLocation[]>;
  abstract findAllForCompanyOrdered(companyId: number): Promise<StockControlLocation[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlLocation | null>;
}
