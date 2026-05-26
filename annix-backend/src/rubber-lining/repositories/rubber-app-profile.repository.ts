import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberAppProfile } from "../entities/rubber-app-profile.entity";

export abstract class RubberAppProfileRepository extends CrudRepository<RubberAppProfile> {
  abstract build(data: Partial<RubberAppProfile>): RubberAppProfile;
  abstract mergeInto(
    existing: RubberAppProfile,
    updates: Partial<RubberAppProfile>,
  ): RubberAppProfile;
}
