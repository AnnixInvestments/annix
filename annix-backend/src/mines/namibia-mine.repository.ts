import { CrudRepository } from "../lib/persistence/crud-repository";
import { NamibiaMine } from "./entities/namibia-mine.entity";

export abstract class NamibiaMineRepository extends CrudRepository<NamibiaMine> {}
