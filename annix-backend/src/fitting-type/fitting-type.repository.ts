import { CrudRepository } from "../lib/persistence/crud-repository";
import { FittingType } from "./entities/fitting-type.entity";

export abstract class FittingTypeRepository extends CrudRepository<FittingType> {}
