import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationFaculty } from "../entities/education-faculty.entity";

export abstract class EducationFacultyRepository extends CrudRepository<EducationFaculty> {
  abstract forInstitutionOrderedByName(institutionId: string): Promise<EducationFaculty[]>;
}
