import {
  CrudRepository,
  type DeepPartial,
  type PersistedEntity,
} from "../../lib/persistence/crud-repository";

export abstract class AuthSessionRepository<
  Entity extends PersistedEntity,
> extends CrudRepository<Entity> {
  abstract findActiveByToken(sessionToken: string, relations?: string[]): Promise<Entity | null>;
  abstract updateActiveByProfile(
    profileIdField: string,
    profileId: number,
    patch: DeepPartial<Entity>,
  ): Promise<void>;
  abstract countActiveSince(currentTime: Date, activitySince: Date): Promise<number>;
}
