import { CrudRepository } from "../lib/persistence/crud-repository";
import { BracketTypeEntity } from "./entities/bracket-type.entity";

export abstract class BracketTypeRepository extends CrudRepository<BracketTypeEntity> {}
