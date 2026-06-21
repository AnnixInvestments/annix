import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import type { CompanyPage, CompanySearchFilters } from "./company.service";
import { Company, CompanyType } from "./entities/company.entity";

export abstract class CompanyRepository extends CrudRepository<Company> {
  abstract withTransaction(context: TransactionContext): CrudRepository<Company>;
  abstract search(filters: CompanySearchFilters): Promise<CompanyPage>;
  abstract companiesWithModule(moduleCode: string): Promise<Company[]>;
  abstract findOnboardingStatusById(id: number): Promise<Company | null>;
  abstract build(data: Partial<Company>): Company;
  abstract findByTypeAndNameLike(
    companyType: CompanyType,
    namePattern: string | null,
    limit: number,
    ownerCompanyId?: number,
  ): Promise<Company[]>;
  abstract findOneByIdAndType(
    id: number,
    companyType: CompanyType,
    ownerCompanyId?: number,
  ): Promise<Company | null>;
  abstract findByIds(ids: number[]): Promise<Company[]>;
  abstract findByRegistrationNumber(registrationNumber: string): Promise<Company | null>;
}
