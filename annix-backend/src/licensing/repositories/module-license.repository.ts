import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ModuleLicense } from "../entities/module-license.entity";

export abstract class ModuleLicenseRepository extends CrudRepository<ModuleLicense> {
  abstract findByCompanyAndModule(
    companyId: number,
    moduleKey: string,
  ): Promise<ModuleLicense | null>;
  abstract findByModule(moduleKey: string): Promise<ModuleLicense[]>;
}
