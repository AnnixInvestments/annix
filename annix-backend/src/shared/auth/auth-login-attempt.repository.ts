import { CrudRepository, type PersistedEntity } from "../../lib/persistence/crud-repository";

export abstract class AuthLoginAttemptRepository<
  Entity extends PersistedEntity,
> extends CrudRepository<Entity> {
  abstract countRecentFailures(email: string, since: Date): Promise<number>;
}
