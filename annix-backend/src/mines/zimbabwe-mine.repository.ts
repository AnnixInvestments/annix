import { CrudRepository } from "../lib/persistence/crud-repository";
import { ZimbabweMine } from "./entities/zimbabwe-mine.entity";

export abstract class ZimbabweMineRepository extends CrudRepository<ZimbabweMine> {}
