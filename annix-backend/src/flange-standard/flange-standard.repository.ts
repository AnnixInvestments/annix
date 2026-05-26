import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangeStandard } from "./entities/flange-standard.entity";

export abstract class FlangeStandardRepository extends CrudRepository<FlangeStandard> {
  abstract findByIds(ids: number[]): Promise<FlangeStandard[]>;
}
