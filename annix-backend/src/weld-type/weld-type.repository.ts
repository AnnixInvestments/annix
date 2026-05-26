import { CrudRepository } from "../lib/persistence/crud-repository";
import { WeldType } from "./entities/weld-type.entity";

export abstract class WeldTypeRepository extends CrudRepository<WeldType> {
  abstract findByCode(weld_code: string): Promise<WeldType | null>;
}
