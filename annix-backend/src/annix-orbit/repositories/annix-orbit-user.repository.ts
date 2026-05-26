import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitUser } from "../entities/annix-orbit-user.entity";

export abstract class AnnixOrbitUserRepository extends CrudRepository<AnnixOrbitUser> {
  abstract updatePreferences(id: number, updates: Partial<AnnixOrbitUser>): Promise<void>;
  abstract findAllOrderedById(): Promise<AnnixOrbitUser[]>;
}
