import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ModuleCatalogOverride } from "../entities/module-catalog-override.entity";

export abstract class ModuleCatalogOverrideRepository extends CrudRepository<ModuleCatalogOverride> {
  abstract findByModuleKey(moduleKey: string): Promise<ModuleCatalogOverride | null>;
}
