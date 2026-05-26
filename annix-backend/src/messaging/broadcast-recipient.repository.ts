import { CrudRepository } from "../lib/persistence/crud-repository";
import { BroadcastRecipient } from "./entities/broadcast-recipient.entity";

export abstract class BroadcastRecipientRepository extends CrudRepository<BroadcastRecipient> {
  abstract findByBroadcastAndUser(
    broadcastId: number,
    userId: number,
  ): Promise<BroadcastRecipient | null>;
  abstract findByUser(userId: number): Promise<BroadcastRecipient[]>;
  abstract countUnreadForUser(userId: number): Promise<number>;
  abstract countReadForBroadcast(broadcastId: number): Promise<number>;
  abstract countEmailSentForBroadcast(broadcastId: number): Promise<number>;
  abstract updateEmailSentAt(
    broadcastId: number,
    userIds: number[],
    emailSentAt: Date,
  ): Promise<void>;
}
