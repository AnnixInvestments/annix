import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelNotificationPreferences } from "./entities/notification-preferences.entity";

export abstract class AnnixSentinelNotificationPreferencesRepository extends CrudRepository<AnnixSentinelNotificationPreferences> {
  abstract findByUserIds(userIds: number[]): Promise<AnnixSentinelNotificationPreferences[]>;
  abstract findOneByUserId(userId: number): Promise<AnnixSentinelNotificationPreferences | null>;
}
