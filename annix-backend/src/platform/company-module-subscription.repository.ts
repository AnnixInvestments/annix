import { CrudRepository } from "../lib/persistence/crud-repository";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";

export abstract class CompanyModuleSubscriptionRepository extends CrudRepository<CompanyModuleSubscription> {
  abstract findByCompanyAndModule(
    companyId: number,
    moduleCode: string,
  ): Promise<CompanyModuleSubscription | null>;
  abstract findActiveByCompany(companyId: number): Promise<CompanyModuleSubscription[]>;
  abstract findAllByCompany(companyId: number): Promise<CompanyModuleSubscription[]>;
}
