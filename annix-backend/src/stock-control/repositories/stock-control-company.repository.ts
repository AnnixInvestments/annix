import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { StockControlCompany } from "../entities/stock-control-company.entity";

export abstract class StockControlCompanyRepository extends CrudRepository<StockControlCompany> {
  abstract updateById(id: number, updates: DeepPartial<StockControlCompany>): Promise<void>;
}
