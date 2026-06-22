import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlUser } from "../entities/stock-control-user.entity";

export abstract class StockControlUserRepository extends TenantScopedRepository<StockControlUser> {
  abstract withTransaction(context: TransactionContext): StockControlUserRepository;
  abstract saveForCompany(companyId: number, entity: StockControlUser): Promise<StockControlUser>;
  abstract removeForCompany(companyId: number, entity: StockControlUser): Promise<void>;
  abstract findOneByEmail(email: string): Promise<StockControlUser | null>;
  abstract findOneByEmailCaseInsensitive(email: string): Promise<StockControlUser | null>;
  abstract findOneByEmailAndCompany(
    email: string,
    companyId: number,
  ): Promise<StockControlUser | null>;
  abstract findOneByEmailVerificationToken(token: string): Promise<StockControlUser | null>;
  abstract findOneByResetToken(token: string): Promise<StockControlUser | null>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlUser | null>;
  abstract findOneForCompanyWithCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlUser | null>;
  abstract findOneByIdWithCompany(id: number): Promise<StockControlUser | null>;
  abstract findForCompanyOrderedByCreated(companyId: number): Promise<StockControlUser[]>;
  abstract findAllForCompany(companyId: number): Promise<StockControlUser[]>;
  abstract countAdminsForCompany(companyId: number): Promise<number>;
  abstract countForCompany(companyId: number): Promise<number>;
  abstract findIdsByIdsForCompany(ids: number[], companyId: number): Promise<StockControlUser[]>;
  abstract findForCompanyByRoles(companyId: number, roles: string[]): Promise<StockControlUser[]>;
  abstract findForCompanyByRolesOrdered(
    companyId: number,
    roles: string[],
  ): Promise<StockControlUser[]>;
  abstract findAllOrderedByEmailWithCompany(): Promise<StockControlUser[]>;
  abstract findAllOrderedById(): Promise<StockControlUser[]>;
}
