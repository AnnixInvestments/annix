import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberChemicalCompatibility } from "../entities/rubber-chemical-compatibility.entity";

export abstract class RubberChemicalCompatibilityRepository extends CrudRepository<RubberChemicalCompatibility> {}
