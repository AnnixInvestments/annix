import { CrudRepository } from "../lib/persistence/crud-repository";
import { PvcStandard } from "./entities/pvc-standard.entity";

export abstract class PvcStandardRepository extends CrudRepository<PvcStandard> {
  abstract findActive(): Promise<PvcStandard[]>;
  abstract findByCode(code: string): Promise<PvcStandard | null>;
}
