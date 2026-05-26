import { CrudRepository } from "../lib/persistence/crud-repository";
import { MessageReadReceipt } from "./entities/message-read-receipt.entity";

export abstract class MessageReadReceiptRepository extends CrudRepository<MessageReadReceipt> {
  abstract findByMessageIdsAndUser(
    messageIds: number[],
    userId: number,
  ): Promise<MessageReadReceipt[]>;
  abstract deleteByConversationIds(conversationIds: number[]): Promise<void>;
}
