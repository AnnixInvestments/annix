import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlDepartment } from "../entities/stock-control-department.entity";

export abstract class StockControlDepartmentRepository extends TenantScopedRepository<StockControlDepartment> {
  abstract withTransaction(context: TransactionContext): StockControlDepartmentRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlDepartment,
  ): Promise<StockControlDepartment>;
  abstract removeForCompany(companyId: number, entity: StockControlDepartment): Promise<void>;
  abstract findActiveForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]>;
  abstract findAllForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlDepartment | null>;
}
