import { CrudRepository } from "../lib/persistence/crud-repository";
import { AngleRange } from "./entities/angle-range.entity";

export abstract class AngleRangeRepository extends CrudRepository<AngleRange> {}
