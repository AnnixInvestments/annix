import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StockControlDepartment } from "../entities/stock-control-department.entity";

export abstract class StockControlDepartmentRepository extends CrudRepository<StockControlDepartment> {
  abstract findActiveForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]>;
  abstract findAllForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlDepartment | null>;
}
