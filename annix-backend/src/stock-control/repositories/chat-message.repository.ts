import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ChatMessage } from "../entities/chat-message.entity";

export abstract class ChatMessageRepository extends CrudRepository<ChatMessage> {
  abstract findMessages(
    companyId: number,
    afterId: number | null,
    conversationId: number | null,
    limit: number,
  ): Promise<ChatMessage[]>;
  abstract countUnreadForConversation(
    companyId: number,
    conversationId: number,
    userId: number,
    lastReadAt: Date | null,
  ): Promise<number>;
  abstract countGeneralUnread(companyId: number, lastReadMessageId: number | null): Promise<number>;
}
