import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationApplication } from "../entities/education-application.entity";

export abstract class EducationApplicationRepository extends CrudRepository<EducationApplication> {
  abstract orderedForProfile(educationProfileId: string): Promise<EducationApplication[]>;
  abstract findByIdForProfile(
    applicationId: string,
    educationProfileId: string,
  ): Promise<EducationApplication | null>;
  abstract deleteByIdForProfile(applicationId: string, educationProfileId: string): Promise<number>;
  abstract countForProfile(educationProfileId: string): Promise<number>;
}
