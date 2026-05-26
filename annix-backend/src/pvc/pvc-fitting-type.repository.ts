import { CrudRepository } from "../lib/persistence/crud-repository";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";

export abstract class PvcFittingTypeRepository extends CrudRepository<PvcFittingType> {
  abstract findActive(): Promise<PvcFittingType[]>;
  abstract findByCode(code: string): Promise<PvcFittingType | null>;
}
