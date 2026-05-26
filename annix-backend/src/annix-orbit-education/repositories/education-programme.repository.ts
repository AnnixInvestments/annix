import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationProgramme } from "../entities/education-programme.entity";

export abstract class EducationProgrammeRepository extends CrudRepository<EducationProgramme> {
  abstract page(limit: number): Promise<EducationProgramme[]>;
  abstract findByIds(ids: string[]): Promise<EducationProgramme[]>;
  abstract listForInstitution(
    institutionId: string | null,
    limit: number,
  ): Promise<EducationProgramme[]>;
}
