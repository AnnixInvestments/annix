import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { CompanyModuleLicense } from "../entities/company-module-license.entity";

export abstract class CompanyModuleLicenseRepository extends CrudRepository<CompanyModuleLicense> {
  abstract build(data: DeepPartial<CompanyModuleLicense>): CompanyModuleLicense;
  abstract findByCompanyModule(
    companyId: number,
    moduleKey: string,
  ): Promise<CompanyModuleLicense | null>;
}
