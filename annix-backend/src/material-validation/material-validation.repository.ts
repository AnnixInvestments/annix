import { CrudRepository } from "../lib/persistence/crud-repository";
import { MaterialLimit } from "./entities/material-limit.entity";

export abstract class MaterialValidationRepository extends CrudRepository<MaterialLimit> {
  abstract findAllLimits(): Promise<MaterialLimit[]>;
  abstract findBySpecId(steelSpecificationId: number): Promise<MaterialLimit | null>;
}
