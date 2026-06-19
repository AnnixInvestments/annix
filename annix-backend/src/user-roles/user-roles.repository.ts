import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { UserRole } from "./entities/user-role.entity";

export abstract class UserRoleRepository extends CrudRepository<UserRole> {
  abstract withTransaction(context: TransactionContext): CrudRepository<UserRole>;
  abstract findByName(name: string): Promise<UserRole | null>;
}
