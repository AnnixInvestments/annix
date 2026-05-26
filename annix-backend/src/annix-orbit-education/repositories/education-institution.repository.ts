import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationInstitution } from "../entities/education-institution.entity";

export abstract class EducationInstitutionRepository extends CrudRepository<EducationInstitution> {
  abstract allOrderedByName(): Promise<EducationInstitution[]>;
}
