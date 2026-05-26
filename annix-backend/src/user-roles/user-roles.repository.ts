import { CrudRepository } from "../lib/persistence/crud-repository";
import { UserRole } from "./entities/user-role.entity";

export abstract class UserRoleRepository extends CrudRepository<UserRole> {
  abstract findByName(name: string): Promise<UserRole | null>;
}
