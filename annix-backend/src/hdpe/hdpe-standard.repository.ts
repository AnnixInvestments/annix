import { CrudRepository } from "../lib/persistence/crud-repository";
import { HdpeStandard } from "./entities/hdpe-standard.entity";

export abstract class HdpeStandardRepository extends CrudRepository<HdpeStandard> {
  abstract findByCode(code: string): Promise<HdpeStandard | null>;
  abstract findActiveOrderedByDisplayOrder(): Promise<HdpeStandard[]>;
}
