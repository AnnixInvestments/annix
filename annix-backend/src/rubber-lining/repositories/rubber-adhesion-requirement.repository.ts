import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberAdhesionRequirement } from "../entities/rubber-application.entity";

export abstract class RubberAdhesionRequirementRepository extends CrudRepository<RubberAdhesionRequirement> {
  abstract findByTypeNumberOrdered(typeNumber?: number): Promise<RubberAdhesionRequirement[]>;
}
