import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlCompanyRole } from "../entities/stock-control-company-role.entity";

export abstract class StockControlCompanyRoleRepository extends TenantScopedRepository<StockControlCompanyRole> {
  abstract withTransaction(context: TransactionContext): StockControlCompanyRoleRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlCompanyRole,
  ): Promise<StockControlCompanyRole>;
  abstract removeForCompany(companyId: number, entity: StockControlCompanyRole): Promise<void>;
  abstract findForCompanyOrdered(companyId: number): Promise<StockControlCompanyRole[]>;
  abstract findOneForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<StockControlCompanyRole | null>;
  abstract findOneForCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlCompanyRole | null>;
  abstract maxSortOrderForCompany(companyId: number): Promise<number | null>;
  abstract findAllForCompany(companyId: number): Promise<StockControlCompanyRole[]>;
  abstract buildMany(rows: DeepPartial<StockControlCompanyRole>[]): StockControlCompanyRole[];
  abstract saveMany(entities: StockControlCompanyRole[]): Promise<StockControlCompanyRole[]>;
}
