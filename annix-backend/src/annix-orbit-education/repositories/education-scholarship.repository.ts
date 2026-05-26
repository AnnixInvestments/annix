import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationScholarship } from "../entities/education-scholarship.entity";

export abstract class EducationScholarshipRepository extends CrudRepository<EducationScholarship> {
  abstract activeOrderedByName(limit: number): Promise<EducationScholarship[]>;
  abstract allOrderedByName(): Promise<EducationScholarship[]>;
}
