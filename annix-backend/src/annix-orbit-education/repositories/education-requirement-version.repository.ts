import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationRequirementVersion } from "../entities/education-requirement-version.entity";

export abstract class EducationRequirementVersionRepository extends CrudRepository<EducationRequirementVersion> {
  abstract latestForProgrammeAndYear(
    programmeId: string,
    intakeYear: number,
  ): Promise<EducationRequirementVersion | null>;
  abstract forProgrammeOrdered(programmeId: string): Promise<EducationRequirementVersion[]>;
}
