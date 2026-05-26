import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationProfile } from "../entities/education-profile.entity";

export abstract class EducationProfileRepository extends CrudRepository<EducationProfile> {
  abstract findByUserId(userId: number): Promise<EducationProfile | null>;
}
