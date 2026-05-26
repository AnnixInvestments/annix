import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationExtractionCorrection } from "../entities/education-extraction-correction.entity";

export abstract class EducationExtractionCorrectionRepository extends CrudRepository<EducationExtractionCorrection> {
  abstract recentForInstitution(
    institutionId: string,
    limit: number,
  ): Promise<EducationExtractionCorrection[]>;
}
