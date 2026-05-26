import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeSupportSpacing } from "./entities/pipe-support-spacing.entity";

export abstract class PipeSupportSpacingRepository extends CrudRepository<PipeSupportSpacing> {}
