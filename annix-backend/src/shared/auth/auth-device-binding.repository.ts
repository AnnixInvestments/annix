import { CrudRepository, type PersistedEntity } from "../../lib/persistence/crud-repository";

export abstract class AuthDeviceBindingRepository<
  Entity extends PersistedEntity,
> extends CrudRepository<Entity> {
  abstract findActivePrimary(
    profileIdField: string,
    profileId: number,
    deviceFingerprint: string,
  ): Promise<Entity | null>;
}
