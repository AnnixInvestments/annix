import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationAdmissionDistribution } from "../entities/education-admission-distribution.entity";

export abstract class EducationAdmissionDistributionRepository extends CrudRepository<EducationAdmissionDistribution> {
  abstract forProgrammeOrderedByYear(
    programmeId: string,
  ): Promise<EducationAdmissionDistribution[]>;
}
