import { CrudRepository } from "../lib/persistence/crud-repository";
import { ZambiaMine } from "./entities/zambia-mine.entity";

export abstract class ZambiaMineRepository extends CrudRepository<ZambiaMine> {}
