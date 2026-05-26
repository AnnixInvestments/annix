import { CrudRepository } from "../lib/persistence/crud-repository";
import { Fitting } from "./entities/fitting.entity";

export abstract class FittingRepository extends CrudRepository<Fitting> {}
