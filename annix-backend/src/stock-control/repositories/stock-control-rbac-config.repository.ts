import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";

export abstract class StockControlRbacConfigRepository extends CrudRepository<StockControlRbacConfig> {
  abstract findForCompany(companyId: number): Promise<StockControlRbacConfig[]>;
}
