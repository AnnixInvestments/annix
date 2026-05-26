import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationConsent } from "../entities/education-consent.entity";

export abstract class EducationConsentRepository extends CrudRepository<EducationConsent> {
  abstract activeForProfile(educationProfileId: string): Promise<EducationConsent | null>;
  abstract revokeActiveForProfile(educationProfileId: string, revokedAt: Date): Promise<number>;
}
