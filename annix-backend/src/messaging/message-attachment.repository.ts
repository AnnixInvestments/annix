import { CrudRepository } from "../lib/persistence/crud-repository";
import { MessageAttachment } from "./entities/message-attachment.entity";

export abstract class MessageAttachmentRepository extends CrudRepository<MessageAttachment> {
  abstract deleteByConversationIds(conversationIds: number[]): Promise<void>;
}
