import { CrudRepository } from "../lib/persistence/crud-repository";
import { MozambiqueMine } from "./entities/mozambique-mine.entity";

export abstract class MozambiqueMineRepository extends CrudRepository<MozambiqueMine> {}
