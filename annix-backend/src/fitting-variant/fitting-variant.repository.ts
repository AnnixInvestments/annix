import { CrudRepository } from "../lib/persistence/crud-repository";
import { FittingVariant } from "./entities/fitting-variant.entity";

export abstract class FittingVariantRepository extends CrudRepository<FittingVariant> {}
