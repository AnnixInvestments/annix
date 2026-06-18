import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelNotification } from "./entities/notification.entity";

export abstract class AnnixSentinelNotificationRepository extends CrudRepository<AnnixSentinelNotification> {
  abstract findUnreadForUser(userId: number): Promise<AnnixSentinelNotification[]>;
}
