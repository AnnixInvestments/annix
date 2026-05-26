import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RepProfile } from "./rep-profile.entity";

export abstract class RepProfileRepository extends CrudRepository<RepProfile> {
  abstract findByUserId(userId: number): Promise<RepProfile | null>;
  abstract findAllWithUserOrderedById(): Promise<RepProfile[]>;
}
